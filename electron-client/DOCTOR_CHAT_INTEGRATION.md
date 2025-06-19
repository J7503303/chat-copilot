# 医生聊天界面集成说明

## 概述

本文档说明如何将独立的医生聊天界面集成到electron-client项目中，实现参数传递和上下文同步。

## 集成架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Third-party   │    │  Electron-client │    │     Webapp      │
│     System      │───▶│   (main.js)      │───▶│  (React App)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   chat.html      │    │ DoctorChatApp   │
                       │   (iframe)       │───▶│   Component     │
                       └──────────────────┘    └─────────────────┘
```

## 修改内容

### 1. Electron-client 修改

#### 1.1 chat.html 修改
- 修改iframe URL构建逻辑，支持动态参数传递
- 添加导航参数监听器
- 实现参数更新时的URL重新加载

#### 1.2 参数传递机制
通过以下方式传递参数：
- URL查询参数
- IPC消息 (`navigation-params`)
- PostMessage通信

### 2. Webapp 修改

#### 2.1 新增doctor-chat.html
创建专门的医生聊天页面入口：
```html
http://localhost:8440/doctor-chat.html?doctor_id=xxx&doctor_name=xxx&...
```

#### 2.2 DoctorChatApp.tsx 修改
- 支持从`window.DOCTOR_PARAMS`读取参数
- 监听来自父窗口的参数更新
- 实现参数变化时的自动重新初始化

## 使用方法

### 1. 启动服务

```bash
# 启动webapp服务
cd webapp
npm start

# 启动electron应用
cd electron-client
npm run electron
```

### 2. API调用方式

#### 2.1 HTTP API调用
```bash
GET http://localhost:19876/api/v1/navigate?page=chat&doctor_id=test001&doctor_name=张医生&dept_name=内科&patient_name=李患者
```

#### 2.2 直接浏览器访问
```bash
http://localhost:8440/doctor-chat.html?doctor_id=test001&doctor_name=张医生&dept_name=内科&patient_name=李患者
```

### 3. 参数说明

| 参数名 | 说明 | 必填 | 示例 |
|--------|------|------|------|
| doctor_id | 医生ID | ✅ | test001 |
| doctor_code | 医生编码 | ❌ | DOC001 |
| doctor_name | 医生姓名 | ❌ | 张医生 |
| dept_id | 科室ID | ❌ | dept001 |
| dept_code | 科室编码 | ❌ | DEPT001 |
| dept_name | 科室名称 | ❌ | 内科 |
| patient_id | 患者ID | ❌ | patient001 |
| patient_name | 患者姓名 | ❌ | 李患者 |
| patient_bed | 床位号 | ❌ | 101 |
| patient_sex | 患者性别 | ❌ | 男 |
| patient_age | 患者年龄 | ❌ | 45 |

## 测试方法

### 1. 运行集成测试脚本
```powershell
# 基本集成测试
.\test-doctor-chat-integration.ps1 -DoctorId "test001" -DoctorName "张医生" -DeptName "内科" -PatientName "李患者"

# 医生切换功能测试
.\test-doctor-switch.ps1
```

### 2. 手动测试步骤

1. **启动webapp服务**
   ```bash
   cd webapp && npm start
   ```

2. **测试独立访问**
   ```bash
   http://localhost:8440/doctor-chat.html?doctor_id=test001&doctor_name=张医生
   ```

3. **启动electron应用**
   ```bash
   cd electron-client && npm run electron
   ```

4. **测试API调用**
   ```bash
   curl "http://localhost:19876/api/v1/navigate?page=chat&doctor_id=test001&doctor_name=张医生"
   ```

## 技术细节

### 1. 参数传递流程

```
1. 第三方系统调用API
   ↓
2. electron-client接收参数
   ↓
3. 通过IPC发送navigation-params事件
   ↓
4. chat.html监听事件并更新iframe URL
   ↓
5. webapp加载doctor-chat.html
   ↓
6. DoctorChatApp组件读取参数并初始化
```

### 2. 消息通信机制

#### 2.1 IPC消息 (electron内部)
```javascript
// 主进程发送
mainWindow.webContents.send('navigation-params', params);

// 渲染进程接收
window.electronAPI.onNavigationParams((params) => {
    // 处理参数
});
```

#### 2.2 PostMessage (iframe通信)
```javascript
// 父窗口发送
iframe.contentWindow.postMessage({
    type: 'CONTEXT_UPDATE',
    data: contextInfo
}, 'http://localhost:8440');

// 子窗口接收
window.addEventListener('message', (event) => {
    if (event.data.type === 'CONTEXT_UPDATE') {
        // 处理上下文更新
    }
});
```

### 3. 错误处理

- **webapp服务未启动**: 显示错误页面，提供重试和启动按钮
- **参数缺失**: 使用默认值或显示错误提示
- **连接超时**: 自动重试机制 (最多3次)
- **SignalR错误**: 增强的错误处理和null检查

## 故障排除

### 1. 常见问题

#### Q: iframe显示空白页面
A: 检查webapp服务是否正常运行，端口是否为8440

#### Q: 参数没有传递到医生聊天界面
A: 检查URL参数格式，确保doctor_id参数存在

#### Q: SignalR连接错误
A: 检查后端webapi服务是否运行，端口是否为40443

### 2. 调试方法

1. **开启开发者工具**
   - 在electron应用中按F12
   - 查看Console和Network标签

2. **检查日志输出**
   ```javascript
   // 在浏览器控制台查看
   console.log('医生聊天模式参数:', window.DOCTOR_PARAMS);
   ```

3. **验证服务状态**
   ```bash
   # 检查webapp服务
   curl http://localhost:8440
   
   # 检查webapi服务
   curl http://localhost:40443
   
   # 检查electron HTTP服务
   curl http://localhost:19876/api/status
   ```

## 性能优化

### 1. 资源加载优化
- 使用iframe预加载机制
- 实现服务健康检查
- 添加连接超时和重试逻辑

### 2. 内存管理
- 及时清理事件监听器
- 避免内存泄漏
- 合理管理SignalR连接

## 安全考虑

### 1. 跨域安全
- 验证PostMessage来源
- 限制iframe访问权限
- 使用HTTPS (生产环境)

### 2. 参数验证
- 对所有输入参数进行验证
- 防止XSS攻击
- 敏感信息加密传输

## 部署说明

### 1. 开发环境
- webapp: http://localhost:8440
- webapi: http://localhost:40443
- electron HTTP: http://localhost:19876

### 2. 生产环境
- 修改相应的URL配置
- 配置HTTPS证书
- 设置防火墙规则

## 版本兼容性

- Node.js: >= 16.0.0
- Electron: >= 20.0.0
- React: >= 18.0.0
- 浏览器: Chrome >= 90, Firefox >= 88, Edge >= 90

## 更新日志

### v1.1.0 (2025-06-19)
- ✅ **修复医生ID问题**：医生聊天界面现在正确使用传入的医生ID作为用户ID
- ✅ **医生切换功能**：支持动态切换医生，每个医生有独立的聊天历史
- ✅ **用户隔离增强**：确保不同医生之间的聊天记录完全隔离
- ✅ **历史记录验证**：加载聊天历史时验证医生ID匹配，防止数据混乱
- ✅ **智能状态管理**：医生ID改变时自动清除当前状态并加载对应历史
- ✅ **详细日志记录**：添加完整的调试日志，便于问题排查
- ✅ **测试脚本**：提供医生切换功能的专用测试脚本

### v1.0.0 (2025-06-19)
- ✅ 实现基本的医生聊天界面集成
- ✅ 支持参数传递和上下文同步
- ✅ 添加错误处理和重试机制
- ✅ 修复SignalR null值错误
- ✅ 实现实时消息推送和多轮对话
- ✅ 添加聊天历史保存功能 