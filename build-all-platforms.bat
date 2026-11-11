@echo off
chcp 65001 >nul
echo ============================================================
echo   城市AI农场 — 多平台一键构建脚本
echo ============================================================
echo.
echo   请选择要构建的平台：
echo.
echo   [1] Android APK（调试版）
echo   [2] Android APK（发布签名版）
echo   [3] 同步 Web 资源到所有平台
echo   [4] 启动本地 PWA 服务器（局域网测试）
echo   [5] 全部构建（APK调试 + 同步Web资源）
echo   [0] 退出
echo.
set /p choice=请输入数字 [0-5]:

if "%choice%"=="1" goto build_apk_debug
if "%choice%"=="2" goto build_apk_release
if "%choice%"=="3" goto sync_all
if "%choice%"=="4" goto start_pwa
if "%choice%"=="5" goto build_all
if "%choice%"=="0" goto end
goto invalid

:build_apk_debug
echo.
echo  >>> 正在构建 Android 调试版 APK ...
set JAVA_HOME=C:\Program Files\Java\jdk-21
set ANDROID_HOME=%LOCALAPPDATA%\Android
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
cd /d "%~dp0android"
call gradlew.bat clean assembleDebug
if %ERRORLEVEL%==0 (
    echo.
    echo  ✅ 构建成功！
    for /f "delims=" %%i in ('dir /b /s "app-debug.apk" 2^>nul') do set apk_path=%%i
    echo  输出: %~dp0dist\城市AI农场-v1.0.0-debug.apk
    copy /y "%apk_path%" "%~dp0dist\城市AI农场-v1.0.0-debug.apk" >nul
) else (
    echo.
    echo  ❌ 构建失败，请检查错误信息
)
pause
goto end

:build_apk_release
echo.
echo  >>> 正在构建 Android 发布版 APK ...
echo  >>> 注意：发布版需要先配置签名密钥
set JAVA_HOME=C:\Program Files\Java\jdk-21
set ANDROID_HOME=%LOCALAPPDATA%\Android
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
cd /d "%~dp0android"
call gradlew.bat clean assembleRelease
if %ERRORLEVEL%==0 (
    echo.
    echo  ✅ 构建成功！
    for /f "delims=" %%i in ('dir /b /s "app-release-unsigned.apk" 2^>nul') do set apk_path=%%i
    echo  输出: %apk_path%
    echo  注意：发布版 APK 需要签名后才能上架应用商店
) else (
    echo.
    echo  ❌ 构建失败，请检查错误信息
)
pause
goto end

:sync_all
echo.
echo  >>> 正在同步 Web 资源到所有平台 ...
cd /d "%~dp0"
echo  - 同步到 Android ...
call npx cap sync android
echo  - 同步到 www 目录 ...
copy /y "index.html" "www\index.html" >nul
copy /y "admin-console.html" "www\admin-console.html" >nul
copy /y "manifest.json" "www\manifest.json" >nul
copy /y "sw.js" "www\sw.js" >nul
echo.
echo  ✅ 同步完成！
pause
goto end

:start_pwa
echo.
echo  >>> 启动 PWA 本地服务器 ...
echo  >>> 手机和电脑连同一 WiFi 后，手机访问 http://%COMPUTERNAME%:8888
cd /d "%~dp0"
python -m http.server 8888
pause
goto end

:build_all
echo.
echo  >>> 执行全部构建流程 ...
call :sync_all
call :build_apk_debug
echo.
echo  ============================================================
echo   全部构建完成！
echo  ============================================================
echo.
echo  产出文件：
echo  - APK: dist\城市AI农场-v1.0.0-debug.apk
echo  - PWA: 运行 [4] 启动本地服务器，或将 www/ 部署到 HTTPS
echo.
echo  iOS / 鸿蒙 / 小程序 请参考《多平台手机APP部署指南.md》
echo.
pause
goto end

:invalid
echo.
echo  无效选择，请输入 0-5
pause
goto end

:end
echo.
echo  感谢使用城市AI农场构建工具！
