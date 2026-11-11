# 城市AI农场 — PWA 部署 & iOS 上架指南

> 生成时间：2026-11-10  
> 项目路径：`d:\Documents\city-ai-farm\`  
> 访问地址：http://localhost:8888

---

## 一、已完成的 PWA 改造清单

### 1.1 核心文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `manifest.json` | PWA 应用清单（名称、图标、主题色、快捷方式） | ✅ |
| `sw.js` | Service Worker（静态资源缓存 + API 请求拦截） | ✅ |
| `assets/icons/icon-512x512.png` | 主图标 512×512（芯片+植物融合设计） | ✅ |
| `assets/icons/icon-192x192.png` | Android 安装图标 | ✅ |
| `assets/icons/apple-touch-icon.png` | iOS 主屏幕图标 180×180 | ✅ |
| `assets/icons/favicon.ico` | 浏览器标签页图标 | ✅ |

### 1.2 已集成到 HTML

- **index.html**：添加了完整的 PWA meta 标签、manifest 链接、Service Worker 注册代码、安装提示 Banner、版本更新提示
- **admin-console.html**：添加了 PWA meta 标签、manifest 链接、Service Worker 注册代码

### 1.3 图标设计说明

- **风格**：科技芯片 × 绿色植物的融合设计
- **颜色**：渐变绿（#16a34a → #4ade80），白色芯片底座，深绿叶片
- **元素**：外层圆环 → 芯片引脚 → 幼苗/土壤 → AI 脉冲点
- **寓意**：科技赋能农业，智能+自然的完美结合
- **适配**：支持 maskable icon，自适应 Android 自适应图标

---

## 二、功能特性

### 2.1 离线缓存策略

| 资源类型 | 策略 | 说明 |
|---------|------|------|
| HTML / CSS / JS / 图片 / 图标 | **Cache First** | 优先读取缓存，后台静默更新 |
| API 请求 (`/api/*`) | **Network First** | 优先网络，失败回退缓存 |
| 导航请求 | **Network First** | 失败时回退到 index.html（SPA 路由） |

### 2.2 安装体验

- **Android (Chrome)**：自动弹出"添加到主屏幕"Banner，7天内不重复显示
- **iOS (Safari)**：用户手动点击"分享 → 添加到主屏幕"
- **桌面端 (Chrome/Edge)**：地址栏右侧出现安装图标
- **版本更新**：新版本部署后自动检测并提示用户刷新

### 2.3 快捷方式（支持 Android 长按图标）

- 🌾 认养大厅
- 🗺️ 农场地图
- 🔍 AI 识别
- 👤 我的地块

---

## 三、测试清单

### 3.1 基础功能测试（本地）

```bash
# 确保服务器运行
python -m http.server 8888
```

访问 http://localhost:8888 检查：

- [ ] 页面正常加载，样式完整
- [ ] 浏览器控制台无红色报错
- [ ] manifest.json 可访问：http://localhost:8888/manifest.json
- [ ] sw.js 可访问：http://localhost:8888/sw.js
- [ ] 所有图标可正常显示

### 3.2 Chrome / Edge 桌面端测试

1. 打开 Chrome DevTools → **Application** 标签
2. 左侧菜单检查：
   - [ ] **Manifest**：显示应用名称、图标、主题色
   - [ ] **Service Workers**：状态为 `activated` 且 `running`
   - [ ] **Cache Storage**：看到 `city-ai-farm-v1-static` 缓存
3. 地址栏右侧应出现安装图标（或点击菜单"更多工具 → 创建快捷方式"）
4. 安装后，桌面出现"城市AI农场"图标，双击可全屏打开

### 3.3 Android 测试

1. Chrome 手机版访问 http://localhost:8888（需同一局域网）
2. 等待 3-5 秒，底部弹出安装 Banner
3. 点击"安装" → 主屏幕出现应用图标
4. 长按图标 → 显示 4 个快捷方式
5. 关闭网络 → 打开应用 → 页面仍可正常浏览（离线模式）

### 3.4 iOS 测试（Safari）

> ⚠️ **重要**：iOS Safari **不支持** beforeinstallprompt 事件，用户必须手动添加。

1. iPhone/iPad 用 Safari 访问（需 HTTPS 或 localhost）
2. 点击底部"分享"按钮 → "添加到主屏幕"
3. 主屏幕出现应用图标，点击可全屏打开
4. 注意：iOS PWA 不支持推送通知和后台刷新

### 3.5 Lighthouse 审计（Chrome DevTools）

打开 DevTools → **Lighthouse** → 勾选 **PWA** → 生成报告

期望得分：
- PWA 总分 ≥ 80 分
- 可安装 (Installable) ✅
- PWA 优化 (PWA Optimized) ✅

---

## 四、iOS App Store 上架指南

PWA 本身**不能直接提交到 Apple App Store**。要上架 iOS，需要以下方案：

### 方案 A：使用 WebView 打包（推荐）

用 Cordova / Capacitor 将 PWA 封装为原生 App。

#### 使用 Capacitor（推荐）

```bash
# 1. 初始化 Capacitor
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios

# 2. 配置 capacitor.config.json
npx cap init "城市AI农场" "com.cityaifarm.app" --web-dir "."

# 3. 添加 iOS 平台
npm install @capacitor/ios
npx cap add ios

# 4. 同步 Web 资源到 Xcode 项目
npx cap sync ios
```

然后打开 Xcode 项目进行签名和提交。

#### 所需 iOS 配置

在 `ios/App/App/Info.plist` 中添加：

```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机以使用AI农作物识别功能</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册以选择照片进行AI识别</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要获取位置信息以推荐附近农场</string>
<key>UIStatusBarHidden</key>
<false/>
<key>UIRequiresFullScreen</key>
<true/>
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>
```

### 方案 B：PWA 直接分发（无需上架）

通过企业证书或 TestFlight 分发给内部用户。

---

## 五、Android 上架准备

### 5.1 使用 TWA (Trusted Web Activity)

Google 官方推荐的 PWA → Android App 方案：

```bash
# 使用 Bubblewrap 初始化 TWA 项目
npm install -g @nicegoodthings/bubblewrap
bubblewrap init --manifest https://yourdomain.com/manifest.json
bubblewrap build
```

输出为 Android App Bundle (.aab)，可直接上传到 Google Play。

### 5.2 使用 PWABuilder（最简单）

访问 https://www.pwabuilder.com/  
输入 `https://yourdomain.com` → 选择 **Android (TWA)** → 下载打包好的项目 → 用 Android Studio 签名后上传。

---

## 六、上线前检查清单

### 6.1 HTTPS 配置

PWA 在非 localhost 环境下**必须**使用 HTTPS：

- [ ] 域名已备案（国内）
- [ ] SSL 证书已安装（Let's Encrypt / 阿里云 / 腾讯云均可）
- [ ] HTTP 自动跳转 HTTPS
- [ ] `manifest.json` 和 `sw.js` 可通过 HTTPS 访问

### 6.2 manifest.json 补充字段

上架应用商店前，建议补充：

```json
{
  "screenshots": [
    { "src": "assets/screenshots/home-1080x1920.png", "sizes": "1080x1920", "type": "image/png" },
    { "src": "assets/screenshots/map-1080x1920.png",  "sizes": "1080x1920", "type": "image/png" }
  ],
  "prefer_related_applications": false,
  "iarc_rating_id": "EST 3+"
}
```

### 6.3 性能优化

- [ ] 所有图片启用 WebP 格式
- [ ] CSS/JS 启用 gzip / brotli 压缩
- [ ] 配置 CDN 加速静态资源
- [ ] Lighthouse Performance 得分 ≥ 80

---

## 七、目录结构（PWA 新增）

```
city-ai-farm/
├── index.html                  ← 已集成 PWA
├── admin-console.html          ← 已集成 PWA
├── manifest.json               ← PWA 清单 ⭐新增
├── sw.js                       ← Service Worker ⭐新增
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── data.js
├── assets/
│   ├── icons/                  ← 多尺寸图标 ⭐新增
│   │   ├── icon-512x512.png
│   │   ├── icon-384x384.png
│   │   ├── icon-192x192.png
│   │   ├── icon-180x180.png
│   │   ├── icon-152x152.png
│   │   ├── icon-144x144.png
│   │   ├── icon-96x96.png
│   │   ├── icon-72x72.png
│   │   ├── icon-48x48.png
│   │   ├── apple-touch-icon.png
│   │   └── favicon.ico
│   └── images/
├── scripts/
│   ├── generate_icons.js       ← 图标生成脚本
│   └── generate_icons.py
└── node_modules/               ← canvas 依赖（仅开发用）
```

---

## 八、常见问题

**Q: PWA 可以像原生 App 一样推送通知吗？**  
A: 桌面端和 Android 支持 Push API。iOS Safari 目前不支持 PWA 推送通知。

**Q: 用户更新了代码，如何强制刷新缓存？**  
A: 修改 `sw.js` 中的 `CACHE_VERSION` 常量（如改为 `city-ai-farm-v2`），激活事件会自动清空旧缓存。

**Q: iOS PWA 有尺寸限制吗？**  
A: iOS Safari 添加 PWA 后不支持文件系统访问、推送通知和后台刷新。如果需要这些能力，必须走 App Store 打包方案。

**Q: 管理端也需要 PWA 吗？**  
A: 已为管理端添加基础 PWA 支持（离线缓存）。管理端涉及数据写入，建议仅在联网时使用。

---

## 九、下一步建议

1. **截图准备**：截取用户端和管理端的高清截图（1080×1920），放入 `assets/screenshots/` 并更新 manifest.json
2. **域名部署**：将项目部署到支持 HTTPS 的服务器（Vercel / Netlify / 阿里云 OSS 等）
3. **iOS 打包**：如需上架 App Store，按方案 A 使用 Capacitor 打包
4. **Android 打包**：使用 PWABuilder 生成 TWA 项目
5. **Lighthouse 优化**：持续优化性能和可访问性得分

---

*由 AMOO 自动生成于 2026-11-10*
