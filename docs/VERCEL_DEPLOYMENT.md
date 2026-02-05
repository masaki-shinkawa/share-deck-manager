# Vercel デプロイガイド

## 概要

このガイドでは、Share Deck Managerを以下の構成でVercelにデプロイする方法を説明します：
- **フロントエンド + API**: Next.js（API Routes使用）
- **ORM**: Prisma
- **データベース**: Vercel Postgres

## アーキテクチャ

```
Vercel Platform
└── Next.js アプリケーション (frontend/)
    ├── pages/ - フロントエンド
    ├── app/api/v1/ - API Routes（バックエンド）
    ├── app/lib/prisma.ts - データベース接続
    └── app/lib/services/ - ビジネスロジック
        ├── card-scraper.ts - カードスクレイピング
        └── r2-storage.ts - Cloudflare R2連携
```

## デプロイ手順

### 1. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「Add New」→「Project」をクリック
3. GitHubリポジトリをインポート
4. 以下を設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `.`（ルート）
   - **Build Command**: `cd frontend && npx prisma generate && npm run build`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `cd frontend && npm install`

### 2. Vercel Postgresデータベースの作成

1. Vercel Dashboardで「Storage」に移動
2. 「Create Database」→「Postgres」をクリック
3. データベース名を入力（例：`share-deck-manager-db`）
4. ユーザーに最も近いリージョンを選択
5. プロジェクトに接続

Vercelが自動的に以下の環境変数を追加します：
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. 環境変数の設定

Vercel Dashboard → Project → Settings → Environment Variables で設定：

#### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | PostgreSQL接続URL | `$POSTGRES_PRISMA_URL`（Vercel Postgresをリンク） |
| `DATABASE_URL_UNPOOLED` | 直接接続URL | `$POSTGRES_URL_NON_POOLING` |
| `NEXTAUTH_URL` | NextAuth.jsのベースURL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | JWT署名用シークレット | `openssl rand -base64 32`で生成 |
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuthシークレット | `GOCSPX-xxx` |

#### オプション環境変数（Cloudflare R2）

| 変数名 | 説明 |
|--------|------|
| `R2_ENDPOINT_URL` | R2エンドポイントURL |
| `R2_ACCESS_KEY_ID` | R2アクセスキー |
| `R2_SECRET_ACCESS_KEY` | R2シークレットキー |
| `R2_BUCKET_NAME` | R2バケット名 |
| `R2_PUBLIC_URL` | R2公開URL |

### 4. GitHub Secretsの設定（マイグレーション用）

GitHub → Repository → Settings → Secrets and variables → Actions で設定：

| Secret名 | 説明 |
|----------|------|
| `DATABASE_URL` | Vercelの`POSTGRES_URL_NON_POOLING`と同じ値 |

### 5. 初回マイグレーションの実行

デプロイ後、マイグレーションワークフローを実行：

1. GitHub → Actions → 「Database Migration」に移動
2. 「Run workflow」をクリック
3. ブランチを選択し、デフォルトの`migrate deploy`で実行

または手動で実行：
```bash
cd frontend
DATABASE_URL="your-postgres-url" npx prisma migrate deploy
```

### 6. Google OAuthの更新

[Google Cloud Console](https://console.cloud.google.com/)で：

1. APIs & Services → Credentials に移動
2. OAuth 2.0クライアントを編集
3. 承認済みリダイレクトURIを追加：
   - `https://your-app.vercel.app/api/auth/callback/google`

## ファイル構成

```
share-deck-manager/
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth.js
│   │   │   └── v1/                   # API Routes
│   │   │       ├── users/
│   │   │       ├── decks/
│   │   │       ├── cards/
│   │   │       ├── custom-cards/
│   │   │       ├── stores/
│   │   │       ├── purchases/
│   │   │       ├── allocations/
│   │   │       └── admin/
│   │   └── lib/
│   │       ├── prisma.ts             # Prismaクライアント
│   │       ├── auth.ts               # 認証ヘルパー
│   │       └── services/
│   │           ├── card-scraper.ts   # スクレイピング
│   │           └── r2-storage.ts     # R2ストレージ
│   ├── prisma/
│   │   └── schema.prisma             # Prismaスキーマ
│   └── package.json
├── vercel.json                        # Vercel設定
└── .github/
    └── workflows/
        └── migrate.yml               # マイグレーションCI/CD
```

## API エンドポイント

### ユーザー
- `POST /api/v1/users/sync` - ユーザー同期
- `GET /api/v1/users/me` - 現在のユーザー取得
- `PUT /api/v1/users/me` - ユーザー更新

### デッキ
- `GET /api/v1/decks` - デッキ一覧
- `POST /api/v1/decks` - デッキ作成
- `GET /api/v1/decks/grouped` - グループ化デッキ一覧
- `GET /api/v1/decks/[id]` - デッキ詳細
- `PATCH /api/v1/decks/[id]` - デッキ更新
- `DELETE /api/v1/decks/[id]` - デッキ削除

### カード
- `GET /api/v1/cards` - カード一覧

### カスタムカード
- `GET /api/v1/custom-cards` - カスタムカード一覧
- `POST /api/v1/custom-cards` - カスタムカード作成
- `DELETE /api/v1/custom-cards/[id]` - カスタムカード削除

### ストア
- `GET /api/v1/stores` - ストア一覧
- `POST /api/v1/stores` - ストア作成
- `PATCH /api/v1/stores/[id]` - ストア更新
- `DELETE /api/v1/stores/[id]` - ストア削除

### 購入リスト
- `GET /api/v1/purchases` - 購入リスト一覧
- `POST /api/v1/purchases` - 購入リスト作成
- `GET /api/v1/purchases/[listId]` - 購入リスト詳細
- `PATCH /api/v1/purchases/[listId]` - 購入リスト更新
- `DELETE /api/v1/purchases/[listId]` - 購入リスト削除
- `GET /api/v1/purchases/[listId]/optimal-plan` - 最適購入プラン

### 購入アイテム
- `GET /api/v1/purchases/[listId]/items` - アイテム一覧
- `POST /api/v1/purchases/[listId]/items` - アイテム追加
- `PATCH /api/v1/purchases/[listId]/items/[itemId]` - アイテム更新
- `DELETE /api/v1/purchases/[listId]/items/[itemId]` - アイテム削除

### 価格
- `GET /api/v1/purchases/[listId]/items/[itemId]/prices` - 価格一覧
- `PUT /api/v1/purchases/[listId]/items/[itemId]/prices/[storeId]` - 価格更新
- `DELETE /api/v1/purchases/[listId]/items/[itemId]/prices/[storeId]` - 価格削除

### 割り当て
- `GET /api/v1/purchases/[listId]/items/[itemId]/allocations` - 割り当て一覧
- `POST /api/v1/purchases/[listId]/items/[itemId]/allocations` - 割り当て作成
- `PATCH /api/v1/allocations/[allocationId]` - 割り当て更新
- `DELETE /api/v1/allocations/[allocationId]` - 割り当て削除

### 管理者
- `POST /api/v1/admin/scrape-cards` - カードスクレイピング
- `GET /api/v1/admin/stats` - 統計情報
- `GET /api/v1/admin/check-image-urls` - 画像URL確認
- `POST /api/v1/admin/migrate-image-urls` - 画像URL移行

## トラブルシューティング

### Prismaエラー

1. `prisma generate`が実行されているか確認
2. `DATABASE_URL`が正しく設定されているか確認
3. マイグレーションが正常に実行されたか確認

### データベース接続の問題

1. `DATABASE_URL`がPooling URL（`POSTGRES_PRISMA_URL`）を使用しているか確認
2. Vercel Postgresがプロジェクトに接続されているか確認
3. マイグレーションが正常に実行されたか確認

### 認証エラー

1. `NEXTAUTH_SECRET`が設定されているか確認
2. `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しいか確認
3. Google OAuthのリダイレクトURIが設定されているか確認

## モニタリング

### Vercel Dashboard

- **Deployments**: ビルドログとステータスを確認
- **Functions**: Serverless関数の呼び出しを監視
- **Analytics**: トラフィックとパフォーマンス指標を表示

### ログ

```bash
# Vercel Dashboardで関数ログを確認
Project → Logs
```

## ロールバック

問題が発生した場合：

1. Vercel Dashboard → Deployments
2. 正常に動作していた以前のデプロイを探す
3. 「...」→「Promote to Production」をクリック

## ローカル開発

```bash
cd frontend

# 依存関係インストール
npm install

# Prismaクライアント生成
npx prisma generate

# 開発サーバー起動
npm run dev
```

Vercel CLIを使う場合：
```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトにリンク
vercel link

# 環境変数を取得
vercel env pull .env.local

# Vercelでローカル実行
vercel dev
```
