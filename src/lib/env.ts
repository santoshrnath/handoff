// Centralised env access. Reads at runtime so values can change between
// deploys without recompiling. Use the helpers below from server code only.

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function required(name: string): string {
  const v = get(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  anthropic: {
    apiKey: () => required("ANTHROPIC_API_KEY"),
    model: () => get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6",
  },
  db: {
    url: () => required("DATABASE_URL"),
  },
  storage: {
    provider: () => (get("STORAGE_PROVIDER") ?? "local") as "s3" | "local",
    s3Endpoint: () => get("S3_ENDPOINT"),
    s3Region: () => get("S3_REGION") ?? "fsn1",
    s3AccessKeyId: () => get("S3_ACCESS_KEY_ID"),
    s3SecretAccessKey: () => get("S3_SECRET_ACCESS_KEY"),
    bucketOriginals: () => get("S3_BUCKET_ORIGINALS") ?? "ch-originals",
    bucketExtracts: () => get("S3_BUCKET_EXTRACTS") ?? "ch-extracts",
    forcePathStyle: () => (get("S3_FORCE_PATH_STYLE") ?? "true") === "true",
  },
  uploads: {
    maxSizeMb: () => Number(get("MAX_UPLOAD_SIZE_MB") ?? "25"),
  },
};
