import { ImageStorage } from "./storage-interface";
import { R2Storage } from "./r2-storage";
import { MinIOStorage } from "./minio-storage";

type StorageBackend = "r2" | "minio";

/**
 * 環境変数に基づいて適切なストレージサービスを返す
 */
export function getImageStorage(): ImageStorage {
  const backend = (process.env.STORAGE_BACKEND || "r2").toLowerCase() as StorageBackend;

  switch (backend) {
    case "minio":
      console.log("📦 Using MinIO storage backend");
      return new MinIOStorage();
    case "r2":
    default:
      console.log("☁️ Using R2 storage backend");
      return new R2Storage();
  }
}

// シングルトンインスタンス
let storageInstance: ImageStorage | null = null;

export function getStorageInstance(): ImageStorage {
  if (!storageInstance) {
    storageInstance = getImageStorage();
  }
  return storageInstance;
}
