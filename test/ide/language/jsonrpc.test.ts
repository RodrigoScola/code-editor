import { describe, expect, it } from "vitest";
import {
  MessageReader,
  RpcConnection,
  encodeMessage,
} from "../../../src/Lsp/jsonrpc.js";

// Proposed module src/Lsp/jsonrpc.ts: the wire format that language servers
// (LSP) and debug adapters (DAP) speak over stdin/stdout. Each message is
//   Content-Length: <bytes>\r\n\r\n<JSON>
// where the length counts UTF-8 bytes, not characters.
//
//   encodeMessage(message) -> string
//   new MessageReader().push(chunk) -> the messages completed by this chunk
//   new RpcConnection(write)
//     .request(method, params) -> Promise of the result
//     .notify(method, params)
//     .onNotification(method, handler) / .onRequest(method, handler)
//     .receive(chunk)   feed it what the server writes

const body = (frame: string) => JSON.parse(frame.slice(frame.indexOf("\r\n\r\n") + 4));

describe("encodeMessage", () => {
  it("frames JSON with a Content-Length header", () => {
    const frame = encodeMessage({ a: 1 });

    expect(frame).eq('Content-Length: 7\r\n\r\n{"a":1}');
  });

  it("counts bytes, not characters", () => {
    const frame = encodeMessage({ x: "é" });

    expect(frame.startsWith("Content-Length: 10\r\n\r\n")).eq(true);
  });
});

describe("MessageReader", () => {
  it("reads a whole message", () => {
    const reader = new MessageReader();

    expect(reader.push(encodeMessage({ a: 1 }))).toEqual([{ a: 1 }]);
  });

  it("waits for the rest of a message split across chunks", () => {
    const reader = new MessageReader();
    const frame = encodeMessage({ hello: "world" });

    expect(reader.push(frame.slice(0, 10))).toEqual([]);
    expect(reader.push(frame.slice(10, 25))).toEqual([]);
    expect(reader.push(frame.slice(25))).toEqual([{ hello: "world" }]);
  });

  it("reads two messages from one chunk", () => {
    const reader = new MessageReader();

    expect(reader.push(encodeMessage({ a: 1 }) + encodeMessage({ b: 2 }))).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it("handles a multi-byte character split between chunks", () => {
    const reader = new MessageReader();
    const bytes = new TextEncoder().encode(encodeMessage({ x: "é" }));
    const cut = bytes.length - 3; // in the middle of é

    expect(reader.push(bytes.slice(0, cut))).toEqual([]);
    expect(reader.push(bytes.slice(cut))).toEqual([{ x: "é" }]);
  });

  it("ignores other headers", () => {
    const reader = new MessageReader();
    const frame =
      'Content-Type: application/vscode-jsonrpc; charset=utf-8\r\nContent-Length: 7\r\n\r\n{"a":1}';

    expect(reader.push(frame)).toEqual([{ a: 1 }]);
  });
});

describe("RpcConnection", () => {
  function connect() {
    const written: unknown[] = [];
    const connection = new RpcConnection((frame: string) => written.push(body(frame)));
    return { connection, written };
  }

  it("sends a request with a jsonrpc version, an id and the params", () => {
    const { connection, written } = connect();

    void connection.request("initialize", { rootUri: null });

    expect(written[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "initialize",
      params: { rootUri: null },
    });
    expect(typeof (written[0] as { id: unknown }).id).eq("number");
  });

  it("resolves the request when the response with its id arrives", async () => {
    const { connection, written } = connect();

    const pending = connection.request("shutdown", null);
    const { id } = written[0] as { id: number };
    connection.receive(encodeMessage({ jsonrpc: "2.0", id, result: "done" }));

    await expect(pending).resolves.eq("done");
  });

  it("gives every request a different id", () => {
    const { connection, written } = connect();

    void connection.request("a", null);
    void connection.request("b", null);

    const ids = written.map((m) => (m as { id: number }).id);
    expect(new Set(ids).size).eq(2);
  });

  it("rejects the request when the response is an error", async () => {
    const { connection, written } = connect();

    const pending = connection.request("bad", null);
    const { id } = written[0] as { id: number };
    connection.receive(
      encodeMessage({ jsonrpc: "2.0", id, error: { code: -32600, message: "nope" } }),
    );

    await expect(pending).rejects.toThrow("nope");
  });

  it("sends notifications without an id", () => {
    const { connection, written } = connect();

    connection.notify("initialized", {});

    expect(written[0]).not.toHaveProperty("id");
  });

  it("calls notification handlers", () => {
    const { connection } = connect();
    const seen: unknown[] = [];
    connection.onNotification("textDocument/publishDiagnostics", (params: unknown) =>
      seen.push(params),
    );

    connection.receive(
      encodeMessage({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: { uri: "file:///a.ts", diagnostics: [] },
      }),
    );

    expect(seen).toEqual([{ uri: "file:///a.ts", diagnostics: [] }]);
  });

  it("answers requests from the server", async () => {
    const { connection, written } = connect();
    connection.onRequest("workspace/configuration", () => [{ tabSize: 4 }]);

    connection.receive(
      encodeMessage({ jsonrpc: "2.0", id: 7, method: "workspace/configuration", params: {} }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(written[0]).toMatchObject({ jsonrpc: "2.0", id: 7, result: [{ tabSize: 4 }] });
  });

  it("answers unknown server requests with method not found", async () => {
    const { connection, written } = connect();

    connection.receive(encodeMessage({ jsonrpc: "2.0", id: 8, method: "nope", params: {} }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(written[0]).toMatchObject({ id: 8, error: { code: -32601 } });
  });
});
