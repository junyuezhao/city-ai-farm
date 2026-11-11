@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%LOCALAPPDATA%\Android\cmdline-tools\latest\bin;%PATH%
set SDKMANAGER=%LOCALAPPDATA%\Android\cmdline-tools\latest\bin\sdkmanager.bat

echo.
echo ========================================
echo Android SDK Installation
echo ========================================
echo.

echo Step 1: Accepting all licenses...
:: Create a temporary file with multiple 'y' responses
set INPUT_FILE=%TEMP%\sdk_responses.txt
>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y
>>%INPUT_FILE% echo y

:: Accept licenses
cmd /c "%SDKMANAGER% --licenses < %INPUT_FILE%"

echo.
echo Step 2: Installing SDK components...
echo   - platform-tools
echo   - platforms;android-34
echo   - build-tools;34.0.0
echo.

cmd /c "%SDKMANAGER% platform-tools platforms;android-34 build-tools;34.0.0"

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.

:: Verify installation
set SDK_ROOT=%LOCALAPPDATA%\Android\Sdk
echo Verifying installation...
if exist "%SDK_ROOT%\platform-tools\adb.exe" (
    echo [OK] ADB installed
) else (
    echo [FAIL] ADB not found
)

if exist "%SDK_ROOT%\platforms\android-34" (
    echo [OK] Android 34 Platform installed
) else (
    echo [FAIL] Android 34 Platform not found
)

if exist "%SDK_ROOT%\build-tools\34.0.0" (
    echo [OK] Build Tools 34.0.0 installed
) else (
    echo [FAIL] Build Tools 34.0.0 not found
)

echo.
pause
