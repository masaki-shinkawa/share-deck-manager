# Cloudflare R2 画像URL マイグレーションガイド

## 概要

このガイドでは、既存のカードデータベースレコードの `image_path` を Cloudflare R2 の公開URLに更新する手順を説明します。

## 背景

以前のバージョンでは、カード画像のパスが以下のような形式で保存されていました：
- ローカルファイルシステムパス: `/images/card.jpg`, `C:\images\card.jpg`
- スクレイプ元のURL: `https://onepiece-cardgame.com/images/...`

現在のバージョンでは、すべての画像をCloudflare R2に保存し、以下の形式を使用します：
- R2公開URL: `https://pub-{account-id}.r2.dev/cards/{card-id}.jpg`

## 前提条件

✅ Cloudflare R2バケットが設定済み
✅ `R2_PUBLIC_URL` 環境変数が設定済み
✅ カード画像が既にR2にアップロード済み

## マイグレーション手順

### 1. バックアップ作成（推奨）

```bash
# データベースのバックアップを取得
railway run pg_dump > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. マイグレーションスクリプト実行

#### ドライラン（確認のみ）

```bash
# スクリプトのコードを確認
cat scripts/migrate_image_urls_to_r2.py
```

#### 本番実行

```bash
# Railwayで実行
railway run python scripts/migrate_image_urls_to_r2.py
```

### 3. 結果確認

スクリプトは以下の情報を出力します：
- 更新されたカード数
- スキップされたカード数（既にR2 URL使用中）
- 各カードの変更前後のURL

### 4. 動作確認

```bash
# フロントエンドで画像が正しく表示されるか確認
# /decks または /all-decks ページにアクセス
```

## トラブルシューティング

### 画像が表示されない

**原因1: R2バケットが公開されていない**
```bash
# R2バケット設定を確認
# Cloudflare ダッシュボード > R2 > バケット設定 > Public Access
```

**原因2: 画像がR2にアップロードされていない**
```bash
# Admin ページでカードスクレイピングを実行
# またはCLIで実行:
railway run python -m app.services.card_scraper
```

**原因3: CORSエラー**
```json
// R2バケットのCORS設定
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"]
  }
]
```

### ロールバック

バックアップから復元：
```bash
railway run psql < backup_YYYYMMDD_HHMMSS.sql
```

## 検証

マイグレーション後、以下のテストを実行：

```bash
# ユニットテスト
cd backend
python -m pytest tests/unit/test_image_url_migration.py -v

# すべてのカードがR2 URLを使用しているか確認
railway run python -c "
import asyncio
from sqlmodel import select
from app.db.session import async_session_maker
from app.models.card import Card

async def check():
    async with async_session_maker() as session:
        result = await session.execute(select(Card))
        cards = result.scalars().all()
        r2_count = sum(1 for c in cards if 'r2.dev' in c.image_path)
        print(f'R2 URLs: {r2_count}/{len(cards)} cards')

asyncio.run(check())
"
```

## 自動化（CI/CD）

将来的には、デプロイ時に自動的にマイグレーションを実行できます：

```yaml
# .github/workflows/deploy.yml
- name: Run R2 migration
  run: railway run python scripts/migrate_image_urls_to_r2.py
```

## 注意事項

⚠️ **重要**: このマイグレーションは既存のテストフィクスチャも更新します
⚠️ **バックアップ**: 実行前に必ずデータベースバックアップを取得してください
⚠️ **冪等性**: スクリプトは複数回実行しても安全です（既にR2 URLの場合はスキップ）

## サポート

問題が発生した場合は、以下を確認：
1. `backend/tests/unit/test_image_url_migration.py` のテスト結果
2. `backend/logs/migration.log` （ログ有効化時）
3. Railway ログ: `railway logs`
