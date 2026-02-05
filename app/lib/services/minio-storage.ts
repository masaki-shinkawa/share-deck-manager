import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { ImageStorage, StorageError } from "./storage-interface";

export class MinIOStorageError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = "MinIOStorageError";
  }
}

export class MinIOStorage implements ImageStorage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT_URL || "http://localhost:9000";
    const accessKeyId = process.env.MINIO_ACCESS_KEY_ID || "minioadmin";
    const secretAccessKey = process.env.MINIO_SECRET_ACCESS_KEY || "minioadmin";
    const bucketName = process.env.MINIO_BUCKET_NAME || "card-images";
    const publicUrl = process.env.MINIO_PUBLIC_URL || "http://localhost:9000";

    this.client = new S3Client({
      region: "us-east-1", // MinIOではregionは任意だが必須
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // MinIOではパススタイルを強制
    });

    this.bucketName = bucketName;
    this.publicUrl = publicUrl;

    // 初回起動時にバケットを自動作成
    this.ensureBucketExists();
  }

  /**
   * バケットが存在することを確認、なければ作成
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: ".bucket-check", // ダミーキー
        })
      );
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        // バケットが存在しない場合は作成
        try {
          await this.client.send(
            new CreateBucketCommand({
              Bucket: this.bucketName,
            })
          );
          console.log(`✅ MinIO bucket created: ${this.bucketName}`);

          // バケットを公開読み取り可能に設定
          await this.setPublicReadPolicy();
        } catch (createError) {
          console.warn(`⚠️ Could not create MinIO bucket: ${createError}`);
        }
      }
    }
  }

  /**
   * バケットに公開読み取りポリシーを設定
   */
  private async setPublicReadPolicy(): Promise<void> {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        })
      );
      console.log(`✅ MinIO bucket policy set to public read: ${this.bucketName}`);
    } catch (error) {
      console.warn(`⚠️ Could not set MinIO bucket policy: ${error}`);
    }
  }

  /**
   * カード画像をMinIOにアップロード
   */
  async uploadImage(cardId: string, imageData: Buffer, extension: string): Promise<string> {
    const key = `cards/${cardId}.${extension}`;

    // Content-Typeのマッピング
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const contentType = contentTypeMap[extension.toLowerCase()] || "image/jpeg";

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: imageData,
          ContentType: contentType,
        })
      );

      return `${this.publicUrl}/${this.bucketName}/${key}`;
    } catch (error) {
      throw new MinIOStorageError(`Failed to upload image: ${error}`);
    }
  }

  /**
   * 画像が既に存在するかチェック
   */
  async imageExists(cardId: string, extension: string): Promise<boolean> {
    const key = `cards/${cardId}.${extension}`;

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
      throw new MinIOStorageError(`Failed to check image existence: ${error}`);
    }
  }

  /**
   * 画像の公開URLを取得
   */
  getImageUrl(cardId: string, extension: string): string {
    return `${this.publicUrl}/${this.bucketName}/cards/${cardId}.${extension}`;
  }
}
