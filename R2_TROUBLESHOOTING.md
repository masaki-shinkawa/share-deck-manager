# R2バケットにファイルが見つからない問題のトラブルシューティング

## 状況
- データベースにはR2のURL（`https://pub-933b81f459624dceb8b0a45f14e0a305.r2.dev/cards/*.jpg`）が保存されている
- しかし、R2バケットを確認するとファイルが存在しない
- スクレイピングのエラーログは見つからない

## 確認事項

### 1. R2バケットの設定確認

#### バケット名の確認
```bash
railway variables --service share-deck-manager-backend --environment production | grep R2_BUCKET_NAME
```

**期待値:** `share-deck-manager-card-images`

#### Cloudflare R2ダッシュボードで確認すべき点

1. **バケットの存在確認**
   - https://dash.cloudflare.com/ にログイン
   - 左メニューから「R2」を選択
   - `share-deck-manager-card-images` という名前のバケットが存在するか確認

2. **バケットの公開設定**
   - バケットをクリック
   - 「Settings」タブを開く
   - 「Public Access」セクションを確認
   - **重要:** バケットが公開されている必要があります

   設定方法：
   ```
   Settings > Public Access > Enable Public Access
   または
   Settings > Domain > Custom Domain を設定
   ```

3. **バケット内のファイル確認**
   - 「Objects」タブを開く
   - `cards/` フォルダが存在するか確認
   - フォルダ内に `.jpg` ファイルが存在するか確認

4. **Public URL の確認**
   - Settings > Public URL を確認
   - 環境変数 `R2_PUBLIC_URL` と一致しているか確認
   - 形式: `https://pub-<account-id>.r2.dev`

### 2. アップロード権限の確認

#### APIトークンの権限確認

1. Cloudflare ダッシュボード
2. 「R2」 → 「Manage API Tokens」
3. 使用しているトークンの権限を確認
   - **必要な権限:**
     - ✅ Object Read
     - ✅ Object Write
     - ✅ Object Delete (オプション)

### 3. 手動テスト

#### R2接続テストを実行

Railway上で以下のコマンドを実行して、R2への接続とアップロードをテスト：

```python
# Railway console で実行
import os
import boto3

# 環境変数確認
endpoint = os.getenv("R2_ENDPOINT_URL")
access_key = os.getenv("R2_ACCESS_KEY_ID")
secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
bucket = os.getenv("R2_BUCKET_NAME")

print(f"Endpoint: {endpoint}")
print(f"Bucket: {bucket}")

# S3クライアント作成
s3 = boto3.client(
    "s3",
    endpoint_url=endpoint,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="auto"
)

# バケット一覧取得
try:
    response = s3.list_buckets()
    print("Buckets:", [b['Name'] for b in response['Buckets']])
except Exception as e:
    print(f"Error listing buckets: {e}")

# オブジェクト一覧取得
try:
    response = s3.list_objects_v2(Bucket=bucket, Prefix="cards/")
    if 'Contents' in response:
        print(f"Found {len(response['Contents'])} objects")
        for obj in response['Contents'][:5]:
            print(f"  - {obj['Key']}")
    else:
        print("No objects found in cards/ folder")
except Exception as e:
    print(f"Error listing objects: {e}")

# テストアップロード
try:
    test_key = "cards/TEST-999.jpg"
    test_content = b"test image content"
    s3.put_object(Bucket=bucket, Key=test_key, Body=test_content, ContentType="image/jpeg")
    print(f"✅ Test upload successful: {test_key}")

    # 削除
    s3.delete_object(Bucket=bucket, Key=test_key)
    print(f"✅ Test delete successful")
except Exception as e:
    print(f"❌ Error during test: {e}")
```

### 4. スクレイピングログの詳細確認

```bash
# 直近のスクレイピング実行ログを確認
railway logs --service share-deck-manager-backend --environment production | grep -A 20 -B 5 "scrape"

# R2関連のすべてのログ
railway logs --service share-deck-manager-backend --environment production | grep -i "r2"
```

### 5. 考えられる原因と対処法

#### 原因1: バケットが公開されていない
**症状:** アップロードは成功するが、public URLでアクセスできない

**対処法:**
1. Cloudflare R2 ダッシュボード
2. バケット → Settings → Public Access
3. 「Allow Access」をクリック
4. または Custom Domain を設定

#### 原因2: バケット名の不一致
**症状:** 別のバケットに保存されている

**対処法:**
```bash
# 環境変数のバケット名を確認
railway variables | grep R2_BUCKET_NAME

# Cloudflareダッシュボードで実際のバケット名を確認し、一致させる
railway variables set R2_BUCKET_NAME=share-deck-manager-card-images
```

#### 原因3: エンドポイントURLの間違い
**症状:** 接続エラー

**対処法:**
```bash
# 正しいエンドポイント形式
# https://<account-id>.r2.cloudflarestorage.com

railway variables set R2_ENDPOINT_URL=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
```

#### 原因4: アップロード失敗をログに記録していない
**症状:** エラーが発生しているがログに出ない

**対処法:** ロギングを改善（次のセクション参照）

### 6. ロギング改善

`backend/app/services/card_scraper.py` にロガーを追加：

```python
import logging

logger = logging.getLogger(__name__)

def download_and_upload_image(image_url: str, card_id: str) -> str | None:
    try:
        r2_storage = get_r2_storage()

        if r2_storage.image_exists(card_id):
            logger.info(f"Image already exists in R2: {card_id}")
            return r2_storage.get_image_url(card_id)

        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image_bytes = response.content

        logger.info(f"Uploading {card_id} to R2... ({len(image_bytes)} bytes)")
        r2_url = r2_storage.upload_image(card_id, image_bytes)
        logger.info(f"✅ Upload successful: {card_id} -> {r2_url}")
        return r2_url

    except R2StorageError as e:
        logger.error(f"❌ R2 storage error for {card_id}: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Error downloading/uploading {card_id}: {e}", exc_info=True)
        return None
```

## 次のステップ

1. ✅ Cloudflare R2ダッシュボードでバケットの存在と設定を確認
2. ✅ バケットの公開設定を有効化
3. ✅ 手動テストスクリプトを実行して接続確認
4. ✅ スクレイピングを再実行
5. ✅ R2バケットにファイルが作成されたか確認

## 参考リンク

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 API Tokens](https://developers.cloudflare.com/r2/api/s3/tokens/)
