// A git repository on disk: runs git and parses what it prints
import type { BlameLine } from "./blame.js";
import type { LogCommit } from "./log.js";
import type { StashEntry } from "./stash.js";
import type { RepositoryStatus } from "./status.js";
import type { Worktree } from "./worktrees.js";

export interface Branch {
  name: string;
  commit: string;
  // ms
  committerDate: number;
  upstream?: string;
  current: boolean;
}

export interface Tag {
  name: string;
  commit: string;
  annotated: boolean;
  message?: string;
}

export interface CommitOptions {
  amend?: boolean;
  // commit every tracked change without staging
  all?: boolean;
  signoff?: boolean;
  allowEmpty?: boolean;
}

export class Repository {
  constructor(root: string) {}

  status(): Promise<RepositoryStatus> {
    throw new Error("not implemented");
  }

  // staging

  stage(paths: string[]): Promise<void> {
    throw new Error("not implemented");
  }

  unstage(paths: string[]): Promise<void> {
    throw new Error("not implemented");
  }

  stageAll(): Promise<void> {
    throw new Error("not implemented");
  }

  // tracked files go back to the index, untracked files are deleted
  discard(paths: string[]): Promise<void> {
    throw new Error("not implemented");
  }

  // a file at a ref; ":" is the index
  show(ref: string, path: string): Promise<string> {
    throw new Error("not implemented");
  }

  // commits

  // refuses an empty message
  commit(message: string, options: CommitOptions = {}): Promise<void> {
    throw new Error("not implemented");
  }

  // soft reset: the changes stay staged
  undoLastCommit(): Promise<void> {
    throw new Error("not implemented");
  }

  // newest first
  log(options: { maxCount: number; ref?: string }): Promise<LogCommit[]> {
    throw new Error("not implemented");
  }

  cherryPick(hash: string): Promise<void> {
    throw new Error("not implemented");
  }

  blame(path: string, options: { ignoreWhitespace?: boolean } = {}): Promise<BlameLine[]> {
    throw new Error("not implemented");
  }

  // branches

  branches(): Promise<Branch[]> {
    throw new Error("not implemented");
  }

  // undefined on a detached HEAD
  currentBranch(): Promise<string | undefined> {
    throw new Error("not implemented");
  }

  createBranch(name: string, options: { from?: string; checkout?: boolean } = {}): Promise<void> {
    throw new Error("not implemented");
  }

  checkout(ref: string): Promise<void> {
    throw new Error("not implemented");
  }

  // renames the current branch
  renameBranch(newName: string): Promise<void> {
    throw new Error("not implemented");
  }

  // refuses the current branch
  deleteBranch(name: string, options: { force?: boolean } = {}): Promise<void> {
    throw new Error("not implemented");
  }

  merge(branch: string): Promise<void> {
    throw new Error("not implemented");
  }

  abortMerge(): Promise<void> {
    throw new Error("not implemented");
  }

  // stashes

  stash(options: { message?: string; includeUntracked?: boolean; staged?: boolean }): Promise<void> {
    throw new Error("not implemented");
  }

  stashes(): Promise<StashEntry[]> {
    throw new Error("not implemented");
  }

  // keeps the stash
  applyStash(index: number): Promise<void> {
    throw new Error("not implemented");
  }

  // removes the stash, unless it conflicts
  popStash(index: number): Promise<void> {
    throw new Error("not implemented");
  }

  dropStash(index: number): Promise<void> {
    throw new Error("not implemented");
  }

  dropAllStashes(): Promise<void> {
    throw new Error("not implemented");
  }

  // tags and worktrees

  tags(): Promise<Tag[]> {
    throw new Error("not implemented");
  }

  // a message makes an annotated tag
  createTag(name: string, options: { message?: string; ref?: string } = {}): Promise<void> {
    throw new Error("not implemented");
  }

  deleteTag(name: string): Promise<void> {
    throw new Error("not implemented");
  }

  worktrees(): Promise<Worktree[]> {
    throw new Error("not implemented");
  }

  addWorktree(path: string, options: { branch?: string; newBranch?: string }): Promise<void> {
    throw new Error("not implemented");
  }

  // refuses a worktree with changes unless forced
  removeWorktree(path: string, options: { force?: boolean } = {}): Promise<void> {
    throw new Error("not implemented");
  }
}
