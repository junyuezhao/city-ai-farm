/**
 * 城市AI农场 — Electron Preload 脚本
 * 在渲染进程中暴露安全的 IPC 接口
 */
const { contextBridge, ipcRenderer } = require("electron");

// 窗口控制函数
function setupTitlebarButtons() {
  const btnMinimize = document.getElementById("btn-minimize");
  const btnMaximize = document.getElementById("btn-maximize");
  const btnClose = document.getElementById("btn-close");

  if (btnMinimize) {
    btnMinimize.addEventListener("click", () => {
      ipcRenderer.invoke("window-minimize");
    });
  }

  if (btnMaximize) {
    btnMaximize.addEventListener("click", () => {
      ipcRenderer.invoke("window-maximize");
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      ipcRenderer.invoke("window-close");
    });
  }
}

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  // 显示自定义标题栏
  document.body.classList.add("is-electron");

  // 绑定窗口控制按钮
  setupTitlebarButtons();
});

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("app-version"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openAdminWindow: () => ipcRenderer.invoke("open-admin-window"),
  platform: process.platform,
});
