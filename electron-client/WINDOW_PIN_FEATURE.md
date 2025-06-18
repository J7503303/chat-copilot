# 窗口置顶功能说明

## 功能概述

医疗AI助手采用简化的窗口置顶方案：

### 默认置顶策略
- **启动状态**：应用启动时默认置顶
- **Logo状态**：Logo显示蓝色选中状态，表示当前置顶
- **用户控制**：点击Logo可切换置顶状态
- **API调用**：自动重新置顶，确保窗口显示并同步Logo状态

## 设计优势

### 🎯 简单直接
- 启动即置顶，确保医疗场景下的窗口可见性
- 无复杂的临时置顶逻辑
- Logo状态直观反映置顶状态

### 🏥 医疗场景适配
- **紧急情况**：窗口始终在前台，便于快速响应
- **多任务环境**：默认置顶确保不被其他窗口遮挡
- **用户选择**：不需要置顶时可手动关闭

### 🔄 用户体验
- Logo蓝色表示置顶，灰色表示非置顶
- 点击Logo即可切换状态
- 状态持久保存，直到用户再次切换

## 技术实现

### 窗口创建时默认置顶
```javascript
// main.js
mainWindow = new BrowserWindow({
    // ... 其他配置
    alwaysOnTop: true,  // 默认置顶
});
```

### Logo初始状态设置
```javascript
// main-layout.html
let isPinned = true;  // 初始为置顶状态

// 页面加载时设置Logo状态
if (logoBtn) {
    logoBtn.classList.add('pinned');  // 蓝色状态
    logoBtn.title = '点击取消置顶';
}
```

### 置顶状态切换
```javascript
// 用户点击Logo切换置顶状态
async function togglePin() {
    const result = await window.electronAPI.windowPin();
    if (result && result.success) {
        isPinned = result.pinned;
        logoBtn.classList.toggle('pinned', isPinned);
        logoBtn.title = isPinned ? '点击取消置顶' : '点击置顶/取消置顶';
    }
}
```

### API调用时重新置顶
```javascript
// API接口处理 - main.js
if (mainWindow) {
    mainWindow.setAlwaysOnTop(true);
    // 通知前端更新Logo状态
    if (mainWindow.webContents) {
        mainWindow.webContents.send('api-pin-status', { pinned: true });
    }
}

// 前端监听 - main-layout.html
window.electronAPI.onApiPinStatus((data) => {
    if (data.pinned) {
        isPinned = true;
        logoBtn.classList.add('pinned');
        logoBtn.title = '点击取消置顶';
    }
});
```

## 使用场景

### 场景1：正常使用
```
1. 应用启动，窗口默认置顶，Logo为蓝色
2. 用户可正常使用，窗口始终在前台
3. API调用时窗口已经可见，无需额外操作
```

### 场景2：用户取消置顶后API调用
```
1. 用户点击Logo，取消置顶，Logo变为灰色
2. 窗口可能被其他窗口覆盖
3. API调用时自动重新置顶，Logo变回蓝色
4. 确保窗口显示在最前台
```

### 场景3：多任务工作
```
1. 医生同时使用多个应用程序
2. 医疗AI助手默认置顶，便于快速查看
3. 需要专注其他工作时可临时取消置顶
```

## 测试方法

### 启动测试
1. 启动应用，观察Logo是否为蓝色
2. 观察窗口是否在所有窗口最前方
3. 打开其他应用，确认医疗AI助手仍在前台

### 切换测试
1. 点击Logo，观察颜色变化（蓝色↔灰色）
2. 观察窗口置顶状态变化
3. 验证状态持久性

### API测试
```powershell
# 运行简化的置顶测试
.\test-window-focus.ps1
```

## 最佳实践

### 对于第三方系统开发者
- 直接调用 `/api/v1/navigate` 接口
- 无需考虑窗口置顶问题
- API调用时自动重新置顶，确保窗口可见

### 对于最终用户
- 默认享受置顶便利
- 根据个人需要选择是否保持置顶
- 一键切换，操作简单

### 对于系统管理员
- 部署后无需额外配置
- 默认设置适合医疗场景
- 用户可自主调整使用习惯

## 与原方案对比

| 特性 | 原复杂方案 | 简化方案 |
|------|-----------|----------|
| 启动状态 | 非置顶 | 默认置顶 |
| API调用 | 临时置顶3秒 | 自动重新置顶 |
| 代码复杂度 | 高（临时置顶逻辑） | 低（简单切换） |
| 用户体验 | 复杂 | 直观 |
| 医疗适配 | 一般 | 优秀 |

这种简化方案既满足了医疗场景的需求，又降低了代码复杂度，提供了更好的用户体验。 