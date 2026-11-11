# Android SDK Installation Script
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:PATH = "$env:JAVA_HOME\bin;$env:LOCALAPPDATA\Android\cmdline-tools\latest\bin;$env:PATH"
$sdkmanager = "$env:LOCALAPPDATA\Android\cmdline-tools\latest\bin\sdkmanager.bat"

Write-Host "========================================"
Write-Host "Android SDK Installation Script"
Write-Host "========================================"
Write-Host ""

# Accept licenses
Write-Host "Step 1/2: Accepting licenses..."
$inputFile = "$env:TEMP\sdk-license-input.txt"
"yyyyyyyyyyyyyyyy" | Out-File $inputFile -Encoding ASCII
$licenseInput = Get-Content $inputFile -Raw
$licenseInput | & $sdkmanager --licenses
Write-Host "Licenses accepted"
Write-Host ""

# Install packages
Write-Host "Step 2/2: Installing SDK components..."
Write-Host "  - platform-tools"
Write-Host "  - platforms;android-34"
Write-Host "  - build-tools;34.0.0"
Write-Host ""

& $sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host ""
Write-Host "========================================"
Write-Host "Installation Complete!"
Write-Host "========================================"
Write-Host ""

# Verify installation
$sdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
$items = @(
    @{Path="platform-tools\adb.exe"; Name="ADB"},
    @{Path="platforms\android-34"; Name="Android 34 Platform"},
    @{Path="build-tools\34.0.0"; Name="Build Tools 34.0.0"}
)

foreach ($item in $items) {
    $fullPath = Join-Path $sdkRoot $item.Path
    if (Test-Path $fullPath) {
        Write-Host "OK: $($item.Name)" -ForegroundColor Green
    } else {
        Write-Host "MISSING: $($item.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "ANDROID_HOME = $sdkRoot"
