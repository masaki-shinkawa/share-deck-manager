---
description: Chromeをリモートデバッグモードで起動
---
# Chrome DevTools リモートデバッグモードで起動

MCP chrome-devtoolsサーバーを使用するために、Chromeをリモートデバッグモードで起動する必要があります。

## 前提条件
- Google Chromeがインストールされている
- MCPのchrome-devtoolsサーバーが設定されている (`.mcp/mcp.json`)

## 起動手順

### 1. 既存のChromeプロセスを終了
すべてのChromeウィンドウを閉じるか、以下のコマンドで強制終了:
```powershell
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
```

### 2. Chromeをリモートデバッグモードで起動
// turbo
```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222","--user-data-dir=C:\tmp\chrome-debug"
```

または、プロジェクトのバッチスクリプトを使用:
// turbo
```powershell
.\scripts\start-chrome-debug.bat
```

### 3. 接続確認
ブラウザまたはPowerShellで以下のURLにアクセスし、JSON応答が返ることを確認:
```
http://localhost:9222/json/version
```

PowerShellで確認:
// turbo
```powershell
Invoke-WebRequest -Uri "http://localhost:9222/json/version" | Select-Object -ExpandProperty Content
```

## 注意事項

> [!IMPORTANT]
> このモードで起動すると、通常のChromeプロファイルとは**別のデバッグ用プロファイル**（`C:\tmp\chrome-debug`）が使用されます。
> - ブックマーク、閲覧履歴、拡張機能などは通常のプロファイルと別管理
> - 既存のブラウジングセッションには影響しません

> [!TIP]
> 開発中は、このデバッグモードのChromeと通常のChromeを同時に起動して使い分けることができます。

## トラブルシューティング

### ポート9222が既に使用されている
別のChromeインスタンスが起動している可能性があります。手順1で全プロセスを終了してください。

### Chromeのパスが見つからない
Chromeが別の場所にインストールされている場合、起動コマンドのパスを調整してください:
```powershell
# 64bit版の別パス例
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
```
