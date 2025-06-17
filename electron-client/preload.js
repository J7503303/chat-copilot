const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    showMainWindow: () => ipcRenderer.invoke('show-main-window'),
    toggleCompactMode: () => ipcRenderer.invoke('toggle-compact-mode'),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
    windowPin: () => ipcRenderer.invoke('window-pin'),
    toggleSidebar: () => ipcRenderer.invoke('toggle-sidebar'),

    // Tab切换
    switchTab: (tabName) => ipcRenderer.invoke('switch-tab', tabName),

    // 快速操作
    quickAction: (action) => ipcRenderer.invoke('quick-action', action),

    // 悬浮窗口控制
    hideFloatingIcon: () => ipcRenderer.invoke('hide-floating-icon'),
    setFloatingPosition: (x, y) => ipcRenderer.invoke('set-floating-position', x, y),
    getWindowPosition: () => ipcRenderer.invoke('get-window-position'),

    // 应用控制
    exitApp: () => ipcRenderer.invoke('exit-app'),

    // 事件监听
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (event, status) => callback(status));
    },

    onTabParams: (callback) => {
        ipcRenderer.on('tab-params', (event, data) => callback(data));
    },

    // 移除事件监听
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },

    // 获取平台信息
    platform: process.platform,

    // 版本信息
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// WPF兼容接口（如果需要支持WPF客户端）
contextBridge.exposeInMainWorld('wpfHost', {
    ShowMainWindow: () => ipcRenderer.invoke('show-main-window'),
    ToggleCompactMode: () => ipcRenderer.invoke('toggle-compact-mode'),
    SwitchTab: (tabName) => ipcRenderer.invoke('switch-tab', tabName),
    QuickAction: (action) => ipcRenderer.invoke('quick-action', action),
    HideFloatingIcon: () => ipcRenderer.invoke('hide-floating-icon'),
    ExitApp: () => ipcRenderer.invoke('exit-app')
});

console.log('预加载脚本已加载');

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('医疗AI助手预加载脚本已就绪');
}); 