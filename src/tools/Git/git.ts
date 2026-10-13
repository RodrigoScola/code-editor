import cp from "child_process";
import fs from "fs";
import { GitEntry } from "./gitEntry.js";
import assert from "assert";

function connectRoot(root: string) {
  const exists = fs.existsSync(root);

  assert(exists, "path does not exists: " + root);

  const stat = fs.statSync(root);

  assert(stat.isDirectory(), `path is not directory`);
}

export function gitStatus(root: string): GitStatus | null {
  try {
    connectRoot(root);
  } catch (err) {
    console.error(`could not connect to root`, err);
    return null;
  }

  const out = cp.execSync(`git status --porcelain=v1 --branch -z `, {
    encoding: "utf-8",
    cwd: root,
  });

  return parseStatus(out, { nul: true });
}

// gitStatus without blocking: git takes tens of milliseconds to answer,
// far longer than a frame. Resolves null outside of a git repository
export function gitStatusAsync(root: string): Promise<GitStatus | null> {
  return new Promise((resolve) => {
    cp.execFile(
      "git",
      ["status", "--porcelain=v1", "--branch", "-z"],
      { encoding: "utf-8", cwd: root },
      (err, out) => resolve(err ? null : parseStatus(out, { nul: true })),
    );
  });
}

// "## main...origin/main [ahead 1, behind 2]",
// " M src/a.ts",
// "?? new.txt",
// "A  added.ts",
// " D gone.ts",
// ' M "with space.txt"',

function validEntry(line: string) {
  return line.includes("##");
}

const NO_COMMIT_LINE = `no commits yet on`;

function isInitialCommit(line: string) {
  if (line.toLowerCase().includes(NO_COMMIT_LINE)) {
    return true;
  }
  return line.toLowerCase().includes(`initial commit on`);
}

function invalidBranchName(line: string) {
  return `## HEAD (no branch)`.includes(line);
}

function parseMetaTags(line: string) {
  const output: GitStatus = {
    ahead: 0,
    behind: 0,
    branch: null,
    gone: false,
    files: [],
    upstream: null,
  };
  if (invalidBranchName(line)) {
    return output;
  }

  output.branch = line.slice(line.indexOf(" ") + 1);

  if (isInitialCommit(line)) {
    output.branch = line.slice(line.indexOf("on ") + "on ".length).trim();

    return output;
  }

  if (output.branch.includes("...")) {
    const rest = output.branch.split("...");
    output.branch = rest[0];

    output.upstream = rest[1].split(" ")[0];
  }

  if (line.includes("ahead")) {
    output.ahead = Number(
      line.slice(
        line.indexOf("ahead") + "ahead".length,
        Math.min(line.indexOf(","), line.indexOf("]")),
      ),
    );
  }
  if (line.includes("behind")) {
    const out = line.slice(
      line.indexOf("behind") + "behind".length,
      line.indexOf("]"),
    );

    output.behind = Number(out);
  }
  if (line.includes("[gone]")) {
    output.gone = true;
  }
  return output;
}

function decodeGitQuotedPath(path: string) {
  const withOctalDecoded = path.replace(/(?:\\[0-7]{1,3})+/g, (octalEscapes) =>
    Buffer.from(
      [...octalEscapes.matchAll(/\\([0-7]{1,3})/g)].map(([, octal]) =>
        Number.parseInt(octal, 8),
      ),
    ).toString("utf8"),
  );
  const withJsonEscapes = withOctalDecoded.replace(
    /\\([abvfr])/g,
    (_, escape: string) =>
      (
        ({
          a: "\\u0007",
          b: "\\b",
          v: "\\u000b",
          f: "\\f",
          r: "\\r",
        }) as Record<string, string>
      )[escape] ?? escape,
  );
  return JSON.parse(`"${withJsonEscapes}"`);
}

export function parseStatus(
  status: string,
  opts?: { nul: boolean },
): GitStatus {
  const output: GitStatus = {
    ahead: 0,
    behind: 0,
    branch: null,
    files: [],
    upstream: null,
    gone: false,
  };

  let delimiter = "\n";

  if (opts && opts.nul) {
    delimiter = "\0";
  }

  const lines: string[] = status
    .replaceAll("\x00", delimiter)
    .split(delimiter)
    .filter(Boolean)
    .map((line) => line.split("\r")[0]);

  const branchLine = lines.at(0);

  if (!branchLine) {
    return output;
  }

  if (validEntry(branchLine)) {
    const meta = parseMetaTags(branchLine);

    output.ahead = meta.ahead;
    output.behind = meta.behind;
    output.branch = meta.branch;
    output.upstream = meta.upstream;
    output.gone = meta.gone;

    lines.shift();
  }

  for (const line of lines) {
    const file = new GitEntry();

    file.worktree = line.slice(1, 2);
    file.index = line.slice(0, 1);

    const entry = line.slice(2);

    file.from = previousFileName(file, entry);

    file.path = currentFileName(file, entry);

    if (file.path.includes('"')) {
      file.path = stripQuotes(file.path);
    }
    if (file.from?.includes('"')) {
      file.from = stripQuotes(file.from);
    }

    if (file.valid()) {
      output.files.push(file);
    }
  }

  return output;
}

function stripQuotes(line: string) {
  if (!line.includes('"')) {
    return line;
  }
  return decodeGitQuotedPath(
    line.slice(line.indexOf('"') + 1, line.lastIndexOf('"')),
  );
}

function previousFileName(file: GitEntry, entry: string) {
  if (file.copied() || file.renamed()) {
    const previous = entry.slice(0, entry.lastIndexOf("->")).trim();

    return previous.length > 0 ? previous : null;
  }

  return null;
}

function currentFileName(file: GitEntry, entry: string) {
  if (file.renamed() || file.copied()) {
    return entry.split("->").at(-1)!.trim();
  }
  return entry.trim();
}

export function isConflict(status: GitEntry): boolean {
  return status.conflict();
}
