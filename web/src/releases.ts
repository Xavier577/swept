export interface Download {
  name: string;
  url: string;
  size: number;
  architecture: "universal" | "arm64" | "intel" | "unknown";
}

export interface Release {
  tag: string;
  publishedAt: string;
  prerelease: boolean;
  notesUrl: string;
  downloads: Download[];
}

export interface ReleaseCatalog {
  latestTag: string | null;
  releases: Release[];
}
