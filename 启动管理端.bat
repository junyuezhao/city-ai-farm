@echo off
chcp 65001 >nul
echo ============================================
echo   城市AI农场 — 管理控制台启动器
echo ============================================
echo.
echo 正在启动管理端...
echo.

cd /d "%~dp0"
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0electron-main.js" --admin

echo [✓] 管理端已启动
echo.
timeout /t 3 >nul
