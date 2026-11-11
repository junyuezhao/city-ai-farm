@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%LOCALAPPDATA%\Android\cmdline-tools\latest\bin;%PATH%

echo.
echo ========================================
echo 正在接受 Android SDK 许可证...
echo ========================================
echo.
echo yyynyynyynyynyyn | sdkmanager --licenses

echo.
echo ========================================
echo 正在安装 Android SDK 组件...
echo ========================================
echo.
call sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo.
echo ========================================
echo 安装完成！
echo ========================================
pause
