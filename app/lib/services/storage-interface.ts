/**
 * ストレージサービスの抽象インターフェース
 * R2とMinIOの両方に対応できるようにする
 */
export interface ImageStorage {
  /**
   * カード画像をアップロード
   * @param cardId カードID
   * @param imageData 画像バイナリデータ
   * @param extension 画像の拡張子（例: "jpg", "png"）
   * @returns アップロードされた画像の公開URL
   */
  uploadImage(cardId: string, imageData: Buffer, extension: string): Promise<string>;

  /**
   * 画像が既に存在するかチェック
   * @param cardId カードID
   * @param extension 画像の拡張子（例: "jpg", "png"）
   * @returns 存在する場合true
   */
  imageExists(cardId: string, extension: string): Promise<boolean>;

  /**
   * 画像の公開URLを取得
   * @param cardId カードID
   * @param extension 画像の拡張子（例: "jpg", "png"）
   * @returns 画像の公開URL
   */
  getImageUrl(cardId: string, extension: string): string;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}
