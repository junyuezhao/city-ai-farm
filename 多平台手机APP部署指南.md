# 城市AI农场 — 多平台手机 APP 部署指南

> 生成时间：2026-11-10  
> 项目路径：`d:\Documents\city-ai-farm\`  
> 核心技术栈：HTML5 + CSS3 + JavaScript（PWA）+ Capacitor（原生封装）

---

## 一、各平台总览

| 平台 | 文件格式 | 文件大小 | 生成工具 | 是否需要Mac | 分发方式 |
|------|---------|---------|---------|------------|---------|
| **Android** | APK | ~4 MB | Capacitor + Gradle | ❌ 不需要 | 直接安装 / Google Play |
| **iOS** | IPA | ~3 MB | Capacitor + Xcode | ✅ 必须 | App Store / TestFlight |
| **鸿蒙 HarmonyOS** | HAP | ~3 MB | DevEco Studio | ❌ 不需要 | 华为应用市场 |
| **微信小程序** | 小程序包 | ~1 MB | 微信开发者工具 | ❌ 不需要 | 微信审核发布 |
| **PWA（全浏览器）** | HTTPS网站 | ~500 KB | 任意Web服务器 | ❌ 不需要 | 网址 / 二维码 |

> **核心策略**：同一套 Web 代码（`www/` 目录）通过不同工具链打包到 5 个平台。

---

## 二、Android（APK）— ✅ 已就绪

### 现状
- APK 已编译成功：`d:\Documents\city-ai-farm\dist\城市AI农场-v1.0.0-debug.apk`（4.2 MB）
- 开发环境已全部配置：JDK 21 + Android SDK 36 + Gradle 8.14.3

### 重新编译（修改代码后）
```cmd
cd d:\Documents\city-ai-farm\android
gradlew.bat clean assembleDebug
```
输出：`android\app\build\outputs\apk\debug\app-debug.apk`

### 生成签名发布版（上架用）
1. 用 Android Studio 打开 `d:\Documents\city-ai-farm\android`
2. **Build** → **Generate Signed Bundle / APK**
3. 创建密钥库（.jks），选择 `release` 构建类型
4. 输出 `app-release.apk`（可上传 Google Play / 华为应用市场）

---

## 三、iOS（IPA）— 需要 Mac 环境

### 前置要求
- Mac 电脑（Windows 无法编译 iOS）
- Xcode 15+（App Store 免费安装）
- Apple Developer 账号（$99/年，用于签名和上架）

### 操作步骤

**第一步：把项目复制到 Mac**

将 `d:\Documents\city-ai-farm\` 整个文件夹复制到 Mac 上（U盘 / 局域网 / 云盘均可）。

**第二步：在 Mac 上安装依赖并添加 iOS 平台**

```bash
cd /path/to/city-ai-farm

# 安装 Capacitor iOS 插件
npm install @capacitor/ios --save

# 添加 iOS 平台
npx cap add ios

# 同步 Web 资源到 Xcode 项目
npx cap sync ios
```

**第三步：用 Xcode 打开并签名**

```bash
npx cap open ios
```

Xcode 打开后：
1. 左侧选择项目根目录 → **Signing & Capabilities**
2. 选择你的 **Team**（Apple Developer 账号）
3. Bundle Identifier 保持 `com.cityaifarm.app`
4. 在 **Info.plist** 中添加权限描述：

```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机以使用AI农作物识别功能</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册以选择照片进行AI识别</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要获取位置信息以推荐附近农场</string>
<key>UIRequiresFullScreen</key>
<true/>
```

**第四步：Archive 并导出 IPA**

1. 顶部选择目标设备：**Any iOS Device (arm64)**
2. 菜单 **Product** → **Archive**（约 5-10 分钟）
3. 在 Organizer 中点击 **Distribute App**
4. 选择 **Ad Hoc**（内测分发）或 **App Store Connect**（上架 App Store）
5. 导出 `.ipa` 文件

### 无 Mac 的替代方案
- 使用云 Mac 服务：[MacinCloud](https://macincloud.com/) 或 [AWS Cloud9](https://aws.amazon.com/cloud9/)
- 使用在线打包服务：[Appy Pie](https://www.appypie.com/)、[GoNative](https://www.gonative.io/)

---

## 四、鸿蒙 HarmonyOS（HAP）— 推荐 DevEco Studio

### 前置要求
- Windows / Mac 均可
- 下载 [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/)（华为官方IDE）
- 注册 [华为开发者账号](https://developer.huawei.com/)（免费）

### 方案 A：WebView 封装（推荐，最快）

DevEco Studio 内置 **Web 快速生成 App** 模板，直接加载你的 HTTPS 网址即可：

1. 打开 DevEco Studio → 新建项目 → 选择 **Empty Ability**
2. 在 `Ability` 中添加 `WebView` 组件，加载你的 PWA 网址
3. 配置应用图标、名称、权限
4. 编译生成 `.hap` 文件

### 方案 B：ArkTS 原生适配（体验更好）

如果需要更好的性能和鸿蒙原生能力（如分布式、NFC等），需要用 ArkTS 重写 UI 层，但数据层和业务逻辑可直接复用现有的 JavaScript 代码。

**关键适配点：**
- 路由系统：鸿蒙用 `router.pushUrl`，替换现有的 `navigateTo()`
- 本地存储：鸿蒙用 `@ohos.data.preferences`，替换 `localStorage`
- 网络请求：鸿蒙用 `@ohos.net.http`，替换 `fetch()`

### 分发
- 上传到 [华为应用市场](https://appgallery.huawei.com/)（需审核）
- 或直接分享 `.hap` 文件安装（需开启"允许安装未知来源应用"）

---

## 五、微信小程序 — 推荐使用 Taro 转换

### 前置要求
- 微信开发者工具（[下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）
- 注册微信小程序账号（[mp.weixin.qq.com](https://mp.weixin.qq.com/)）

### 转换方案：Taro（推荐）

[Taro](https://taro-docs.jd.com/) 是京东开源的跨端框架，支持将 React/Vue 项目编译为微信/支付宝/抖音小程序。

**转换步骤：**

```bash
# 1. 安装 Taro CLI
npm install -g @tarojs/cli

# 2. 初始化 Taro 项目（选择 React + less 模板）
taro init city-ai-farm-mini

# 3. 将现有代码迁移到 Taro 项目的 src/ 目录
#    - 把 index.html 内容拆分为 src/pages/index/index.jsx + index.config.js
#    - CSS 复制到 src/pages/index/index.less
#    - JS 逻辑基本兼容，替换 DOM 操作为 Taro API

# 4. 编译为微信小程序
npm run build:weapp

# 5. 用微信开发者工具打开 dist/weapp 目录
```

**需要适配的主要差异：**

| 现有代码 | Taro / 小程序等效 |
|---------|-----------------|
| `document.getElementById()` | `Taro.createSelectorQuery()` |
| `onclick="navigateTo('home')"` | `<View onClick={() => navigateTo('home')} />` |
| `localStorage` | `Taro.getStorage()` / `Taro.setStorage()` |
| CSS `:hover` | 小程序不支持 hover，需用 `bindtouchstart` |
| `fetch()` | `Taro.request()` |

### 支付宝小程序

Taro 同样支持，只需修改配置文件：
```bash
npm run build:alipay
```

---

## 六、PWA（全手机浏览器通用）— 零安装，立即可用

这是**最快速的部署方式**，所有现代手机浏览器都支持"添加到主屏幕"。

### 部署方式

**方式 A：本地局域网测试**

```cmd
cd d:\Documents\city-ai-farm
python -m http.server 8888
```
手机和电脑连同一 WiFi，手机浏览器访问 `http://[电脑IP]:8888`

**方式 B：部署到云服务器（推荐）**

将 `www/` 目录上传到任意 Web 服务器：

| 平台 | 部署方式 | 费用 |
|------|---------|------|
| **Vercel** | 拖拽 `www/` 文件夹即可 | 免费 |
| **Netlify** | 拖拽部署 | 免费 |
| **阿里云 OSS** | 静态网站托管 | 约 ¥0.1/GB/月 |
| **腾讯云 COS** | 静态网站托管 | 免费额度充足 |
| **GitHub Pages** | 推送到仓库自动部署 | 免费 |

> ⚠️ **必须使用 HTTPS**（PWA 要求），HTTP 仅限 localhost 调试。

### 各手机浏览器安装方式

| 手机 / 浏览器 | 安装方法 |
|-------------|---------|
| **Android Chrome** | 自动弹出"添加到主屏幕"Banner，或点击菜单 → "添加到主屏幕" |
| **Android  Edge / Firefox** | 点击菜单 → "添加到主屏幕" |
| **iOS Safari** | 点击底部"分享"按钮 → "添加到主屏幕" |
| **iOS Chrome / Firefox** | 点击菜单 → "添加到主屏幕"（跳转 Safari 执行） |
| **鸿蒙 浏览器** | 点击菜单 → "添加到桌面" |

### PWA 能力对比

| 能力 | Android Chrome | iOS Safari | 鸿蒙浏览器 |
|------|---------------|------------|-----------|
| 离线访问 | ✅ | ✅ | ✅ |
| 推送通知 | ✅ | ❌ | ✅ |
| 后台同步 | ✅ | ❌ | ✅ |
| 相机访问 | ✅ | ✅ | ✅ |
| 地理位置 | ✅ | ✅ | ✅ |

---

## 七、统一 Web 资源包

所有原生封装方案（Android/iOS/鸿蒙）都共用同一个 Web 资源目录：

```
www/                          ← 统一 Web 资源包
├── index.html                ← 用户端（含 PWA 集成）
├── admin-console.html        ← 管理端（含 PWA 集成）
├── manifest.json             ← PWA 清单
├── sw.js                     ← Service Worker
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── data.js
└── assets/
    ├── icons/                ← 全尺寸应用图标
    └── images/
```

**修改代码后同步到所有平台：**
```bash
# 1. 同步到 Android
cd d:\Documents\city-ai-farm && npx cap sync android

# 2. 同步到 iOS（Mac 上执行）
cd /path/to/city-ai-farm && npx cap sync ios
```

---

## 八、快速上手指南（推荐优先级）

### 第一优先级：PWA 部署（5 分钟上线）
1. 将 `www/` 目录上传到 Vercel / Netlify
2. 手机浏览器访问你的 HTTPS 网址
3. 点击"添加到主屏幕"即可使用

### 第二优先级：Android APK（已就绪）
- 直接安装 `dist\城市AI农场-v1.0.0-debug.apk`
- 签名后即可上架华为应用市场 / Google Play

### 第三优先级：iOS IPA（需 Mac）
- 按第三章步骤操作
- 或使用 MacinCloud 云 Mac

### 第四优先级：鸿蒙 HAP
- 用 DevEco Studio 的 WebView 模板快速封装

### 第五优先级：小程序
- 用 Taro 转换，适合微信生态用户

---

## 九、应用商店上架清单

### Android（华为 / Google Play）
- [ ] 应用图标：512×512 PNG
- [ ] 截图：至少 2 张，1080×1920 或更高
- [ ] 应用描述（中文 + 英文）
- [ ] 隐私政策网址（HTTPS）
- [ ] 签名 APK（release 版）
- [ ] 内容分级问卷填写

### iOS（App Store）
- [ ] App 图标：1024×1024（App Store 用）+ 各种尺寸
- [ ] 截图：iPhone 6.7" / 6.5" / 5.5" 各至少一张
- [ ] App 描述 + 关键词
- [ ] 隐私政策 URL
- [ ] 测试设备 UDID（TestFlight 内测）
- [ ] 填写 App Store Connect 信息

### 鸿蒙（华为应用市场）
- [ ] 应用图标：192×192 / 432×432 / 648×648
- [ ] 应用描述
- [ ] 隐私政策
- [ ] `.hap` 签名包

---

## 十、常见问题

**Q：一套代码真的能跑 5 个平台吗？**  
A：核心业务逻辑（数据模型、算法、UI 交互）完全复用。PWA 方案零改动；Android/iOS/鸿蒙通过 WebView 直接加载；小程序需要少量 API 适配（Taro 可自动化大部分）。

**Q：PWA 和原生 APP 体验有差距吗？**  
A：PWA 在现代浏览器中体验已非常接近原生，支持离线、全屏、快捷方式。主要差距在推送通知（iOS 不支持）和某些系统 API 访问权限。

**Q：最省钱的方案是什么？**  
A：PWA 部署到 Vercel/Netlify（免费） + Android APK 直接分发（免费）。覆盖 95% 以上用户。

**Q：用户数据怎么同步？**  
A：所有平台共用同一个后端 API。Web 端和原生端通过 HTTPS 请求同一套接口，数据天然互通。

---

*由 AMOO 自动生成于 2026-11-10*
