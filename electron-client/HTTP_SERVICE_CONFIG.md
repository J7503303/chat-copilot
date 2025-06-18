# HTTP服务配置说明

## 服务概述
该Electron应用集成了Express HTTP服务器，用于提供API接口供第三方系统调用。

## 窗口配置

### 屏幕高度自适应
应用程序会自动适应屏幕高度，窗口高度计算公式：
```
窗口高度 = 屏幕高度 - marginTop - marginBottom
```

- **marginTop**: 距离屏幕顶部的边距 (默认40px)
- **marginBottom**: 距离屏幕底部的边距 (默认40px)
- 支持不同分辨率的屏幕
- 窗口切换和调整时自动重新计算

### 屏幕空间充分利用
为了最大化屏幕空间利用率，应用程序使用以下策略：

```javascript
// 使用完整屏幕尺寸而非工作区尺寸
const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

// 边距设置为0，充分利用屏幕高度
const APP_CONFIG = {
    marginTop: 0,     // 贴近屏幕顶部
    marginBottom: 0   // 贴近屏幕底部
};
```

**优化效果**:
- 窗口高度几乎等于屏幕高度
- 不受任务栏等系统UI限制
- 适配各种分辨率和DPI设置
- 最大化可视区域利用率

### 自定义边距
如需调整窗口与屏幕边缘的距离，可修改配置：
```javascript
const APP_CONFIG = {
    marginTop: 60,    // 增大顶部边距
    marginBottom: 20  // 减小底部边距
};
```

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
    compactSize: { width: 60 },
    fullSize: { width: 540 },
    httpPort: 19876, // 在这里修改端口号
    marginTop: 40,    // 距离屏幕顶部的边距
    marginBottom: 40  // 距离屏幕底部的边距
};
```

## 可用API接口

### 1. 统一导航接口 (推荐使用)
- **URL**: `GET /api/v1/navigate`
- **说明**: 通过GET请求进行页面切换和参数传递
- **参数**:
  - `page`: 页面名称 (可选)
    - `chat` - 智能问诊
    - `diagnosis` - 病情分析
    - `report` - 检验解读
    - `record` - 病历生成
    - `quality` - 病历质控
    - `documents` - 文档管理
  - `doctor_id`: 医生ID
  - `doctor_code`: 医生编码
  - `doctor_name`: 医生姓名
  - `dept_id`: 科室ID
  - `dept_code`: 科室编码
  - `dept_name`: 科室名称
  - `patient_id`: 患者ID
  - `patient_name`: 患者姓名
  - `patient_bed`: 床位号
  - `patient_sex`: 患者性别
  - `patient_age`: 患者年龄
  - `window_mode`: 窗口模式 (compact|full)

- **示例调用**:
  ```
  http://localhost:19876/api/v1/navigate?page=chat&doctor_id=D001&doctor_name=张医生&dept_name=内科&patient_id=P001&patient_name=李患者&patient_bed=101&patient_sex=男&patient_age=45
  ```

- **响应**:
  ```json
  {
      "success": true,
      "message": "已切换到智能问诊"
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

## 测试HTTP服务

### 方法1: 浏览器测试
直接在浏览器地址栏输入以下URL进行测试：

**基本状态检查:**
```
http://localhost:19876/api/status
```

**导航接口测试:**
```
http://localhost:19876/api/v1/navigate?page=chat&doctor_name=测试医生&patient_name=测试患者
```

### 方法2: PowerShell测试
```powershell
# 检查服务状态
Invoke-WebRequest -Uri "http://localhost:19876/api/status" -Method GET

# 测试导航接口
Invoke-WebRequest -Uri "http://localhost:19876/api/v1/navigate?page=diagnosis&doctor_id=D001&patient_name=张三" -Method GET
```

### 方法3: curl测试 (如果安装了curl)
```bash
# 检查服务状态
curl "http://localhost:19876/api/status"

# 测试导航接口
curl "http://localhost:19876/api/v1/navigate?page=report&doctor_name=李医生&patient_id=P001"
```

## 参数使用说明

### 必需参数
- 无必需参数，所有参数都是可选的

### 常用参数组合

**医生信息:**
- `doctor_id` + `doctor_name`
- `doctor_code` + `doctor_name`

**科室信息:**
- `dept_id` + `dept_name`
- `dept_code` + `dept_name`

**患者信息:**
- `patient_id` + `patient_name`
- `patient_name` + `patient_bed` + `patient_sex` + `patient_age`

### URL编码说明
如果参数包含中文或特殊字符，需要进行URL编码：
- 空格: `%20`
- 中文: 使用UTF-8编码

**示例:**
```
# 原始URL
http://localhost:19876/api/v1/navigate?doctor_name=张医生&patient_name=李患者

# URL编码后
http://localhost:19876/api/v1/navigate?doctor_name=%E5%BC%A0%E5%8C%BB%E7%94%9F&patient_name=%E6%9D%8E%E6%82%A3%E8%80%85
```

## 窗口置顶功能

### 自动置顶机制
- API调用时窗口会自动临时置顶（3秒）
- 利用现有Logo置顶功能，确保兼容性
- 智能检测当前置顶状态，避免重复操作
- 3秒后自动取消置顶，不影响用户设置

### 智能处理
- 兼容用户手动设置的置顶状态
- 自动恢复最小化的窗口
- 支持从任何状态激活窗口
- 与界面Logo置顶按钮完全兼容

### 测试置顶功能
运行测试脚本验证窗口置顶效果：
```powershell
.\test-window-focus.ps1
```

## 安全说明
- HTTP服务只监听 `localhost`，外部网络无法访问
- 未实现身份验证，仅适用于本地应用集成
- 如需外部访问，请添加适当的安全机制 