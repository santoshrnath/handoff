// Storage abstraction. Two backends:
//   - "local" : ./storage-local (dev only)
//   - "s3"    : Hetzner Storage Box / any S3-compatible endpoint

import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageService {
  put(opts: PutOptions): Promise<PutResult>;
  get(key: string, bucket: BucketName): Promise<Buffer>;
  signedUrl(key: string, bucket: BucketName, expiresSeconds?: number): Promise<string>;
  delete(key: string, bucket: BucketName): Promise<void>;
}

export type BucketName = "originals" | "extracts";

export interface PutOptions {
  bucket: BucketName;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface PutResult {
  key: string;
  bucket: BucketName;
  size: number;
}

let _storage: StorageService | null = null;

export function getStorage(): StorageService {
  if (_storage) return _storage;
  const provider = env.storage.provider();
  if (provider === "s3") {
    _storage = new S3Storage();
  } else {
    _storage = new LocalStorage();
  }
  return _storage;
}

export function artifactKey(opts: {
  tenantId: string;
  contextId: string;
  artifactId: string;
  fileName: string;
}) {
  return `ch-originals/${opts.tenantId}/${opts.contextId}/${opts.artifactId}/${opts.fileName}`;
}

export function extractKey(opts: {
  tenantId: string;
  contextId: string;
  artifactId: string;
}) {
  return `ch-extracts/${opts.tenantId}/${opts.contextId}/${opts.artifactId}/text.txt`;
}
