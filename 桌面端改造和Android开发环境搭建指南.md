# 城市AI农场 — 桌面端改造 & Android 开发环境搭建指南

> 创建时间：2026-11-10  
> 用途：记录桌面端界面改造方案和Android APK编译环境配置全过程

---

## 一、桌面端界面改造（已完成 ✅）

### 改造内容

#### 1. 自定义标题栏
- **隐藏原生标题栏**：`frame: false` + `titleBarStyle: 'hidden'`
- **自定义标题栏HTML**：位于 `index.html` 顶部
  - 应用图标 + 标题（左侧）
  - 最小化/最大化/关闭按钮（右侧）
  - 整个栏支持窗口拖动（`-webkit-app-region: drag`）
- **样式**：绿色渐变背景，与品牌色一致

#### 2. 窗口控制功能
- **IPC通信**：通过 `electron-preload.js` 暴露安全的API
  - `window.electronAPI.window-minimize()` — 最小化
  - `window.electronAPI.window-maximize()` — 最大化/还原
  - `window.electronAPI.window-close()` — 关闭窗口

#### 3. 原生应用菜单
- **文件菜单**：打开管理控制台（快捷键 Ctrl+Shift+A）、退出
- **编辑菜单**：撤销/重做/剪切/复制/粘贴/全选
- **视图菜单**：重新加载、缩放、全屏
- **帮助菜单**：关于城市AI农场

#### 4. 系统托盘
- **托盘图标**：显示在任务栏右下角
- **右键菜单**：显示主窗口、打开管理控制台、退出
- **双击事件**：双击托盘图标显示主窗口

#### 5. CSS适配
- 桌面端自动添加 `body.is-electron` 类
- 顶部预留 36px 给自定义标题栏
- 自定义滚动条样式（绿色主题）

### 修改的文件
```
electron-main.js          ← 主进程（窗口创建、菜单、托盘）
electron-preload.js       ← 预加载脚本（窗口控制、标题栏显示）
index.html                ← 添加自定义标题栏HTML
css/style.css             ← 添加自定义标题栏样式
```

### 重新打包
```bash
npm run build
```
输出：
- `dist/城市AI农场-1.0.0-安装版.exe`（73 MB，带安装向导）
- `dist/城市AI农场-1.0.0-便携版.exe`（72.7 MB，绿色版）

---

## 二、Android APK 编译环境搭建

### 当前状态
- ✅ Java JDK 17 已安装
- ✅ Android SDK 命令行工具已下载
- ⚠️  Android SDK 组件未完成安装（许可证接受问题）
- ⚠️  Gradle 未下载（网络超时）

### 已完成的步骤

#### 1. 下载 Java JDK 17
- **来源**：清华镜像（Adoptium Temurin）
- **版本**：OpenJDK 17.0.21+9（最新LTS）
- **文件**：`OpenJDK17U-jdk_x64_windows_hotspot_17.0.21_9.msi`（160.9 MB）
- **安装路径**：`C:\Program Files\Java\jdk-17`
- **环境变量**：
  - `JAVA_HOME` = `C:\Program Files\Java\jdk-17`
  - `PATH` 添加 `%JAVA_HOME%\bin`

**验证**：
```bash
java -version
# 输出：openjdk version "17.0.21" 2026-10-20
javac -version
# 输出：javac 17.0.21
```

#### 2. 下载 Android SDK 命令行工具
- **来源**：Google 官方
- **版本**：commandlinetools-win-11076708_latest.zip（146.5 MB）
- **解压路径**：`%LOCALAPPDATA%\Android\cmdline-tools\latest\`
- **目录结构**：
  ```
  Android/
  └── cmdline-tools/
      └── latest/
          ├── bin/
          │   ├── sdkmanager.bat
          │   └── avdmanager.bat
          └── lib/
  ```

**环境变量**：
- `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
- `PATH` 添加：
  - `%ANDROID_HOME%\cmdline-tools\latest\bin`
  - `%ANDROID_HOME%\platform-tools`（安装后）

**验证**：
```bash
sdkmanager --version
# 输出：12.0
```

---

## 三、待完成：Android SDK 组件安装

### 问题说明
在安装 SDK 组件时，`sdkmanager` 需要交互式接受许可证协议。使用批处理或PowerShell脚本传递 "y" 输入时遇到困难。

### 手动安装步骤（推荐）

#### 方法 A：使用命令行交互式安装（推荐）

1. **打开新的命令提示符**（确保环境变量生效）
   ```cmd
   cd %LOCALAPPDATA%\Android\cmdline-tools\latest\bin
   sdkmanager --licenses
   ```
   按提示输入 `y` 接受所有 8 个许可证。

2. **安装必要组件**
   ```cmd
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```

3. **验证安装**
   ```cmd
   dir %ANDROID_HOME%\platform-tools\adb.exe
   dir %ANDROID_HOME%\platforms\android-34
   dir %ANDROID_HOME%\build-tools\34.0.0
   ```

#### 方法 B：使用 Android Studio 图形界面安装

1. 下载 Android Studio：https://developer.android.com/studio
2. 安装时勾选 "Android SDK"、"Android SDK Platform"、"Android Virtual Device"
3. 打开 Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
4. 在 "SDK Platforms" 标签页勾选 "Android 14.0 (API 34)"
5. 在 "SDK Tools" 标签页勾选：
   - ✅ Android SDK Build-Tools 34
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator（可选）
6. 点击 "Apply" 安装

---

## 四、编译 APK

### 前置条件
- ✅ Java JDK 17 已安装
- ✅ Android SDK Platform 34 已安装
- ✅ Android SDK Build-Tools 34 已安装
- ✅ Android SDK Platform-Tools 已安装
- ⚠️  Gradle 需要下载（首次构建会自动下载，但可能需要翻墙或配置镜像）

### 编译命令

#### 方法 A：使用 Gradle Wrapper（推荐）

```bash
cd d:\Documents\city-ai-farm\android
.\gradlew.bat assembleDebug
```

**输出位置**：
```
android\app\build\outputs\apk\debug\app-debug.apk
```

#### 方法 B：使用 Capacitor 编译

```bash
cd d:\Documents\city-ai-farm
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

#### 方法 C：使用 Android Studio 编译

1. 打开 Android Studio
2. File → Open → 选择 `d:\Documents\city-ai-farm\android`
3. 等待 Gradle 同步完成（首次约 5-10 分钟）
4. Build → Build Bundle(s) / APK(s) → Build APK

### Gradle 下载问题解决

如果 Gradle Wrapper 下载超时，可以：

1. **手动下载 Gradle**：
   - 下载地址：https://services.gradle.org/distributions/gradle-8.14.3-all.zip
   - 解压到 `d:\gradle-8.14.3`

2. **修改 gradle-wrapper.properties**：
   ```properties
   distributionBase=GRADLE_USER_HOME
   distributionPath=wrapper/dists
   distributionUrl=file:///D:/gradle-8.14.3/gradle-8.14.3-all.zip
   zipStoreBase=GRADLE_USER_HOME
   zipStorePath=wrapper/dists
   ```

3. **或使用国内镜像**：
   - 阿里云镜像：https://mirrors.aliyun.com/macports/distfiles/gradle/
   - 腾讯云镜像：https://mirrors.cloud.tencent.com/gradle/

---

## 五、快速测试方案（无需编译APK）

如果只是想快速在手机上测试，可以使用 **局域网访问**：

1. **确保手机和电脑在同一 WiFi**
2. **查看电脑 IP**：
   ```bash
   ipconfig
   # 找到 IPv4 地址，例如：192.168.1.100
   ```
3. **手机浏览器访问**：
   ```
   http://192.168.1.100:8888
   ```
4. **Android Chrome**：自动弹出"添加到主屏幕" Banner
5. **iOS Safari**：点击分享按钮 → 添加到主屏幕

---

## 六、环境变量总结

### 已配置的永久环境变量

| 变量名 | 值 | 作用 |
|--------|-----|------|
| `JAVA_HOME` | `C:\Program Files\Java\jdk-17` | Java JDK 17 路径 |
| `ANDROID_HOME` | `C:\Users\Administrator\AppData\Local\Android\Sdk` | Android SDK 路径 |
| `PATH` | 添加了 `%JAVA_HOME%\bin` | 全局可用 java/javac |

### 临时环境变量（构建时需要）

```cmd
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
```

---

## 七、常见问题

### Q1: sdkmanager 无法接受许可证？
**A**：直接在命令行中运行 `sdkmanager --licenses`，然后手动输入 `y`。

### Q2: Gradle 下载超时？
**A**：手动下载 Gradle 并修改 `gradle-wrapper.properties` 指向本地文件。

### Q3: 编译时提示 "SDK location not found"？
**A**：在 `android\local.properties` 文件中添加：
```properties
sdk.dir=C:\\Users\\Administrator\\AppData\\Local\\Android\\Sdk
```

### Q4: 如何生成签名 APK？
**A**：创建密钥库后，在 `android\app\build.gradle` 中配置 signingConfigs，然后运行：
```bash
.\gradlew.bat assembleRelease
```

---

## 八、后续学习建议

### Android 开发学习路径
1. **官方文档**：https://developer.android.com/guide
2. **Kotlin 语言**：https://kotlinlang.org/docs/home.html
3. **Gradle 构建**：https://docs.gradle.org/current/userguide/userguide.html
4. **Capacitor 文档**：https://capacitorjs.com/docs

### Electron 开发学习路径
1. **官方文档**：https://www.electronjs.org/docs/latest/
2. **自定义标题栏**：https://www.electronjs.org/docs/latest/tutorial/custom-title-bar
3. **系统托盘**：https://www.electronjs.org/docs/latest/api/tray
4. **打包分发**：https://www.electron.build/

---

*由 AMOO 自动整理于 2026-11-10*
