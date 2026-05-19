import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { BucketName, PutOptions, PutResult, StorageService } from "./index";

function bucket(b: BucketName) {
  return b === "originals" ? env.storage.bucketOriginals() : env.storage.bucketExtracts();
}

export class S3Storage implements StorageService {
  private client: S3Client;

  constructor() {
    const endpoint = env.storage.s3Endpoint();
    const region = env.storage.s3Region();
    const accessKeyId = env.storage.s3AccessKeyId();
    const secretAccessKey = env.storage.s3SecretAccessKey();
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage selected but S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing.",
      );
    }
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: env.storage.forcePathStyle(),
    });
  }

  async put(opts: PutOptions): Promise<PutResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket(opts.bucket),
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
      }),
    );
    return { key: opts.key, bucket: opts.bucket, size: opts.body.length };
  }

  async get(key: string, b: BucketName): Promise<Buffer> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: bucket(b), Key: key }),
    );
    const chunks: Buffer[] = [];
    // @ts-expect-error — Body is a Node readable stream
    for await (const chunk of out.Body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async signedUrl(key: string, b: BucketName, expiresSeconds = 600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket(b), Key: key }),
      { expiresIn: expiresSeconds },
    );
  }

  async delete(key: string, b: BucketName): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket(b), Key: key }),
    );
  }
}
