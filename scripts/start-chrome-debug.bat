@echo off
REM Chrome DevTools リモートデバッグモード起動スクリプト
REM MCP chrome-devtoolsサーバーと接続するために使用

echo Chromeをリモートデバッグモードで起動中...
echo.

REM 既存のChromeプロセスを終了
echo [1/3] 既存のChromeプロセスを終了中...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM デバッグ用のユーザーデータディレクトリを作成
echo [2/3] デバッグ用プロファイルディレクトリを作成中...
if not exist "C:\tmp\chrome-debug" mkdir "C:\tmp\chrome-debug"

REM Chromeをリモートデバッグモードで起動
echo [3/3] Chromeを起動中...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\chrome-debug"

echo.
echo ✓ Chromeがリモートデバッグモードで起動しました
echo.
echo 接続確認: http://localhost:9222/json/version
echo.
echo [!] 注意: このChromeは通常のプロファイルとは別のデバッグ用プロファイルを使用します
echo.

timeout /t 3 /nobreak >nul
