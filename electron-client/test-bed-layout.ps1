#!/usr/bin/env pwsh

# 床号布局测试脚本
# 测试不同长度的床号在新布局中的显示效果

Write-Host "=== 床号布局测试 ===" -ForegroundColor Green
Write-Host "测试床号现在显示在患者姓名和科室下方，横向排列" -ForegroundColor Yellow
Write-Host ""

$baseUrl = "http://localhost:19876"

# 辅助函数：发送请求并显示结果
function Test-ApiCall {
    param(
        [string]$TestName,
        [string]$Url,
        [string]$ExpectedDisplay
    )
    
    Write-Host $TestName -ForegroundColor Cyan
    Write-Host "URL: $Url"
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get
        if ($response.success) {
            Write-Host "✓ 响应成功: $($response.message)" -ForegroundColor Green
        } else {
            Write-Host "✗ 响应失败: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host "预期显示: $ExpectedDisplay"
    Write-Host ""
    Start-Sleep -Seconds 2
}

# 测试1: 短床号
Test-ApiCall -TestName "测试1: 短床号 (19床)" `
    -Url "$baseUrl/api/v1/navigate?page=chat&patient_name=李患者&patient_bed=19&dept_name=内科&doctor_name=张医生" `
    -ExpectedDisplay "床号'19床'在患者姓名'李患者'和科室'内科'下方横向显示"

# 测试2: 三位数床号
Test-ApiCall -TestName "测试2: 三位数床号 (308床)" `
    -Url "$baseUrl/api/v1/navigate?page=diagnosis&patient_name=王老先生&patient_bed=308&dept_name=心血管内科&doctor_name=李主任医师" `
    -ExpectedDisplay "床号'308床'在患者姓名'王老先生'和科室'心血管内科'下方横向显示"

# 测试3: 长床号
Test-ApiCall -TestName "测试3: 长床号 (ICU-A-0123床)" `
    -Url "$baseUrl/api/v1/navigate?page=record&patient_name=陈患者&patient_bed=ICU-A-0123&dept_name=重症监护科&doctor_name=赵医生" `
    -ExpectedDisplay "床号'ICU-A-0123床'在患者姓名'陈患者'和科室'重症监护科'下方横向显示"

# 测试4: 超长床号
Test-ApiCall -TestName "测试4: 超长床号 (ICU-VIP-A-001-SPECIAL床)" `
    -Url "$baseUrl/api/v1/navigate?page=chat&patient_name=张患者&patient_bed=ICU-VIP-A-001-SPECIAL&dept_name=外科&doctor_name=王医生" `
    -ExpectedDisplay "床号'ICU-VIP-A-001-SPECIAL床'在患者姓名'张患者'和科室'外科'下方横向显示，支持长床号完整显示"

# 测试5: 无床号
Test-ApiCall -TestName "测试5: 无床号测试" `
    -Url "$baseUrl/api/v1/navigate?page=quality&patient_name=刘患者&dept_name=妇科&doctor_name=孙医生" `
    -ExpectedDisplay "床号区域应该隐藏，只显示患者姓名'刘患者'和科室'妇科'"

# 测试6: 重置为默认状态
Test-ApiCall -TestName "测试6: 重置为默认状态" `
    -Url "$baseUrl/api/v1/navigate?page=chat" `
    -ExpectedDisplay "患者姓名显示'未知患者'，床号区域隐藏，科室和医生为空"

Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "检查要点:" -ForegroundColor Yellow
Write-Host "1. 床号现在显示在患者姓名和科室的下方"
Write-Host "2. 床号采用横向布局，字体与医生姓名一致"
Write-Host "3. 床号支持各种长度，包括超长床号"
Write-Host "4. 当没有床号信息时，床号区域应该隐藏"
Write-Host "5. 患者姓名和科室仍然是竖向显示，底部对齐"
Write-Host ""
Write-Host "如需查看详细的视觉效果，请打开: electron-client/test-alignment.html" -ForegroundColor Cyan 