// The wire format language servers (LSP) and debug adapters (DAP) speak
// over stdin/stdout: Content-Length: <bytes>\r\n\r\n<JSON>, where the
// length counts UTF-8 bytes

export function encodeMessage(message: unknown): string {
  throw new Error("not implemented");
}

export class MessageReader {
  // the messages completed by this chunk
  push(chunk: string | Uint8Array): unknown[] {
    throw new Error("not implemented");
  }
}

export class RpcConnection {
  constructor(write: (frame: string) => void) {}

  // resolves with the result, rejects with the error's message
  request(method: string, params: unknown): Promise<unknown> {
    throw new Error("not implemented");
  }

  // no id, no answer
  notify(method: string, params: unknown): void {
    throw new Error("not implemented");
  }

  onNotification(method: string, handler: (params: unknown) => void): void {
    throw new Error("not implemented");
  }

  // requests from the server; unknown methods are answered with -32601
  onRequest(method: string, handler: (params: unknown) => unknown): void {
    throw new Error("not implemented");
  }

  // what the server writes
  receive(chunk: string | Uint8Array): void {
    throw new Error("not implemented");
  }
}
