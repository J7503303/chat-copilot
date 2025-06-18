# Webapp 聊天页面集成指南

## 概述

将 `/webapp` 下的 React 聊天应用嵌入到 electron-client 的 chat 页面中，有以下几种实现方案：

## 方案一：iframe 嵌入 (推荐)

### 1. 启动 webapp 服务

webapp 是一个 React 应用，需要先启动开发服务器：

```bash
# 在 webapp 目录下
cd webapp
yarn install  # 或 npm install
yarn start     # 或 npm start
```

默认会在 `http://localhost:8440` 启动服务。

### 2. 修改 chat.html

将现有的静态聊天界面替换为 iframe：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能聊天</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }
        
        .webapp-container {
            width: 100%;
            height: 100vh;
            border: none;
            background: white;
        }
        
        .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: 'Segoe UI', sans-serif;
            color: #666;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0078d4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 16px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-container {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: 'Segoe UI', sans-serif;
            color: #d13438;
        }
        
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .retry-btn {
            margin-top: 16px;
            padding: 8px 16px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <!-- 加载状态 -->
    <div id="loadingContainer" class="loading-container">
        <div class="loading-spinner"></div>
        <div>正在加载聊天界面...</div>
    </div>
    
    <!-- 错误状态 -->
    <div id="errorContainer" class="error-container">
        <div class="error-icon">⚠️</div>
        <div>无法连接到聊天服务</div>
        <div style="font-size: 14px; color: #666; margin-top: 8px;">
            请确保 webapp 服务正在运行 (http://localhost:8440)
        </div>
        <button class="retry-btn" onclick="retryConnection()">重试</button>
    </div>
    
    <!-- webapp iframe -->
    <iframe 
        id="webappFrame" 
        class="webapp-container" 
        src="http://localhost:8440"
        style="display: none;"
        onload="handleIframeLoad()"
        onerror="handleIframeError()">
    </iframe>

    <script>
        let retryCount = 0;
        const maxRetries = 3;
        
        function handleIframeLoad() {
            console.log('Webapp 加载成功');
            
            // 隐藏加载状态，显示iframe
            document.getElementById('loadingContainer').style.display = 'none';
            document.getElementById('errorContainer').style.display = 'none';
            document.getElementById('webappFrame').style.display = 'block';
            
            // 传递上下文信息到webapp
            setTimeout(() => {
                sendContextToWebapp();
            }, 1000);
        }
        
        function handleIframeError() {
            console.error('Webapp 加载失败');
            showError();
        }
        
        function showError() {
            document.getElementById('loadingContainer').style.display = 'none';
            document.getElementById('webappFrame').style.display = 'none';
            document.getElementById('errorContainer').style.display = 'flex';
        }
        
        function retryConnection() {
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`重试连接 webapp (${retryCount}/${maxRetries})`);
                
                // 重置状态
                document.getElementById('errorContainer').style.display = 'none';
                document.getElementById('loadingContainer').style.display = 'flex';
                
                // 重新加载iframe
                const iframe = document.getElementById('webappFrame');
                iframe.src = iframe.src + '?retry=' + retryCount;
            } else {
                alert('连接失败次数过多，请检查 webapp 服务是否正常运行');
            }
        }
        
        // 向webapp传递上下文信息
        function sendContextToWebapp() {
            const iframe = document.getElementById('webappFrame');
            if (iframe && iframe.contentWindow) {
                try {
                    // 获取父页面的上下文信息
                    const contextInfo = getContextInfo();
                    
                    // 发送消息到webapp
                    iframe.contentWindow.postMessage({
                        type: 'CONTEXT_UPDATE',
                        data: contextInfo
                    }, 'http://localhost:8440');
                    
                    console.log('上下文信息已发送到webapp:', contextInfo);
                } catch (error) {
                    console.warn('发送上下文信息失败:', error);
                }
            }
        }
        
        // 获取上下文信息
        function getContextInfo() {
            try {
                // 尝试从父窗口获取上下文信息
                if (window.parent && window.parent.getContextInfo) {
                    return window.parent.getContextInfo();
                }
                
                // 如果无法获取，返回默认信息
                return {
                    patientId: '',
                    patientName: '未知患者',
                    doctorName: '医生',
                    source: 'electron-app'
                };
            } catch (error) {
                console.warn('获取上下文信息失败:', error);
                return { source: 'electron-app' };
            }
        }
        
        // 监听来自webapp的消息
        window.addEventListener('message', function(event) {
            // 验证消息来源
            if (event.origin !== 'http://localhost:8440') {
                return;
            }
            
            console.log('收到webapp消息:', event.data);
            
            const { type, data } = event.data;
            
            switch (type) {
                case 'WEBAPP_READY':
                    console.log('Webapp 已准备就绪');
                    sendContextToWebapp();
                    break;
                    
                case 'NAVIGATE_REQUEST':
                    // webapp请求导航到其他页面
                    if (window.parent && window.parent.switchPage) {
                        window.parent.switchPage(data.page);
                    }
                    break;
                    
                case 'CONTEXT_REQUEST':
                    // webapp请求上下文信息
                    sendContextToWebapp();
                    break;
            }
        });
        
        // 页面卸载时的清理
        window.addEventListener('beforeunload', function() {
            console.log('Chat页面即将卸载');
        });
        
        // 检查webapp服务可用性
        function checkWebappService() {
            fetch('http://localhost:8440')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Service not available');
                    }
                    console.log('Webapp 服务可用');
                })
                .catch(error => {
                    console.error('Webapp 服务不可用:', error);
                    setTimeout(showError, 2000); // 2秒后显示错误
                });
        }
        
        // 初始检查
        setTimeout(checkWebappService, 1000);
        
        console.log('Chat页面已加载，正在连接webapp...');
    </script>
</body>
</html>
```

### 3. 配置webapp支持iframe嵌入

webapp 可能有 X-Frame-Options 限制，需要配置允许iframe嵌入：

```javascript
// 在webapp的开发服务器配置中添加
// 如果使用create-react-app，可以在public/index.html中添加：
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'self' file: app:;">
```

### 4. 启动脚本优化

创建自动启动脚本：

```powershell
# start-with-webapp.ps1
Write-Host "启动 Chat Copilot 完整应用..." -ForegroundColor Green

# 启动webapp
Write-Host "正在启动 webapp..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd webapp; yarn start" -WindowStyle Minimized

# 等待webapp启动
Write-Host "等待 webapp 启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 检查webapp是否启动成功
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8440" -TimeoutSec 5
    Write-Host "Webapp 启动成功!" -ForegroundColor Green
} catch {
    Write-Host "警告: Webapp 可能还未完全启动" -ForegroundColor Yellow
}

# 启动electron应用
Write-Host "正在启动 Electron 应用..." -ForegroundColor Yellow
cd electron-client
npm start
```

## 方案二：构建静态文件嵌入

### 1. 构建webapp

```bash
cd webapp
yarn build
```

### 2. 将构建文件复制到electron-client

```bash
# 将webapp/build内容复制到electron-client/webapp-build
cp -r webapp/build electron-client/webapp-build
```

### 3. 修改chat-page.html

```html
<iframe 
    id="webappFrame" 
    class="webapp-container" 
    src="webapp-build/index.html">
</iframe>
```

## 方案三：Electron集成 (高级)

### 1. 修改main.js

```javascript
// 在main.js中添加webapp的BrowserWindow
function createWebappWindow() {
    const webappWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    webappWindow.loadURL('http://localhost:8440');
    return webappWindow;
}
```

### 2. 使用webContents嵌入

```javascript
// 在chat页面中嵌入webapp的webContents
const { webContents } = require('electron');

function embedWebapp() {
    const webappContents = webContents.create({
        nodeIntegration: false,
        contextIsolation: true
    });
    
    webappContents.loadURL('http://localhost:8440');
    
    // 将webContents嵌入到指定容器
    document.getElementById('webapp-container').appendChild(webappContents.getOwnerBrowserWindow().getNativeWindowHandle());
}
```

## 推荐实施步骤

### ✅ 已完成的修改

1. **chat.html 重写** - 完全重写为 webapp iframe 嵌入方式
2. **自动启动脚本** - `start-with-webapp.ps1` 自动启动两个服务
3. **集成测试脚本** - `test-webapp-integration.ps1` 验证集成效果
4. **错误处理机制** - 优雅处理连接失败、重试逻辑
5. **上下文传递** - 实现患者信息等数据同步
6. **状态监控** - 实时显示连接状态和健康检查

### 🚀 使用方法

#### 快速启动
```powershell
# 在 electron-client 目录下运行
.\start-with-webapp.ps1
```

#### 测试集成
```powershell
# 验证集成是否正常工作
.\test-webapp-integration.ps1
```

#### 手动启动
```bash
# 终端1: 启动 webapp
cd webapp
yarn install
yarn start

# 终端2: 启动 electron
cd electron-client  
npm start
```

### 🔧 集成特性

1. **智能重试** - 自动检测webapp服务，支持3次重试
2. **状态指示** - 右上角状态指示器显示连接状态
3. **错误恢复** - 网络中断后自动恢复连接
4. **上下文同步** - 患者信息自动传递给webapp
5. **健康检查** - 每30秒检查webapp服务状态
6. **集成接口** - 提供 `ChatIntegration` API供外部调用

## 注意事项

1. **端口冲突** - 确保3000端口可用
2. **跨域问题** - 配置CORS策略
3. **性能考虑** - iframe可能有性能开销
4. **状态同步** - 确保上下文信息正确传递
5. **错误恢复** - 处理webapp服务中断情况 