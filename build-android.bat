@echo off
chcp 65001 >nul
echo ============================================
echo   城市AI农场 — Android APK 打包脚本
echo ============================================
echo.

REM 检查 Node.js
node -v >nul 2>&1 || goto :error
echo [✓] Node.js 已就绪

REM 安装 Capacitor
echo.
echo [1/5] 正在安装 Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android --save 2>nul
if errorlevel 1 goto :error
echo [✓] Capacitor 安装完成

REM 初始化
echo.
echo [2/5] 初始化 Capacitor...
call npx cap init "城市AI农场" com.cityaifarm.app --web-dir "." 2>nul
echo [✓] 初始化完成

REM 添加 Android 平台
echo.
echo [3/5] 添加 Android 平台...
if not exist "android" (
    call npx cap add android
) else (
    echo    平台已存在，跳过
)
echo [✓] Android 平台就绪

REM 同步资源
echo.
echo [4/5] 同步 Web 资源到 Android 项目...
call npx cap sync android
echo [✓] 资源同步完成

echo.
echo ============================================
echo   打包完成！
echo ============================================
echo.
echo 下一步：
echo   1. 打开 Android Studio
echo   2. 打开项目：%cd%\android
echo   3. 点击菜单 Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo   4. APK 输出位置：android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
exit /b 0

:error
echo.
echo [✗] 发生错误，请检查上述输出
pause
exit /b 1
