import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export class R2StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2StorageError";
  }
}

export class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT_URL;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      throw new R2StorageError(
        "Missing R2 configuration. Required: R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL"
      );
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = bucketName;
    this.publicUrl = publicUrl;
  }

  /**
   * カード画像をR2にアップロード
   */
  async uploadImage(cardId: string, imageData: Buffer): Promise<string> {
    const key = `cards/${cardId}.jpg`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: imageData,
          ContentType: "image/jpeg",
        })
      );

      return `${this.publicUrl}/${key}`;
    } catch (error) {
      throw new R2StorageError(`Failed to upload image: ${error}`);
    }
  }

  /**
   * 画像が既に存在するかチェック
   */
  async imageExists(cardId: string): Promise<boolean> {
    const key = `cards/${cardId}.jpg`;

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new R2StorageError(`Failed to check image existence: ${error}`);
    }
  }

  /**
   * 画像の公開URLを取得
   */
  getImageUrl(cardId: string): string {
    return `${this.publicUrl}/cards/${cardId}.jpg`;
  }
}

// シングルトンインスタンス
let r2StorageInstance: R2Storage | null = null;

export function getR2Storage(): R2Storage {
  if (!r2StorageInstance) {
    r2StorageInstance = new R2Storage();
  }
  return r2StorageInstance;
}
