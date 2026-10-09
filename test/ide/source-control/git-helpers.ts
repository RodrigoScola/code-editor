import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "../harness.js";

// Real, throwaway git repositories for the source control specs. Only local
// git commands are used; nothing talks to a remote.

export function hasGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const identity = [
  "-c", "user.name=Test User",
  "-c", "user.email=test@example.com",
  "-c", "init.defaultBranch=main",
  "-c", "core.autocrlf=false",
  "-c", "commit.gpgsign=false",
];

// a repository with `files` committed as the first commit on main
export function repository(files: Record<string, string> = { "a.txt": "one\n" }) {
  const root = workspace(files);
  const git = (...args: string[]) =>
    execFileSync("git", [...identity, ...args], { cwd: root, encoding: "utf8" });

  git("init");
  // set inside the repository too, so the editor's own git calls (which
  // don't pass -c flags) use the same identity and settings
  git("config", "user.name", "Test User");
  git("config", "user.email", "test@example.com");
  git("config", "core.autocrlf", "false");
  git("config", "commit.gpgsign", "false");
  git("add", ".");
  git("commit", "-m", "first");

  const write = (path: string, content: string) => {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  };

  return { root, git, write };
}
