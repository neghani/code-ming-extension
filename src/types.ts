export type SuggestItem = {
  id: string;
  name: string;
  type: string;
  slug: string;
  catalogId: string;
  version: string;
  tags: string[];
  score: number;
  snippet?: string;
};

export type CatalogItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  slug: string;
  catalogId: string;
  catalogVersion: string;
  checksum: string | null;
  deprecated: boolean;
  changelog: string | null;
  tags: string[];
};

export type ManifestEntry = {
  catalogId: string;
  ref: string;
  type: string;
  slug: string;
  tool: string;
  version: string;
  checksum: string | null;
  installedAt: string;
  path: string;
};

export type Manifest = {
  version: string;
  baseUrl: string;
  lastSyncAt?: string;
  installed: ManifestEntry[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export const MANIFEST_VERSION = "1";
export const CODEMINT_DIR = ".codemint";
export const MANIFEST_FILE = ".codemint/manifest.json";
export const SECRET_KEY = "codemint.token";
