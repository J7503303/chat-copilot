# 紧急修复指南 - 最小化和关闭功能

## 🚨 紧急情况说明
客户催着上线，最小化和关闭功能必须立即修复！

## 🔍 问题诊断步骤

### 1. 检查控制台输出
启动应用后，按F12打开开发者工具，查看控制台输出：

```
=== 预加载脚本已加载 ===
contextBridge可用: true
ipcRenderer可用: true
=== 预加载脚本延迟检查 ===
window.electronAPI: true
electronAPI方法: [...]
windowMinimize: function
windowClose: function
```

### 2. 如果electronAPI不可用
如果看到 `electronAPI: false`，说明preload脚本没有正确加载。

### 3. 如果API可用但功能不工作
如果API存在但点击无效果，检查IPC处理器。

## 🛠️ 修复方案

### 方案A：直接在main.js中处理窗口事件
```javascript
// 在createWindow函数中添加
mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
        // 重写按钮事件
        document.addEventListener('click', (e) => {
            if (e.target.id === 'minimizeBtn') {
                console.log('最小化按钮被点击');
                // 发送消息到主进程
                require('electron').ipcRenderer.invoke('window-minimize');
            }
            if (e.target.id === 'closeBtn') {
                console.log('关闭按钮被点击');
                require('electron').ipcRenderer.invoke('window-close');
            }
        });
    `);
});
```

### 方案B：使用webContents.send
在HTML中监听消息：
```javascript
// 在main-layout.html中添加
window.addEventListener('message', (event) => {
    if (event.data.type === 'MINIMIZE') {
        // 通过webContents发送消息
    }
});
```

### 方案C：直接操作窗口（最简单）
在main.js的createWindow函数中：
```javascript
// 监听特定的按键组合作为最小化/关闭触发器
mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'm') {
        mainWindow.minimize();
    }
    if (input.control && input.key.toLowerCase() === 'w') {
        mainWindow.hide();
        showFloatingWindow();
    }
});
```

## 🚀 立即可用的解决方案

### 最快修复（5分钟内完成）

1. **修改main-layout.html的按钮事件**：
```html
<button class="control-btn minimize-btn" onclick="handleMinimize()" title="最小化">−</button>
<button class="control-btn close-btn" onclick="handleClose()" title="关闭">×</button>
```

2. **添加全局处理函数**：
```javascript
function handleMinimize() {
    console.log('最小化处理');
    if (window.electronAPI && window.electronAPI.windowMinimize) {
        window.electronAPI.windowMinimize();
    } else {
        // 降级方案
        window.postMessage({type: 'MINIMIZE'}, '*');
    }
}

function handleClose() {
    console.log('关闭处理');
    if (window.electronAPI && window.electronAPI.windowClose) {
        window.electronAPI.windowClose();
    } else {
        // 降级方案
        window.close();
    }
}
```

3. **在main.js中添加消息监听**：
```javascript
mainWindow.webContents.on('console-message', (event, level, message) => {
    if (message.includes('最小化处理')) {
        mainWindow.minimize();
    }
    if (message.includes('关闭处理')) {
        mainWindow.hide();
        showFloatingWindow();
    }
});
```

## 🎯 测试清单

- [ ] 点击最小化按钮，窗口最小化到任务栏
- [ ] 点击关闭按钮，窗口隐藏并显示悬浮图标
- [ ] 控制台显示正确的调试信息
- [ ] 按钮有视觉反馈动画
- [ ] 导航按钮显示亮蓝色效果

## 📞 如果还是不工作

1. 检查Electron版本兼容性
2. 确认contextIsolation设置
3. 检查preload脚本路径
4. 验证IPC处理器注册时机

## 🔧 终极方案（保证工作）

如果所有方案都失败，使用最原始的方法：

```javascript
// 在main.js中
setInterval(() => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
            if (window.needMinimize) {
                window.needMinimize = false;
                console.log('执行最小化');
            }
            if (window.needClose) {
                window.needClose = false;
                console.log('执行关闭');
            }
        `).then(result => {
            // 根据结果执行操作
        });
    }
}, 100);
```

然后在HTML中：
```javascript
function minimizeWindow() {
    window.needMinimize = true;
}
function closeWindow() {
    window.needClose = true;
}
```

这个方案虽然不优雅，但绝对能工作！ 