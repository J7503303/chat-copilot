# Chat Copilot - 医生聊天模式使用指南

## 概述
Chat Copilot 现在支持医生聊天模式，提供用户隔离的聊天界面。通过URL参数可以自动切换到医生专用界面。

## ✅ 最新功能更新 (v2.3)

### 🔐 身份验证修复
- **修复身份验证流程**：解决了医生聊天模式无法正常连接WebAPI后台的问题
- **用户信息管理**：确保医生模式下正确设置activeUserInfo状态
- **Redux状态集成**：医生聊天界面现在正确使用Redux状态管理
- **访问令牌获取**：修复了获取访问令牌的问题，确保API调用正常工作

### 🧠 智能医学回复系统
- **真实AI回复**：通过后端API获得真正的大模型回复
- **医学上下文**：自动添加医生信息、科室、患者信息到聊天上下文
- **专业回复**：针对医学场景优化的AI回复
- **智能降级**：API不可用时自动切换到离线模式

### 💾 聊天历史持久化
- **自动保存**：聊天记录自动保存到浏览器本地存储
- **24小时有效**：聊天历史在24小时内有效，刷新页面不会丢失
- **用户隔离**：每个医生ID的聊天记录完全独立
- **手动清除**：提供"清除记录"按钮，可手动清空聊天历史

### 🎨 界面优化
- **医生专用配色**：使用紫色主题区分医生模式
- **AI医疗助手**：明确标识为"AI医疗助手"
- **专业提示语**：针对医学场景优化的输入提示
- **状态指示**：显示在线/离线模式状态

## ✅ 关键修复 (v2.3)

### 🔧 身份验证问题修复
**问题描述**：新的医生聊天界面无法正常连接WebAPI后台，API调用失败

**根本原因**：
1. 医生聊天模式绕过了正常的身份验证流程
2. 缺少活跃用户信息（activeUserInfo）设置
3. 没有正确使用Redux状态管理

**解决方案**：
1. **修改 DoctorChatApp.tsx**：
   - 导入Redux状态管理hooks
   - 添加身份验证状态检查
   - 确保设置activeUserInfo后再进行API调用

2. **修改 App.tsx**：
   - 在医生模式下也设置用户信息
   - 确保身份验证状态正确传递

3. **API调用优化**：
   - 在callChatAPI前检查activeUserInfo
   - 添加详细的错误处理和日志记录

### 🔍 技术细节
```typescript
// 确保有活跃用户信息
if (!activeUserInfo) {
    throw new Error('用户信息未设置，请重新登录');
}

// 正确的身份验证流程
const account = instance.getActiveAccount();
if (account) {
    dispatch(setActiveUserInfo({
        id: `${account.localAccountId}.${account.tenantId}`,
        email: account.username,
        username: account.name ?? account.username,
    }));
}
```

## 使用方法

### 标准聊天模式
```
http://localhost:8440/
```

### 医生聊天模式
```
http://localhost:8440/?doctor_id=123&doctor_name=张医生&dept_name=心内科&patient_name=李患者
```

### 支持的URL参数
- `doctor_id` 或 `userId` - 医生ID（必需）
- `doctor_name` 或 `userName` - 医生姓名
- `dept_name` - 科室名称
- `patient_name` - 患者姓名
- `mode=doctor` - 强制启用医生模式

## 🔧 技术架构升级

### API调用流程
```typescript
// 1. 检查身份验证状态
if (!activeUserInfo) {
    throw new Error('用户信息未设置，请重新登录');
}

// 2. 创建聊天会话
const result = await chatService.createChatAsync(chatTitle, accessToken);

// 3. 构建包含医生信息的Ask对象
const ask: IAsk = {
    input: message,
    variables: [
        { key: 'chatId', value: session.id },
        { key: 'messageType', value: ChatMessageType.Message.toString() },
        { key: 'doctorId', value: doctorInfo.id },
        { key: 'doctorName', value: doctorInfo.name },
        { key: 'department', value: doctorInfo.dept },
        { key: 'currentPatient', value: doctorInfo.patient }
    ]
};

// 4. 调用真实API
const result = await chatService.getBotResponseAsync(ask, accessToken);
```

### 身份验证集成
- 使用Redux状态管理确保用户信息正确设置
- 自动处理MSAL身份验证流程
- 支持Azure AD身份验证
- 自动处理token刷新

### 错误处理机制
- API调用失败时自动降级到离线模式
- 详细的错误日志和用户提示
- 优雅的错误恢复
- 身份验证状态检查

## 🔬 智能回复特性

### 在线模式（真实API）
当后端API可用时：
- 使用真正的大模型（GPT/DeepSeek等）生成回复
- 支持完整的语义理解和上下文记忆
- 医生信息自动添加到聊天上下文
- 支持复杂的医学推理和建议

### 离线模式（智能模拟）
当API不可用时：
- 医学关键词自动识别
- 基于规则的专业医学回复
- 症状、诊断、治疗、检查等专业建议
- 保持基本的医学咨询功能

### 上下文信息
系统会自动将以下信息添加到聊天上下文：
- 医生ID和姓名
- 所属科室
- 当前患者信息
- 聊天会话历史

## 💾 数据管理

### 本地存储结构
```json
{
    "doctorInfo": {
        "id": "123",
        "name": "张医生",
        "dept": "心内科",
        "patient": "李患者"
    },
    "messages": [
        {
            "id": "msg-1",
            "content": "消息内容",
            "isBot": false,
            "timestamp": 1704067200000,
            "type": "Message",
            "authorRole": "User"
        }
    ],
    "chatSession": {
        "id": "chat-session-id",
        "title": "张医生 - 医生聊天 @ 2024/1/1",
        "systemDescription": "",
        "memoryBalance": 0.5,
        "enabledPlugins": []
    },
    "timestamp": 1704067200000
}
```

### 会话管理
- 每个医生创建独立的聊天会话
- 会话ID格式：`doctor-{doctorId}-{timestamp}`
- 支持会话恢复和历史记录

## 🚀 性能特点

| 功能 | 在线模式 | 离线模式 |
|------|----------|----------|
| API调用 | ✅ 真实后端API | ❌ 本地模拟 |
| 回复质量 | ✅ 大模型智能回复 | ⚠️ 规则模拟回复 |
| 上下文记忆 | ✅ 完整支持 | ❌ 限制支持 |
| 复杂推理 | ✅ 支持 | ❌ 不支持 |
| 响应速度 | ⚠️ 依赖网络 | ✅ 快速响应 |
| 离线可用 | ❌ 需要网络 | ✅ 完全离线 |

## 集成方式

### Electron客户端集成
在electron-client中修改iframe的src：
```javascript
const doctorInfo = {
    doctor_id: "123",
    doctor_name: "张医生",
    dept_name: "心内科",
    patient_name: "李患者"
};

const params = new URLSearchParams(doctorInfo);
const webappUrl = `http://localhost:8440/?${params.toString()}`;

// 设置iframe的src
document.getElementById('chatFrame').src = webappUrl;
```

### 后端配置要求
1. **Chat Copilot WebAPI**必须正在运行
2. **Azure AD身份验证**正确配置
3. **CORS设置**允许前端域名
4. **大模型服务**（GPT/DeepSeek等）正常工作

## 🛠️ 故障排除

### 如何检查API调用状态

1. **打开浏览器开发者工具**
   - 按F12或右键选择"检查"
   - 切换到"Console"面板

2. **查看调试信息**
   - 🔄 设置活跃用户信息... - 正在设置身份验证
   - ✅ 医生模式：用户信息设置完成 - 身份验证成功
   - 🔄 开始创建聊天会话... - 正在初始化
   - ✅ 获取访问令牌成功 - 身份验证成功
   - 📤 发送创建会话请求... - 正在创建会话
   - 📥 创建会话响应 - 会话创建成功
   - 🔄 开始调用真实API... - 正在发送消息
   - ✅ 成功获取API回复 - API调用成功
   - ❌ API调用失败 - API调用失败，查看错误详情
   - 🔄 切换到离线模式 - 使用模拟回复

3. **状态指示**
   - **在线模式**：欢迎消息显示"🔗 已连接到后端API"
   - **离线模式**：欢迎消息显示"⚠️ 当前使用离线模式"

### 常见问题及解决方案

1. **显示"用户信息未设置，请重新登录"**
   - **原因**：身份验证状态未正确设置
   - **解决**：刷新页面或重新登录应用
   - **检查**：确认浏览器控制台显示"✅ 医生模式：用户信息设置完成"

2. **显示离线模式**
   - **原因**：WebAPI服务未运行或网络连接问题
   - **解决**：检查WebAPI服务是否运行在正确端口
   - **验证**：访问 http://localhost:40443/healthz 检查API状态

3. **无法创建会话**
   - **原因**：身份验证失败或后端数据库连接问题
   - **解决**：确认用户有权限创建聊天
   - **检查**：验证API访问令牌有效性

4. **收到模拟回复而非真实AI回复**
   - **原因**：API调用失败，自动降级到离线模式
   - **解决**：检查控制台是否显示"❌ API调用失败"
   - **验证**：确认大模型服务配置正确

5. **身份验证失败**
   - **原因**：Azure AD配置问题或token过期
   - **解决**：重新登录应用或检查Azure AD配置
   - **验证**：确认token获取成功

### 调试步骤

1. **检查WebAPI服务**
   ```bash
   # 确认WebAPI在运行
   curl http://localhost:40443/healthz
   ```

2. **检查网络连接**
   - 在Network面板查看HTTP请求
   - 确认请求URL和响应状态码
   - 检查CORS设置

3. **验证身份验证**
   - 在Console中查看用户信息设置日志
   - 确认访问令牌获取成功
   - 检查activeUserInfo状态

### 调试信息
打开浏览器开发者工具查看：
- Console日志中的API调用信息
- Network面板中的HTTP请求
- Redux DevTools中的状态变化
- 错误信息和堆栈跟踪

## 🚀 下一步计划

1. **增强功能**
   - 添加文件上传支持
   - 集成医学图像分析
   - 支持语音输入输出

2. **性能优化**
   - 实现请求缓存
   - 优化API调用频率
   - 改进错误重试机制

3. **用户体验**
   - 添加打字指示器
   - 支持消息编辑
   - 改进移动端体验

---
最后更新：2024年1月15日  
版本：v2.3 - 身份验证修复版  
状态：✅ 完整功能已实现，WebAPI连接问题已修复 