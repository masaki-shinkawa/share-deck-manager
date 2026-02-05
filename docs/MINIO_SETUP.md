# MinIO ローカルストレージセットアップ

## 概要

ローカル開発環境では、Cloudflare R2の代わりにMinIOを使用してカード画像を保存できます。MinIOはS3互換のオブジェクトストレージで、ローカルで動作します。

## セットアップ手順

### 1. MinIOコンテナの起動

```bash
docker compose up -d minio
```

### 2. 環境変数の設定

`.env.local`に以下の環境変数を追加：

```bash
# ストレージバックエンドをMinIOに設定
STORAGE_BACKEND=minio

# MinIO設定（デフォルト値）
MINIO_ENDPOINT_URL=http://localhost:9000
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
MINIO_BUCKET_NAME=card-images
MINIO_PUBLIC_URL=http://localhost:9000
```

### 3. MinIO Webコンソールへのアクセス

MinIOが起動したら、以下のURLでWebコンソールにアクセスできます：

- URL: http://localhost:9001
- ユーザー名: `minioadmin`
- パスワード: `minioadmin`

### 4. バケットの自動作成

アプリケーション初回起動時に、`card-images`バケットが自動的に作成されます。

### 5. カードスクレイピングの実行

スクレイピングを実行すると、画像が自動的にMinIOにダウンロードされます：

```bash
npm run dev
```

ブラウザで http://localhost:3000/admin にアクセスし、「Scrape Cards」ボタンをクリック。

### 6. 画像の確認

MinIO Webコンソールで、`card-images`バケット内の`cards/`フォルダに画像が保存されていることを確認できます。

## 本番環境（Cloudflare R2）への切り替え

本番環境ではCloudflare R2を使用します。

`.env.production`または本番環境の環境変数を設定：

```bash
STORAGE_BACKEND=r2
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET_NAME=share-deck-manager-card-images
R2_PUBLIC_URL=https://<your-r2-public-domain>
```

## トラブルシューティング

### MinIOに接続できない

```bash
# MinIOコンテナのステータス確認
docker compose ps minio

# ログ確認
docker compose logs minio
```

### バケットが作成されない

MinIO Webコンソールで手動作成：

1. http://localhost:9001 にアクセス
2. 左メニューから「Buckets」を選択
3. 「Create Bucket」をクリック
4. バケット名: `card-images`

### 画像URLがR2になる

`.env.local`の`STORAGE_BACKEND`を確認：

```bash
# MinIOを使う場合
STORAGE_BACKEND=minio

# R2を使う場合
STORAGE_BACKEND=r2
```

アプリケーションを再起動してください。

## ストレージアーキテクチャ

```
┌─────────────────────────────────────┐
│   Card Scraper                      │
│   (app/lib/services/card-scraper.ts)│
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│   Storage Factory                    │
│   (storage-factory.ts)              │
│   STORAGE_BACKEND env variable      │
└─────────┬───────────────┬───────────┘
          │               │
    minio │               │ r2
          ↓               ↓
┌──────────────┐  ┌──────────────┐
│ MinIO Storage│  │ R2 Storage   │
│ (local dev)  │  │ (production) │
└──────────────┘  └──────────────┘
```

## 参考

- MinIO公式ドキュメント: https://min.io/docs/minio/linux/index.html
- Cloudflare R2ドキュメント: https://developers.cloudflare.com/r2/
