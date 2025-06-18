# HTTP服务配置说明

## 服务概述
该Electron应用集成了Express HTTP服务器，用于提供API接口供第三方系统调用。

## 端口配置

### 默认端口: 19876
- 配置位置: `main.js` 第16行 `APP_CONFIG.httpPort`
- 监听地址: `localhost` (只允许本地访问)
- 备用端口: [19877, 19878, 19879, 19880]

### 修改端口方法
1. 打开 `main.js` 文件
2. 找到第16行的 `APP_CONFIG` 配置对象
3. 修改 `httpPort` 的值为您想要的端口号
4. 重启应用程序

```javascript
const APP_CONFIG = {
    compactSize: { width: 60, height: 800 },
    fullSize: { width: 540, height: 800 },
    httpPort: 19876 // 在这里修改端口号
};
```

## 可用API接口

### 1. 切换标签页
- **URL**: `POST /api/switch-tab`
- **参数**:
  ```json
  {
      "tabName": "chat|diagnosis|report|record|quality|documents",
      "params": {},
      "windowMode": "compact|full"
  }
  ```

### 2. 获取当前状态
- **URL**: `GET /api/status`
- **响应**:
  ```json
  {
      "currentTab": "chat",
      "windowMode": "compact|full",
      "isVisible": true
  }
  ```

### 3. 切换窗口显示/隐藏
- **URL**: `POST /api/window/toggle`
- **响应**:
  ```json
  {
      "success": true,
      "isVisible": true
  }
  ```

## 错误处理

### 端口被占用处理
应用程序会自动尝试以下端口序列：
1. 19876 (默认)
2. 19877
3. 19878
4. 19879
5. 19880

如果所有端口都不可用，HTTP服务将启动失败，但不会影响Electron窗口功能。

### 常见错误解决
- `EADDRINUSE`: 端口被占用 → 自动尝试备用端口
- `EACCES`: 权限被拒绝 → 自动尝试备用端口
- 其他错误会在控制台输出详细信息

## 服务状态检查
启动应用后，在控制台可以看到：
```
医疗AI助手HTTP服务已启动: http://localhost:19876
```

## 安全说明
- HTTP服务只监听 `localhost`，外部网络无法访问
- 未实现身份验证，仅适用于本地应用集成
- 如需外部访问，请添加适当的安全机制 