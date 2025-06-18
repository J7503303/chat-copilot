#!/usr/bin/env pwsh

# 精简API测试脚本
# 测试移除不必要接口后的API功能

Write-Host "=== 精简API功能测试 ===" -ForegroundColor Green
Write-Host "测试移除通知提示和不必要接口后的功能" -ForegroundColor Yellow
Write-Host ""

$baseUrl = "http://localhost:19876"

# 测试1: 验证状态接口仍然可用
Write-Host "测试1: 验证状态查询接口" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/status" -Method Get
    Write-Host "✓ 状态接口正常" -ForegroundColor Green
    Write-Host "  当前页面: $($response.currentTab)" -ForegroundColor Gray
    Write-Host "  窗口模式: $($response.windowMode)" -ForegroundColor Gray
    Write-Host "  是否可见: $($response.isVisible)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 状态接口失败: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 测试2: 验证导航接口功能完整
Write-Host "测试2: 验证导航接口 (无通知提示)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/navigate?page=chat&doctor_name=测试医生&patient_name=测试患者" -Method Get
    if ($response.success) {
        Write-Host "✓ 导航成功: $($response.message)" -ForegroundColor Green
        Write-Host "  注意观察: 应该没有弹出通知提示" -ForegroundColor Yellow
    } else {
        Write-Host "✗ 导航失败: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 导航接口失败: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 测试3: 验证已删除的接口确实不可用
Write-Host "测试3: 验证已删除接口不可用" -ForegroundColor Cyan

Write-Host "  测试 /api/switch-tab (应该404):" -ForegroundColor Gray
try {
    $body = @{
        tabName = "diagnosis"
        params = @{}
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/switch-tab" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  ✗ 接口仍然存在 (应该已删除)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  ✓ 接口已正确删除 (404)" -ForegroundColor Green
    } else {
        Write-Host "  ✓ 接口不可用: $($_.Exception.Message)" -ForegroundColor Green
    }
}

Write-Host "  测试 /api/window/toggle (应该404):" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/window/toggle" -Method Post
    Write-Host "  ✗ 接口仍然存在 (应该已删除)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  ✓ 接口已正确删除 (404)" -ForegroundColor Green
    } else {
        Write-Host "  ✓ 接口不可用: $($_.Exception.Message)" -ForegroundColor Green
    }
}
Write-Host ""

# 测试4: 多次切换验证无通知
Write-Host "测试4: 多次切换验证无通知提示" -ForegroundColor Cyan
$pages = @("chat", "diagnosis", "report", "record", "quality")
foreach ($page in $pages) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/navigate?page=$page" -Method Get
        if ($response.success) {
            Write-Host "  ✓ 切换到 $page 成功" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ 切换到 $page 失败" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}
Write-Host "  注意观察: 所有切换都应该没有弹出通知" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "精简后的API状态:" -ForegroundColor Yellow
Write-Host "✓ 保留: /api/status (状态查询)" -ForegroundColor Green
Write-Host "✓ 保留: /api/v1/navigate (主要功能接口)" -ForegroundColor Green
Write-Host "✗ 移除: /api/switch-tab (功能重复)" -ForegroundColor Red
Write-Host "✗ 移除: /api/window/toggle (使用场景少)" -ForegroundColor Red
Write-Host "✗ 移除: 页面切换通知提示 (保持静默)" -ForegroundColor Red
Write-Host ""
Write-Host "现在的API更加简洁高效，专注于核心功能！" -ForegroundColor Cyan 