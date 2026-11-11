/**
 * 城市AI农场 — Electron 主进程
 * 桌面端安装包入口（自定义标题栏 + 系统托盘 + 原生菜单）
 */
const { app, BrowserWindow, Menu, Tray, ipcMain, shell, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

// ── 开发/生产环境判断 ────────────────────────────────
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// ── 全局托盘引用（防止被 GC） ────────────────────────
let appTray = null;

// ── 窗口创建 ──────────────────────────────────────────
function createWindow(url, title, width, height, resizable = true) {
  const win = new BrowserWindow({
    width,
    height,
    minWidth: 360,
    minHeight: 600,
    title,
    // 图标：优先用 .ico， fallback 到 .png
    icon: path.join(__dirname, "assets/icons/icon-512x512.png"),
    resizable,
    backgroundColor: "#16a34a",
    // 关键：隐藏原生标题栏和边框，使用自定义标题栏
    frame: false,
    titleBarStyle: "hidden",
    // 窗口背景透明（可选，当前关闭）
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron-preload.js"),
      webSecurity: true,
    },
    show: false,
  });

  // 加载页面
  if (url.startsWith("http")) {
    win.loadURL(url);
  } else {
    win.loadFile(url);
  }

  // 窗口准备好后再显示，避免闪烁
  win.once("ready-to-show", () => {
    win.show();
    if (isDev) win.webContents.openDevTools();
  });

  // 外部链接用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

// ── 原生应用菜单 ──────────────────────────────────────
function buildAppMenu() {
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "打开管理控制台",
          accelerator: "Ctrl+Shift+A",
          click: () => {
            ipcMain.emit("open-admin-window");
          },
        },
        { type: "separator" },
        {
          label: "退出",
          role: "quit",
        },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于城市AI农场",
          click: () => {
            shell.openExternal("https://www.cityaifarm.com");
          },
        },
      ],
    },
  ];

  // macOS 特殊处理：第一个菜单必须是应用名
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about", label: "关于" },
        { type: "separator" },
        { role: "services", label: "服务" },
        { type: "separator" },
        { role: "hide", label: "隐藏" },
        { role: "hideOthers", label: "隐藏其他" },
        { role: "unhide", label: "显示全部" },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── 系统托盘 ──────────────────────────────────────────
function createTray() {
  // 尝试加载图标；如果失败则用空图标
  let trayIcon;
  try {
    const iconPath = path.join(__dirname, "assets/icons/icon-256x256.png");
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      // Windows 托盘图标建议 16x16
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } else {
      // fallback：创建一个简单的 16x16 绿色方块
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  appTray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示主窗口",
      click: () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.show();
          win.focus();
        } else {
          app.whenReady().then(() => createWindow("index.html", "城市AI农场", 1280, 800).show());
        }
      },
    },
    {
      label: "打开管理控制台",
      click: () => {
        ipcMain.emit("open-admin-window");
      },
    },
    { type: "separator" },
    { role: "quit", label: "退出" },
  ]);

  appTray.setToolTip("城市AI农场");
  appTray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  appTray.on("double-click", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      win.focus();
    }
  });
}

// ── 应用启动 ──────────────────────────────────────────
let mainWindow = null;

app.whenReady().then(() => {
  buildAppMenu();
  createTray();

  // 命令行参数检测：是否打开管理端
  const args = process.argv.slice(1);
  const openAdmin = args.includes("--admin") || args.includes("-a");

  if (openAdmin) {
    mainWindow = createWindow("admin-console.html", "城市AI农场 · 管理控制台", 1400, 900);
  } else {
    mainWindow = createWindow("index.html", "城市AI农场", 1280, 800, true);
  }

  // macOS: 点击 Dock 图标时重新创建窗口
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(
        openAdmin ? "admin-console.html" : "index.html",
        openAdmin ? "城市AI农场 · 管理控制台" : "城市AI农场",
        openAdmin ? 1400 : 1280, openAdmin ? 900 : 800
      );
    }
  });
});

// ── 所有窗口关闭时退出 (macOS 除外) ───────────────────
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── IPC: 窗口控制 ─────────────────────────────────────
// 最小化
ipcMain.handle("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

// 最大化 / 还原
ipcMain.handle("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

// 关闭
ipcMain.handle("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

// ── IPC: 获取应用版本 ────────────────────────────────
ipcMain.handle("app-version", () => app.getVersion());

// ── IPC: 打开外部链接 ────────────────────────────────
ipcMain.handle("open-external", (_, url) => shell.openExternal(url));

// ── IPC: 打开管理端窗口 ──────────────────────────────
ipcMain.handle("open-admin-window", () => {
  const adminWin = createWindow(
    "admin-console.html",
    "城市AI农场 · 管理控制台",
    1400, 900
  );
  adminWin.on("closed", () => {});
  return adminWin.id;
});
