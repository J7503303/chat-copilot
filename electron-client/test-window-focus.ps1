#!/usr/bin/env pwsh

# 窗口置顶功能测试脚本
# 测试默认置顶和Logo状态

Write-Host "=== 窗口置顶功能测试 ===" -ForegroundColor Green
Write-Host "测试默认置顶和Logo状态显示" -ForegroundColor Yellow
Write-Host ""

$baseUrl = "http://localhost:19876"

Write-Host "功能说明:" -ForegroundColor Cyan
Write-Host "✓ 应用启动时默认置顶，Logo显示蓝色选中状态" -ForegroundColor Green
Write-Host "✓ 用户可点击Logo切换置顶状态" -ForegroundColor Green
Write-Host "✓ API调用时自动重新置顶，确保窗口显示" -ForegroundColor Green
Write-Host ""

Write-Host "测试说明:" -ForegroundColor Cyan
Write-Host "1. 观察应用启动时Logo是否为蓝色（表示置顶）" -ForegroundColor Gray
Write-Host "2. 手动取消置顶，然后调用API观察是否重新置顶" -ForegroundColor Gray
Write-Host "3. 观察Logo状态是否同步更新" -ForegroundColor Gray
Write-Host ""

Read-Host "准备好后按回车开始测试"

# 测试1: 基本API调用
Write-Host "测试1: 基本API调用" -ForegroundColor Cyan
Write-Host "调用导航接口，观察窗口显示..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/navigate?page=chat&doctor_name=测试医生" -Method Get
    if ($response.success) {
        Write-Host "✓ API调用成功: $($response.message)" -ForegroundColor Green
        Write-Host "  观察: 窗口应该重新置顶显示，Logo变为蓝色状态" -ForegroundColor Yellow
    } else {
        Write-Host "✗ API调用失败: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 2

# 测试2: 页面切换测试
Write-Host "测试2: 页面切换测试" -ForegroundColor Cyan
Write-Host "切换不同页面..." -ForegroundColor Yellow

$pages = @(
    @{page="diagnosis"; name="病情分析"},
    @{page="report"; name="检验解读"},
    @{page="record"; name="病历生成"},
    @{page="quality"; name="病历质控"}
)

foreach ($pageInfo in $pages) {
    try {
        $url = "$baseUrl/api/v1/navigate?page=$($pageInfo.page)&patient_name=测试患者"
        $response = Invoke-RestMethod -Uri $url -Method Get
        if ($response.success) {
            Write-Host "  ✓ 切换到$($pageInfo.name)成功" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ 切换到$($pageInfo.name)失败" -ForegroundColor Red
    }
    Write-Host "    观察: 窗口应该重新置顶显示在前台" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

Write-Host ""

# 测试3: 完整参数测试
Write-Host "测试3: 完整参数测试" -ForegroundColor Cyan
Write-Host "传递完整患者信息..." -ForegroundColor Yellow

try {
    $params = @{
        page = "diagnosis"
        doctor_name = "张主任"
        dept_name = "心内科"
        patient_name = "李患者"
        patient_bed = "201"
        patient_sex = "男"
        patient_age = "45"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $url = "$baseUrl/api/v1/navigate?$queryString"
    
    $response = Invoke-RestMethod -Uri $url -Method Get
    if ($response.success) {
        Write-Host "✓ 完整参数测试成功: $($response.message)" -ForegroundColor Green
        Write-Host "  观察: 窗口显示完整患者信息，Logo保持蓝色" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ 完整参数测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "置顶方案优势:" -ForegroundColor Yellow
Write-Host "✓ 默认置顶，确保窗口始终可见" -ForegroundColor Green
Write-Host "✓ API调用时自动重新置顶，防止被遮挡" -ForegroundColor Green
Write-Host "✓ Logo状态实时同步，直观显示置顶状态" -ForegroundColor Green
Write-Host "✓ 用户可自由控制置顶开关" -ForegroundColor Green
Write-Host "✓ 代码简洁，逻辑清晰" -ForegroundColor Green
Write-Host ""
Write-Host "手动测试:" -ForegroundColor Cyan
Write-Host "1. 点击Logo按钮，观察蓝色状态切换" -ForegroundColor Gray
Write-Host "2. 取消置顶后，窗口可能被其他窗口覆盖" -ForegroundColor Gray
Write-Host "3. 再次点击Logo恢复置顶状态" -ForegroundColor Gray 