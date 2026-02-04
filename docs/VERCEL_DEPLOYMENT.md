# Vercel デプロイガイド

## 概要

このガイドでは、Share Deck Managerを以下の構成でVercelにデプロイする方法を説明します：
- **フロントエンド**: Next.js（Vercelネイティブサポート）
- **バックエンド**: FastAPI（Vercel Python Serverless Functions）
- **データベース**: Vercel Postgres

## アーキテクチャ

```
Vercel Platform
├── Next.js フロントエンド (frontend/)
├── FastAPI バックエンド (api/index.py → backend/app/)
│   └── Python Serverless Functions
│       └── 実行時間制限 10秒 (Hobby)
│       └── 実行時間制限 60秒 (Pro)
└── Vercel Postgres
```

## デプロイ手順

### 1. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「Add New」→「Project」をクリック
3. GitHubリポジトリをインポート
4. 以下を設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `.`（ルート）
   - **Build Command**: `cd frontend && npm run build`
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
| `DATABASE_URL` | PostgreSQL接続URL | `$POSTGRES_URL`（Vercel Postgresをリンク） |
| `NEXTAUTH_URL` | NextAuth.jsのベースURL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | JWT署名用シークレット | `openssl rand -base64 32`で生成 |
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuthシークレット | `GOCSPX-xxx` |
| `NEXT_PUBLIC_API_URL` | 公開API URL | `https://your-app.vercel.app/api/v1` |
| `ALLOWED_ORIGINS` | CORS許可オリジン | `https://your-app.vercel.app` |

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
3. ブランチを選択し、デフォルトの`upgrade head`で実行

または手動で実行：
```bash
cd backend
DATABASE_URL="your-postgres-url" alembic upgrade head
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
├── api/
│   └── index.py          # Vercel Serverlessエントリーポイント
├── backend/
│   └── app/              # FastAPIアプリケーション
├── frontend/
│   └── ...               # Next.jsアプリケーション
├── vercel.json           # Vercel設定
├── requirements.txt      # Vercel用Python依存関係
└── .github/
    └── workflows/
        └── migrate.yml   # マイグレーションCI/CD
```

## 制限事項

### Vercel Serverless Functions（Hobbyプラン）

| 制限 | 値 |
|------|-----|
| 実行タイムアウト | 10秒 |
| メモリ | 1024 MB |
| ペイロードサイズ | 4.5 MB |
| コールドスタート | 約500ms〜2秒 |

### スクレイピングが時間超過する場合

スクレイピング処理が10秒を超える場合の対処法：

**オプションA: Proプランにアップグレード（$20/月）**
- 実行時間制限が60秒に延長
- コールドスタート時間の改善

**オプションB: バックエンドを分離**
- フロントエンドはVercelに残す
- FastAPIをRender/Fly.ioに移行（無料枠あり）
- `NEXT_PUBLIC_API_URL`を外部バックエンドに向ける

**オプションC: バックグラウンドジョブ**
- Vercel Cron Jobsでスケジュール実行
- 結果をデータベースに保存
- APIはキャッシュ結果を返す

## トラブルシューティング

### Python関数が動作しない

1. `vercel.json`の`functions`設定が正しいか確認
2. `requirements.txt`がルートディレクトリにあるか確認
3. Vercelデプロイログでエラーを確認

### データベース接続の問題

1. `DATABASE_URL`がServerless用のPooling URLを使用しているか確認
2. Vercel Postgresがプロジェクトに接続されているか確認
3. マイグレーションが正常に実行されたか確認

### CORSエラー

1. `ALLOWED_ORIGINS`にVercel URLが含まれているか確認
2. `vercel.json`のheaders設定が正しいか確認
3. ブラウザコンソールで具体的なCORSエラーを確認

### コールドスタートの問題

- 非アクティブ後の最初のリクエストは遅くなる場合があります（1〜2秒）
- レイテンシに敏感なエンドポイントにはVercel Edge Functionsの使用を検討

## モニタリング

### Vercel Dashboard

- **Deployments**: ビルドログとステータスを確認
- **Functions**: Serverless関数の呼び出しを監視
- **Analytics**: トラフィックとパフォーマンス指標を表示

### ログ

```bash
# Vercel Dashboardで関数ログを確認
Project → Logs → 「api/index」でフィルタ
```

## ロールバック

問題が発生した場合：

1. Vercel Dashboard → Deployments
2. 正常に動作していた以前のデプロイを探す
3. 「...」→「Promote to Production」をクリック

## ローカル開発

Vercel設定をローカルでテストする場合：

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
