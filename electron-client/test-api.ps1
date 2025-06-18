# HTTP API 测试脚本
# 用于测试医疗AI助手的HTTP服务接口

$baseUrl = "http://localhost:19876"

Write-Host "=== 医疗AI助手 HTTP API 测试 ===" -ForegroundColor Green
Write-Host ""

# 测试1: 检查服务状态
Write-Host "1. 测试服务状态..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/status" -Method GET -TimeoutSec 5
    $status = $response.Content | ConvertFrom-Json
    Write-Host "✓ 服务状态正常" -ForegroundColor Green
    Write-Host "  当前页面: $($status.currentTab)" -ForegroundColor Cyan
    Write-Host "  窗口模式: $($status.windowMode)" -ForegroundColor Cyan
    Write-Host "  是否可见: $($status.isVisible)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ 服务状态检查失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请确保Electron应用正在运行" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 测试2: 测试导航接口 - 基本调用 (主要接口)
Write-Host "2. 测试导航接口 - 基本调用..." -ForegroundColor Yellow
try {
    $navUrl = "$baseUrl/api/v1/navigate?page=chat"
    $response = Invoke-WebRequest -Uri $navUrl -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✓ 基本导航成功" -ForegroundColor Green
    Write-Host "  返回消息: $($result.message)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ 基本导航测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试3: 测试导航接口 - 完整参数
Write-Host "3. 测试导航接口 - 完整参数..." -ForegroundColor Yellow
try {
    $params = @{
        page = "diagnosis"
        doctor_id = "D001"
        doctor_name = "张医生"
        dept_name = "内科"
        patient_id = "P001"
        patient_name = "李患者"
        patient_bed = "101"
        patient_sex = "男"
        patient_age = "45"
        window_mode = "full"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $fullUrl = "$baseUrl/api/v1/navigate?$queryString"
    
    $response = Invoke-WebRequest -Uri $fullUrl -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✓ 完整参数导航成功" -ForegroundColor Green
    Write-Host "  返回消息: $($result.message)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ 完整参数导航测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试4: 测试错误处理
Write-Host "4. 测试错误处理..." -ForegroundColor Yellow
try {
    $errorUrl = "$baseUrl/api/v1/navigate?page=invalid_page"
    $response = Invoke-WebRequest -Uri $errorUrl -Method GET -TimeoutSec 5
    Write-Host "✗ 错误处理测试失败 - 应该返回错误" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ 错误处理正常 - 正确返回400错误" -ForegroundColor Green
    } else {
        Write-Host "✗ 错误处理异常: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "当前可用的API接口:" -ForegroundColor Yellow
Write-Host "1. 状态查询: $baseUrl/api/status" -ForegroundColor Cyan
Write-Host "2. 导航接口: $baseUrl/api/v1/navigate?page=chat&doctor_name=测试医生&patient_name=测试患者" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意: /api/switch-tab 和 /api/window/toggle 接口已移除，统一使用 /api/v1/navigate" -ForegroundColor Yellow 