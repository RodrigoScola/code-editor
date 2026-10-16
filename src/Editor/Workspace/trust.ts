// Workspace Trust (restricted mode)

export interface WorkspaceTrustOptions {
  // false trusts everything
  enabled?: boolean;
  trustedFolders?: string[];
  emptyWindowTrusted?: boolean;
}

// blocked in an untrusted folder
export type TrustFeature = "tasks" | "debug" | "terminal" | "workspaceSettings.restricted";

export class WorkspaceTrust {
  constructor(options: WorkspaceTrustOptions) {}

  // the folder or one above it is trusted; undefined is an empty window
  isTrusted(folder: string | undefined): boolean {
    throw new Error("not implemented");
  }

  trust(folder: string): void {
    throw new Error("not implemented");
  }

  untrust(folder: string): void {
    throw new Error("not implemented");
  }

  can(feature: TrustFeature | (string & {}), folder: string | undefined): boolean {
    throw new Error("not implemented");
  }

  // workspace settings with the restricted keys removed when untrusted
  filterSettings(
    settings: Record<string, unknown>,
    folder: string | undefined,
    restrictedKeys: string[],
  ): Record<string, unknown> {
    throw new Error("not implemented");
  }
}
