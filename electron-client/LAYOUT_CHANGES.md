# Electron应用界面布局修改说明

## 修改概览

根据需求对医疗AI助手Electron应用进行了界面重新设计，实现了现代化的右侧导航栏布局。

## 主要修改

### 1. 主窗口配置修改 (`main.js`)

- **去除边框**: 设置 `frame: false` 和 `titleBarStyle: 'hidden'`
- **固定尺寸**: 宽度固定为540px，高度适应屏幕分辨率（屏幕高度-80px）
- **窗口位置**: 默认位置在屏幕右侧贴边显示
- **禁用调整大小**: 设置 `resizable: false` 维持固定布局
- **自定义窗口控制**: 通过自定义按钮实现最小化、关闭、置顶功能

### 2. 新增IPC通信接口

新增以下IPC处理器支持窗口控制：
- `window-minimize`: 最小化窗口
- `window-close`: 关闭窗口  
- `window-pin`: 切换窗口置顶状态
- `toggle-sidebar`: 折叠/展开主内容区域

### 3. 创建新主界面 (`pages/main-layout.html`)

#### 布局结构
- **左侧主内容区**: 宽度480px，使用iframe加载具体功能页面
- **右侧导航栏**: 宽度60px，深色主题设计

#### 导航栏三部分设计

**顶部控制区域** (固定顶部):
- 3个窗口控制按钮（置顶、最小化、关闭）
- Logo区域（50x50px医院图标）
- "AI助手"文本标签

**中间导航区域** (可拉伸):
- 5个功能导航按钮（50x50px）：
  - 🔍 病情分析
  - 📝 病历生成  
  - ✅ 病历质控
  - 📋 报告解读
  - 💬 聊天助手
- 鼠标悬停显示tooltip提示
- 激活状态高亮显示

**底部信息区域** (固定底部):
- 患者基本信息显示（科室、姓名、性别年龄、ID）
- 折叠/展开按钮

#### 交互功能
- **窗口拖拽**: 顶部30px区域支持拖拽移动窗口
- **导航切换**: 点击导航按钮切换iframe内容
- **折叠功能**: 点击折叠按钮隐藏主内容区，仅显示导航栏
- **置顶功能**: 支持窗口置顶显示

### 4. 样式设计特色

- **深色导航栏**: 使用`#2c3e50`背景色，现代感设计
- **响应式交互**: 按钮悬停效果和过渡动画
- **层次分明**: 三个区域通过边框线分隔，视觉清晰
- **紧凑布局**: 60px宽度内合理安排所有功能元素

## 文件变更清单

### 修改的文件
- `main.js`: 主进程逻辑修改
- `preload.js`: 新增IPC接口暴露

### 新增的文件  
- `pages/main-layout.html`: 新主界面布局

## 使用说明

1. 启动应用: `npm start`
2. 窗口将在屏幕右侧显示
3. 使用右侧导航栏进行功能切换
4. 点击折叠按钮可隐藏主内容区域
5. 窗口控制通过右侧导航栏顶部按钮操作

## 技术特点

- **无边框设计**: 现代化界面体验
- **模块化布局**: iframe方式加载功能页面
- **响应式设计**: 适应不同屏幕分辨率
- **可扩展架构**: 便于后续功能添加

## 兼容性说明

- 保留了原有的托盘菜单功能
- 保持了原有的页面切换接口
- 向下兼容现有的功能页面 