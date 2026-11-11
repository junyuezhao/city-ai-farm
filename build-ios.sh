#!/bin/bash
# 城市AI农场 — iOS 一键构建脚本
# 使用环境：macOS + Xcode 15+
# 使用方法：bash build-ios.sh

set -e

APP_NAME="城市AI农场"
BUNDLE_ID="com.cityaifarm.app"
WEB_DIR="www"

echo "============================================================"
echo "  城市AI农场 — iOS 构建脚本"
echo "============================================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi
echo "✅ Node.js: $(node -v)"

# 检查 Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ 未检测到 Xcode，请先安装 Xcode（App Store 免费下载）"
    exit 1
fi
echo "✅ Xcode 已就绪"

# 安装 Capacitor iOS
echo ""
echo ">>> 步骤 1/5：安装 Capacitor iOS ..."
npm install @capacitor/ios --save

# 添加 iOS 平台（如果尚未添加）
echo ""
echo ">>> 步骤 2/5：添加 iOS 平台 ..."
if [ ! -d "ios" ]; then
    npx cap add ios
else
    echo "  iOS 项目已存在，跳过添加"
fi

# 同步 Web 资源
echo ""
echo ">>> 步骤 3/5：同步 Web 资源到 iOS 项目 ..."
npx cap sync ios

# 打开 Xcode
echo ""
echo ">>> 步骤 4/5：打开 Xcode ..."
echo "  请在 Xcode 中完成以下操作："
echo "  1. 选择你的 Team（Apple Developer 账号）"
echo "  2. 确认 Bundle Identifier: $BUNDLE_ID"
echo "  3. 菜单 Product → Archive"
echo ""
read -p "按回车键打开 Xcode ..."
npx cap open ios

echo ""
echo ">>> 步骤 5/5：Xcode Archive 完成后 ..."
echo "  在 Xcode Organizer 中："
echo "  1. 选择刚生成的 Archive"
echo "  2. 点击 Distribute App"
echo "  3. 选择 Ad Hoc（内测）或 App Store Connect（上架）"
echo "  4. 导出 .ipa 文件"
echo ""
echo "============================================================"
echo "  构建流程完成！"
echo "============================================================"
