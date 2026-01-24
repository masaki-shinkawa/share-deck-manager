"""
Cloudflare R2 接続テストスクリプト

環境変数が正しく設定されているか、R2バケットに接続できるかを確認します。
"""

import os
import sys
from pathlib import Path

# プロジェクトルートをPYTHONPATHに追加
sys.path.insert(0, str(Path(__file__).parent))

def test_environment_variables():
    """環境変数の確認"""
    print("=" * 60)
    print("1. 環境変数の確認")
    print("=" * 60)

    required_vars = [
        "R2_ENDPOINT_URL",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "R2_PUBLIC_URL",
    ]

    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # シークレット情報は一部のみ表示
            if "SECRET" in var or "KEY" in var:
                display_value = f"{value[:10]}...{value[-4:]}" if len(value) > 14 else "***"
            else:
                display_value = value
            print(f"[OK] {var}: {display_value}")
        else:
            print(f"[NG] {var}: 未設定")
            missing_vars.append(var)

    if missing_vars:
        print(f"\n[ERROR] 以下の環境変数が設定されていません: {', '.join(missing_vars)}")
        print("\n.env.local ファイルに設定してください:")
        print("または、環境変数をエクスポートしてください:")
        for var in missing_vars:
            print(f"  export {var}=<your-value>")
        return False

    print("\n[OK] すべての環境変数が設定されています")
    return True


def test_r2_connection():
    """R2接続テスト"""
    print("\n" + "=" * 60)
    print("2. R2バケット接続テスト")
    print("=" * 60)

    try:
        from app.services.r2_storage import get_r2_storage, R2StorageError

        print("R2ストレージサービスを初期化中...")
        r2_storage = get_r2_storage()
        print("[OK] R2ストレージサービスの初期化成功")

        # バケット情報の表示
        print(f"\nバケット名: {r2_storage.bucket_name}")
        print(f"エンドポイント: {r2_storage.endpoint_url}")
        print(f"パブリックURL: {r2_storage.public_url}")

        return True

    except R2StorageError as e:
        print(f"[NG] R2ストレージエラー: {e}")
        return False
    except Exception as e:
        print(f"[NG] 予期しないエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_r2_operations():
    """R2操作テスト（テスト画像のアップロード・削除）"""
    print("\n" + "=" * 60)
    print("3. R2操作テスト（アップロード・削除）")
    print("=" * 60)

    try:
        from app.services.r2_storage import get_r2_storage, R2StorageError

        r2_storage = get_r2_storage()
        test_card_id = "TEST-001"
        test_image_data = b"This is a test image content"

        # テスト画像のアップロード
        print(f"\nテスト画像をアップロード中... (Card ID: {test_card_id})")
        url = r2_storage.upload_image(test_card_id, test_image_data)
        print(f"[OK] アップロード成功")
        print(f"   URL: {url}")

        # 画像の存在確認
        print(f"\n画像の存在確認中...")
        exists = r2_storage.image_exists(test_card_id)
        if exists:
            print(f"[OK] 画像が存在します")
        else:
            print(f"[NG] 画像が見つかりません")
            return False

        # 画像の削除
        print(f"\nテスト画像を削除中...")
        r2_storage.delete_image(test_card_id)
        print(f"[OK] 削除成功")

        # 削除後の存在確認
        print(f"\n削除後の存在確認中...")
        exists_after = r2_storage.image_exists(test_card_id)
        if not exists_after:
            print(f"[OK] 画像が正常に削除されました")
        else:
            print(f"[NG] 画像がまだ存在します")
            return False

        return True

    except R2StorageError as e:
        print(f"[NG] R2ストレージエラー: {e}")
        return False
    except Exception as e:
        print(f"[NG] 予期しないエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """メインテスト実行"""
    print("\n" + "=" * 60)
    print("Cloudflare R2 接続テスト")
    print("=" * 60 + "\n")

    # .env.local を読み込み
    try:
        from dotenv import load_dotenv
        env_path = Path(__file__).parent / ".env.local"
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[OK] .env.local を読み込みました: {env_path}\n")
        else:
            print(f"[WARN]  .env.local が見つかりません: {env_path}")
            print("環境変数が直接設定されているか確認します...\n")
    except ImportError:
        print("[WARN]  python-dotenv がインストールされていません")
        print("環境変数が直接設定されているか確認します...\n")

    # テスト実行
    results = []

    # 1. 環境変数チェック
    if test_environment_variables():
        results.append(("環境変数", True))
    else:
        results.append(("環境変数", False))
        print("\n[NG] 環境変数の設定を確認してください。")
        print_results(results)
        return

    # 2. R2接続テスト
    if test_r2_connection():
        results.append(("R2接続", True))
    else:
        results.append(("R2接続", False))
        print("\n[NG] R2接続に失敗しました。環境変数を確認してください。")
        print_results(results)
        return

    # 3. R2操作テスト
    if test_r2_operations():
        results.append(("R2操作", True))
    else:
        results.append(("R2操作", False))

    # 結果表示
    print_results(results)


def print_results(results):
    """テスト結果のサマリー表示"""
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)

    for test_name, passed in results:
        status = "[OK] 成功" if passed else "[NG] 失敗"
        print(f"{test_name}: {status}")

    all_passed = all(passed for _, passed in results)

    print("\n" + "=" * 60)
    if all_passed:
        print("[OK] すべてのテストが成功しました！")
        print("\n次のステップ:")
        print("1. 管理者でログイン")
        print("2. /admin ページに移動")
        print("3. 'Scrape Cards' ボタンをクリック")
        print("4. ダッシュボードで画像が表示されるか確認")
    else:
        print("[NG] 一部のテストが失敗しました。")
        print("\nトラブルシューティング:")
        print("1. backend/CLOUDFLARE_R2_SETUP.md を確認")
        print("2. 環境変数が正しく設定されているか確認")
        print("3. R2バケットが作成されているか確認")
        print("4. APIトークンの権限を確認（Object Read & Write）")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
