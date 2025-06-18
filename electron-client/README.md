# 医疗AI助手 - Electron客户端

基于Electron开发的医疗AI助手桌面客户端，提供智能问诊、病情分析、检验解读等功能。

## 🚀 功能特性

### 🖥️ 桌面悬浮图标
- ✅ 始终置顶的桌面悬浮机器人图标
- ✅ 可拖拽移动到任意位置
- ✅ 右键菜单快速操作
- ✅ 状态指示器（在线/忙碌/离线）
- ✅ 点击打开主窗口

### 📱 窗口管理
- ✅ 紧凑模式：只显示导航栏（120px高度）
- ✅ 完整模式：显示完整功能界面（800px高度）
- ✅ 智能窗口切换和状态保持
- ✅ 系统托盘集成

### 🏥 医疗功能模块
- 💬 **智能问诊**：AI辅助问诊对话
- 🔍 **病情分析**：症状分析和诊断建议
- 📋 **检验解读**：自动解读检验报告
- 📝 **病历生成**：智能生成规范病历
- ✅ **病历质控**：病历质量检查
- 📁 **文档管理**：医疗文档统一管理

### 🔌 第三方系统集成
- 🌐 **HTTP API接口**：支持第三方系统调用
- 📡 **实时通信**：WebSocket支持
- 🔄 **参数传递**：支持Tab切换时传递参数
- 📊 **状态同步**：实时状态更新

## 📁 项目结构

```
electron-client/
├── main.js                 # Electron主进程
├── preload.js             # 预加载脚本
├── package.json           # 项目配置
├── README.md              # 项目文档
├── pages/                 # 页面文件
│   ├── floating-icon.html # 悬浮图标页面
│   ├── navigation.html    # 导航栏页面（紧凑模式）
│   ├── chat-page.html     # 智能问诊页面
│   ├── diagnosis.html     # 病情分析页面
│   ├── report.html        # 检验解读页面
│   ├── record.html        # 病历生成页面
│   ├── quality.html       # 病历质控页面
│   └── documents.html     # 文档管理页面
└── assets/                # 资源文件
    ├── icon.png          # 应用图标
    ├── icon.ico          # Windows图标
    ├── icon.icns         # macOS图标
    └── tray-icon.png     # 托盘图标
```

## 🛠️ 开发环境

### 系统要求
- Node.js 16.0+
- npm 或 yarn
- Windows 10+ / macOS 10.15+ / Ubuntu 18.04+

### 安装依赖
```bash
cd electron-client
npm install
```

### 开发运行
```bash
npm start
# 或开发模式
npm run dev
```

### 构建打包
```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

## 🔧 配置说明

### 应用配置
```javascript
const APP_CONFIG = {
    compactSize: { width: 1200, height: 120 },  // 紧凑模式尺寸
    fullSize: { width: 1200, height: 800 },     // 完整模式尺寸
    httpPort: 3000                              // HTTP服务端口
};
```

### 悬浮图标位置
- 默认位置：屏幕右上角
- 可拖拽到任意位置
- 位置会自动保存

## 🌐 API接口

### HTTP接口

#### 切换Tab
```http
POST http://localhost:8440/api/switch-tab
Content-Type: application/json

{
  "tabName": "chat",
  "windowMode": "full",
  "params": {
    "patientId": "12345",
    "action": "newConsult"
  }
}
```

#### 获取状态
```http
GET http://localhost:8440/api/status
```

#### 控制窗口
```http
POST http://localhost:8440/api/window/toggle
```

### JavaScript接口

#### 主窗口控制
```javascript
// 切换Tab
MedicalAI.switchToTab('diagnosis', { patientId: '12345' });

// 获取当前Tab
MedicalAI.getCurrentTab();

// 切换紧凑模式
MedicalAI.toggleSidebar(true);
```

#### 悬浮图标控制
```javascript
// 更新状态
FloatingIcon.updateStatus('busy');

// 设置位置
FloatingIcon.setPosition(200, 100);

// 显示/隐藏
FloatingIcon.show();
FloatingIcon.hide();
```

## 🎯 使用场景

### 1. 独立桌面应用
- 医生日常工作助手
- 快速问诊和诊断
- 病历管理和质控

### 2. HIS系统集成
- 通过HTTP接口调用
- 嵌入现有医疗系统
- 数据互通和同步

### 3. 移动办公
- 轻量级悬浮图标
- 快速访问常用功能
- 不干扰其他工作

## 🔒 安全特性

- ✅ 上下文隔离（Context Isolation）
- ✅ 预加载脚本安全API
- ✅ 本地HTTP服务（仅localhost）
- ✅ 防止多实例运行
- ✅ 安全的IPC通信

## 📝 开发说明

### 添加新页面
1. 在 `pages/` 目录创建HTML文件
2. 在 `main.js` 的 `loadPage()` 函数添加路由
3. 在导航栏添加对应Tab

### 自定义样式
- 所有页面使用统一的设计语言
- 主色调：#0078d4（Microsoft Blue）
- 响应式设计，支持不同窗口尺寸

### 调试技巧
```bash
# 开启开发者工具
npm run dev

# 查看日志
console.log() 输出会显示在终端
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 📞 技术支持

- 📧 邮箱：support@medical-ai.com
- 🐛 问题反馈：GitHub Issues
- 📖 文档：项目Wiki

---

**医疗AI助手** - 让医疗工作更智能、更高效！ 