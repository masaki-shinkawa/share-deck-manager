# Cloudflare R2 セットアップガイド

## 1. R2バケットの作成

1. Cloudflare ダッシュボードにログイン: https://dash.cloudflare.com/
2. サイドバーの **R2 Object Storage** に移動
3. **Create bucket** をクリック
4. バケットの設定:
   - **Bucket name**: `share-deck-manager-card-images` (グローバルで一意である必要があります)
   - **Location**: Auto (または特定のリージョンを選択)
5. **Create bucket** をクリック

## 2. APIトークンの生成

1. R2ダッシュボードで **Manage R2 API Tokens** をクリック
2. **Create API Token** をクリック
3. トークンの設定:
   - **Token name**: `share-deck-manager-r2-access`
   - **Permissions**: Object Read & Write
   - **Bucket**: `share-deck-manager-card-images` (特定のバケット)
   - **TTL**: Never expire (または必要に応じて有効期限を設定)
4. **Create API Token** をクリック
5. **重要**: 以下の値をすぐにコピーしてください（一度しか表示されません）:
   - **Access Key ID**: `<your-access-key-id>`
   - **Secret Access Key**: `<your-secret-access-key>`
   - **Endpoint URL**: `https://<account-id>.r2.cloudflarestorage.com`

## 3. 環境変数の設定

Railwayバックエンドサービスの環境変数に以下を追加:

```bash
# Cloudflare R2
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=share-deck-manager-card-images
R2_PUBLIC_URL=https://pub-<random-id>.r2.dev  # パブリックURL（オプション、ステップ4参照）
```

`.env.example` に追加:
```bash
# Cloudflare R2 Configuration
R2_ENDPOINT_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=share-deck-manager-card-images
R2_PUBLIC_URL=
```

ローカルの `.env.local` に追加:
```bash
# Cloudflareダッシュボードから値をコピー
R2_ENDPOINT_URL=https://<your-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=share-deck-manager-card-images
R2_PUBLIC_URL=https://pub-<random-id>.r2.dev
```

## 4. パブリックアクセスの有効化（オプション）

画像の直接パブリックURLが必要な場合:

1. バケット設定の **Settings** タブをクリック
2. **Public access** までスクロール
3. **Allow Access** をクリック
4. **Public R2.dev subdomain** をコピー: `https://pub-<random-id>.r2.dev`
5. これを `R2_PUBLIC_URL` として使用

**代替方法**: カスタムドメインを使用
1. **Connect Domain** をクリック
2. カスタムドメインを追加（例: `images.yourdomain.com`）
3. 指示に従ってDNSレコードを更新
4. カスタムドメインを `R2_PUBLIC_URL` として使用

## 5. セットアップの確認

Pythonで接続をテスト:

```python
import boto3
import os

s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name="auto",
)

# バケット一覧を取得
response = s3_client.list_buckets()
print("Buckets:", [bucket["Name"] for bucket in response["Buckets"]])
```

## 6. CORS設定（フロントエンドからアクセスする場合）

フロントエンドから画像に直接アクセスする必要がある場合:

1. バケット設定の **Settings** タブをクリック
2. **CORS policy** までスクロール
3. CORSルールを追加:

```json
[
  {
    "AllowedOrigins": [
      "https://your-frontend-domain.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## セキュリティベストプラクティス

- ✅ 開発環境と本番環境で別々のAPIトークンを使用
- ✅ トークンのアクセス権限を特定のバケットに制限
- ✅ トークンを定期的にローテーション
- ✅ トークンをGitにコミットしない（.env.localを使用）
- ✅ 本番環境はRailway環境変数を使用
- ✅ 必要な場合のみパブリックアクセスを有効化
- ✅ プライベートコンテンツには署名付きURLの使用を検討

## コスト

Cloudflare R2 料金:
- **ストレージ**: $0.015/GB/月
- **Class A操作** (書き込み、リスト): $4.50/100万回
- **Class B操作** (読み取り): $0.36/100万回
- **無料枠**: ストレージ10GB、Class A 100万回、Class B 1000万回/月

このプロジェクト（カード画像）の場合:
- 推定ストレージ: ~500 MB (5000枚のカード × 100 KB)
- コスト: ~$0.01/月（無料枠内に十分収まります）
