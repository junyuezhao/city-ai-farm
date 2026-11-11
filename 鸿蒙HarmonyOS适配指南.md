# 城市AI农场 — 鸿蒙 HarmonyOS 适配指南

> 生成时间：2026-11-10  
> 适用版本：HarmonyOS NEXT / OpenHarmony 4.0+

---

## 一、方案选择

| 方案 | 开发量 | 体验 | 上架难度 | 推荐度 |
|------|-------|------|---------|--------|
| **WebView 封装** | 极低（1-2天） | 中等 | 低 | ⭐⭐⭐⭐⭐ |
| **ArkTS 原生重写** | 高（2-4周） | 原生级 | 中 | ⭐⭐⭐ |

> **推荐先用 WebView 方案快速上线**，后续根据用户反馈再考虑 ArkTS 原生适配。

---

## 二、WebView 封装方案（快速上线）

### 2.1 前置要求

1. 下载 [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/)（华为官方 IDE，免费）
2. 注册 [华为开发者账号](https://developer.huawei.com/)（免费）
3. 完成开发者实名认证

### 2.2 创建项目

1. 打开 DevEco Studio → **New Project**
2. 选择模板：**Empty Ability**（Stage 模型）
3. 填写项目信息：
   - Project Name：`CityAIFarm`
   - Bundle Name：`com.cityaifarm.app`
   - Minimum Compile SDK：API 12（HarmonyOS NEXT）
   - Language：**ArkTS** 或 **Stage 模型**

### 2.3 添加 WebView 组件

打开 `ets/pages/Index.ets`，替换为：

```typescript
import web_webview from '@ohos.web.webview';
import promptAction from '@ohos.promptAction';

@Entry
@Component
struct Index {
  controller: web_webview.WebviewController = new web_webview.WebviewController();
  @State('Home') currentPage: string = 'Home';

  aboutToAppear() {
    // 设置 WebView 属性
    this.controller.setWebIdTimeout(20000);
  }

  build() {
    Column() {
      // 导航栏
      Row() {
        Text(this.currentPage)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
      }
      .width('100%')
      .height(56)
      .backgroundColor('#16a34a')
      .justifyContent(FlexAlign.Center)

      // WebView 加载 PWA
      WebView({ src: 'https://你的域名.com', controller: this.controller })
        .domStorageAccess(true)
        .javaScriptAccess(true)
        .imageAccess(true)
        .verticalScrollBarAccess(true)
        .horizontalScrollBarAccess(false)
        .javaScriptProxy({
          object: this,
          name: "HarmonyOSBridge",
          methodList: ["onMessageFromWeb"]
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }

  // 接收 Web 端发来的消息
  onMessageFromWeb(data: string) {
    console.info('收到 Web 消息:', data);
  }
}
```

### 2.4 配置网络权限

打开 `module.json5`（`src\main\module.json5`），添加网络权限：

```json5
{
  "module": {
    "requestPermissions": [
      {
        "name": "ohos.permission.INTERNET"
      },
      {
        "name": "ohos.permission.CAMERA",
        "reason": "需要访问相机以使用AI农作物识别功能"
      },
      {
        "name": "ohos.permission.READ_MEDIA",
        "reason": "需要访问相册以选择照片进行AI识别"
      },
      {
        "name": "ohos.permission.APPROXIMATELY_LOCATION",
        "reason": "需要获取位置信息以推荐附近农场"
      }
    ]
  }
}
```

### 2.5 配置应用图标

将图标放入 `resources\base\media\` 目录：

| 图标文件 | 尺寸 | 用途 |
|---------|------|------|
| `app_icon.png` | 48×48 | 普通图标 |
| `app_icon.png` | 72×72 | 普通图标 |
| `app_icon.png` | 96×96 | 普通图标 |
| `app_icon.png` | 120×120 | 普通图标 |
| `app_icon.png` | 192×192 | 桌面图标 |
| `app_icon.png` | 432×432 | 应用市场 |
| `app_icon.png` | 648×648 | 应用市场 |

在 `resources\base\profile.json` 中配置：

```json
{
  "app": {
    "icon": "$media:app_icon",
    "iconId": "$media:app_icon",
    "distributedNotificationEnabled": true,
    "targetAPIVersion": 12
  }
}
```

### 2.6 打包生成 HAP

1. 点击菜单 **Build** → **Build Hap(s)/APP(s)** → **Build Hap(s)**
2. 选择 **debug** 或 **release** 模式
3. 输出路径：`build\outputs\default\` 目录下的 `.hap` 文件

### 2.7 安装测试

**方法 A：DevEco 内置模拟器**
1. 点击工具栏的 **Device Manager**，下载并启动鸿蒙模拟器
2. 点击 **Run** 按钮直接安装到模拟器

**方法 B：真机安装**
1. 手机开启"允许安装未知来源应用"
2. 通过 USB 连接电脑
3. 点击 **Run** 选择真机安装

**方法 C：直接分享 HAP**
将 `.hap` 文件发送到手机，点击安装即可。

---

## 三、ArkTS 原生适配（进阶，体验更好）

如果需要更好的性能和鸿蒙原生能力，需要用 ArkTS 重写 UI 层。

### 3.1 路由适配

```typescript
// 现有 JS 代码
function navigateTo(page) { ... }

// ArkTS 等效
import router from '@ohos.router';

function navigateTo(page: string): void {
  const routeMap: Record<string, string> = {
    'home': 'pages/Home',
    'plots': 'pages/Plots',
    'map': 'pages/Map',
    'ai': 'pages/AI',
    'profile': 'pages/Profile'
  };
  router.pushUrl({ url: routeMap[page] });
}
```

### 3.2 数据存储适配

```typescript
// 现有 JS: localStorage.setItem('key', 'value')
import preferences from '@ohos.data.preferences';

const pref = await preferences.getPreferences({ name: 'city_aifarm' });
await pref.put('key', 'value');
```

### 3.3 网络请求适配

```typescript
// 现有 JS: fetch('/api/plots')
import http from '@ohos.net.http';

let httpRequest = http.createHttp();
httpRequest.request('https://你的域名.com/api/plots', {
  method: http.RequestMethod.GET,
  connectTimeout: 10000
}, (err, data) => { ... });
```

### 3.4 推荐页面结构

```
ets/
├── pages/
│   ├── Home/          ← 首页
│   ├── Plots/         ← 认养大厅
│   ├── Map/           ← 农场地图
│   ├── AI/            ← AI识别
│   ├── Diary/         ← 种植日记
│   ├── Lessons/       ← 知识课堂
│   ├── Community/     ← 社区
│   ├── Bookings/      ← 预约种养
│   └── Profile/       ← 我的
├── components/        ← 复用组件（地块卡片、底部Tab等）
└── models/            ← 数据模型（地块、用户、预约等）
```

---

## 四、上架华为应用市场

### 4.1 准备工作

1. 登录 [华为开发者联盟](https://developer.huawei.com/)
2. 进入 **AppGallery Connect** → 创建应用
3. 填写应用基本信息：
   - 应用名称：城市AI农场
   - 应用分类：教育 / 生活
   - 应用简介：认养一块地，收获一整年的快乐
   - 隐私政策网址（必须，HTTPS）

### 4.2 上传 HAP

1. 进入 **AppGallery Connect** → 我的应用 → 版本管理
2. 点击 **新建版本**
3. 上传 `.hap` 文件
4. 填写版本说明
5. 提交审核（通常 1-3 个工作日）

### 4.3 应用签名（发布前必须）

DevEco Studio 会自动生成调试签名。发布前需要生成正式签名：

1. 点击 **Build** → **Generate Key and Certificate**
2. 填写密钥库信息，保存 `.jks` 文件
3. 在 `build-profile.json5` 中配置签名信息

---

## 五、PWA 在鸿蒙上的体验

如果暂时不想打包 HAP，用户可以直接通过鸿蒙浏览器访问你的 PWA 网址：

- 浏览器打开 PWA 网址
- 点击浏览器菜单 → **"添加到桌面"**
- 桌面出现应用图标，点击可全屏运行

体验与 PWA 在 Android Chrome 上基本一致，支持离线缓存、推送通知。

---

## 六、常见问题

**Q：WebView 封装和原生体验差距大吗？**  
A：WebView 方案加载的是你的 PWA 页面，视觉和交互与浏览器中完全一致。鸿蒙的 WebView 基于 Chromium 内核，兼容性良好。主要差距在于页面滚动流畅度和部分系统 API 无法直接调用。

**Q：鸿蒙支持推送通知吗？**  
A：HarmonyOS 的 WebView 支持通过 `push` 插件发送通知。需要在 DevEco Studio 中配置推送能力（华为推送服务 HMS Push）。

**Q：HAP 和 APK 有什么区别？**  
A：HAP 是鸿蒙应用包格式，包含 Ability（页面/服务）和资源文件。APK 是 Android 格式，鸿蒙目前兼容 APK 但性能不如原生 HAP。

---

*由 AMOO 自动生成于 2026-11-10*
