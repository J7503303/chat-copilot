# API 使用示例

## 基本使用方法

### 1. 启动应用程序
```bash
cd electron-client
npm start
```

### 2. 验证服务状态
在浏览器中访问：
```
http://localhost:19876/api/status
```

## 实际使用场景

### 场景1: HIS系统集成
从医院信息系统(HIS)跳转到AI助手：

```javascript
// JavaScript示例
function openAIAssistant(doctorInfo, patientInfo) {
    const baseUrl = 'http://localhost:19876/api/v1/navigate';
    const params = new URLSearchParams({
        page: 'chat',
        doctor_id: doctorInfo.id,
        doctor_name: doctorInfo.name,
        dept_name: doctorInfo.department,
        patient_id: patientInfo.id,
        patient_name: patientInfo.name,
        patient_bed: patientInfo.bedNumber,
        patient_sex: patientInfo.gender,
        patient_age: patientInfo.age
    });
    
    // 发起请求
    fetch(`${baseUrl}?${params}`)
        .then(response => response.json())
        .then(data => {
            console.log('AI助手已启动:', data.message);
        })
        .catch(error => {
            console.error('启动失败:', error);
        });
}

// 调用示例
openAIAssistant(
    {
        id: 'D001',
        name: '张医生',
        department: '内科'
    },
    {
        id: 'P001',
        name: '李患者',
        bedNumber: '101',
        gender: '男',
        age: '45'
    }
);
```

### 场景2: 电子病历系统集成
从电子病历系统直接打开病历质控页面：

```html
<!-- HTML超链接示例 -->
<a href="http://localhost:19876/api/v1/navigate?page=quality&doctor_name=王医生&patient_id=P002&patient_name=赵患者" 
   target="_blank">
   打开AI病历质控
</a>
```

### 场景3: 检验系统集成
从检验系统打开检验解读页面：

```python
# Python示例
import requests
import urllib.parse

def open_report_analysis(doctor_info, patient_info, report_info):
    base_url = "http://localhost:19876/api/v1/navigate"
    
    params = {
        'page': 'report',
        'doctor_id': doctor_info['id'],
        'doctor_name': doctor_info['name'],
        'patient_id': patient_info['id'],
        'patient_name': patient_info['name'],
        'patient_bed': patient_info.get('bed', ''),
        'window_mode': 'full'
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=5)
        result = response.json()
        
        if result['success']:
            print(f"成功打开检验解读页面: {result['message']}")
            return True
        else:
            print(f"打开失败: {result.get('error', '未知错误')}")
            return False
            
    except Exception as e:
        print(f"请求失败: {str(e)}")
        return False

# 使用示例
doctor = {'id': 'D003', 'name': '李医生'}
patient = {'id': 'P003', 'name': '王患者', 'bed': '201'}
report = {'type': 'blood_test', 'date': '2024-01-15'}

open_report_analysis(doctor, patient, report)
```

### 场景4: C# WinForm 集成
在C# Windows应用程序中调用：

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;

public class AIAssistantClient
{
    private readonly HttpClient httpClient;
    private readonly string baseUrl = "http://localhost:19876";

    public AIAssistantClient()
    {
        httpClient = new HttpClient();
    }

    public async Task<bool> NavigateToPageAsync(string page, 
        string doctorId = null, string doctorName = null,
        string patientId = null, string patientName = null,
        string patientBed = null, string patientSex = null, string patientAge = null)
    {
        try
        {
            var queryParams = HttpUtility.ParseQueryString(string.Empty);
            
            if (!string.IsNullOrEmpty(page)) queryParams["page"] = page;
            if (!string.IsNullOrEmpty(doctorId)) queryParams["doctor_id"] = doctorId;
            if (!string.IsNullOrEmpty(doctorName)) queryParams["doctor_name"] = doctorName;
            if (!string.IsNullOrEmpty(patientId)) queryParams["patient_id"] = patientId;
            if (!string.IsNullOrEmpty(patientName)) queryParams["patient_name"] = patientName;
            if (!string.IsNullOrEmpty(patientBed)) queryParams["patient_bed"] = patientBed;
            if (!string.IsNullOrEmpty(patientSex)) queryParams["patient_sex"] = patientSex;
            if (!string.IsNullOrEmpty(patientAge)) queryParams["patient_age"] = patientAge;

            string url = $"{baseUrl}/api/v1/navigate?{queryParams}";
            
            var response = await httpClient.GetAsync(url);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"调用AI助手失败: {ex.Message}");
            return false;
        }
    }
}

// 使用示例
var client = new AIAssistantClient();
await client.NavigateToPageAsync(
    page: "diagnosis",
    doctorName: "张医生",
    patientName: "李患者",
    patientBed: "101",
    patientSex: "男",
    patientAge: "45"
);
```

## 常用URL模板

### 智能问诊
```
http://localhost:19876/api/v1/navigate?page=chat&doctor_name={医生姓名}&patient_name={患者姓名}
```

### 病情分析
```
http://localhost:19876/api/v1/navigate?page=diagnosis&doctor_id={医生ID}&patient_id={患者ID}&patient_name={患者姓名}
```

### 检验解读
```
http://localhost:19876/api/v1/navigate?page=report&doctor_name={医生姓名}&patient_name={患者姓名}&patient_bed={床位号}
```

### 病历生成
```
http://localhost:19876/api/v1/navigate?page=record&doctor_name={医生姓名}&dept_name={科室名称}&patient_name={患者姓名}
```

### 病历质控
```
http://localhost:19876/api/v1/navigate?page=quality&doctor_id={医生ID}&patient_id={患者ID}
```

### 文档管理
```
http://localhost:19876/api/v1/navigate?page=documents&doctor_name={医生姓名}
```

## 错误处理

### 常见错误及解决方案

1. **连接失败**
   - 确保Electron应用正在运行
   - 检查端口19876是否被占用

2. **参数错误**
   - 检查page参数是否为有效值
   - 确保中文参数进行了URL编码

3. **超时错误**
   - 增加请求超时时间
   - 检查网络连接

### 错误响应示例
```json
{
    "success": false,
    "error": "无效的页面参数。支持的页面: chat, diagnosis, report, record, quality, documents"
}
```

## 测试工具

运行测试脚本：
```powershell
cd electron-client
.\test-api.ps1
```

这将自动测试所有API接口的功能。 