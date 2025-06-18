#!/usr/bin/env pwsh

# 患者信息更新滚动测试脚本

Write-Host "=== 患者信息更新滚动测试 ===" -ForegroundColor Green
Write-Host ""

Write-Host "测试场景:" -ForegroundColor Cyan
Write-Host "1. 应用启动时患者信息较少（默认状态）" -ForegroundColor Gray
Write-Host "2. 用户手动滚动到最后一个导航按钮" -ForegroundColor Gray
Write-Host "3. API调用传入完整患者信息" -ForegroundColor Gray
Write-Host "4. 验证最后一个导航按钮仍完整可见" -ForegroundColor Gray
Write-Host ""

$baseUrl = "http://localhost:19876"

# 第一步：切换到最后一个导航按钮
Write-Host "步骤1: 切换到文档管理页面（最后一个按钮）" -ForegroundColor Yellow
try {
    $url = "$baseUrl/api/v1/navigate?page=documents"
    $response = Invoke-RestMethod -Uri $url -Method Get
    if ($response.success) {
        Write-Host "  ✓ 成功切换到文档管理页面" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ 切换失败: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# 第二步：传入完整患者信息
Write-Host "步骤2: 传入完整患者信息" -ForegroundColor Yellow
try {
    $url = "$baseUrl/api/v1/navigate?page=documents&patient_name=张三&patient_bed=301-1&patient_sex=男&patient_age=45&dept_name=心内科&doctor_name=李医生"
    $response = Invoke-RestMethod -Uri $url -Method Get
    if ($response.success) {
        Write-Host "  ✓ 成功传入完整患者信息" -ForegroundColor Green
        Write-Host "    - 患者姓名: 张三" -ForegroundColor Gray
        Write-Host "    - 床位号: 301-1床" -ForegroundColor Gray
        Write-Host "    - 性别年龄: 男 45岁" -ForegroundColor Gray
        Write-Host "    - 科室: 心内科" -ForegroundColor Gray
        Write-Host "    - 医生: 李医生" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ 传入患者信息失败: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# 第三步：测试其他页面切换
Write-Host "步骤3: 测试其他页面切换是否正常" -ForegroundColor Yellow
$pages = @(
    @{page="chat"; name="聊天助手"},
    @{page="report"; name="报告解读"},
    @{page="documents"; name="文档管理"}
)

foreach ($pageInfo in $pages) {
    try {
        $url = "$baseUrl/api/v1/navigate?page=$($pageInfo.page)&patient_name=张三&patient_bed=301-1&patient_sex=男&patient_age=45&dept_name=心内科&doctor_name=李医生"
        $response = Invoke-RestMethod -Uri $url -Method Get
        if ($response.success) {
            Write-Host "  ✓ $($pageInfo.name)页面正常" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ $($pageInfo.name)页面异常" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""

Write-Host "预期结果:" -ForegroundColor Yellow
Write-Host "✓ 患者信息更新后，导航滚动自动重新计算" -ForegroundColor Green
Write-Host "✓ 最后一个导航按钮始终完整可见" -ForegroundColor Green
Write-Host "✓ 无需手动切换折叠模式" -ForegroundColor Green
Write-Host "✓ 滚动位置智能调整到合适范围" -ForegroundColor Green
Write-Host ""

Write-Host "手动验证要点:" -ForegroundColor Cyan
Write-Host "1. 观察患者信息区域高度变化" -ForegroundColor Gray
Write-Host "2. 检查最后一个导航按钮是否被遮挡" -ForegroundColor Gray
Write-Host "3. 测试滚动箭头的显示逻辑" -ForegroundColor Gray
Write-Host "4. 验证滚动位置是否自动调整" -ForegroundColor Gray
Write-Host ""

Write-Host "技术细节:" -ForegroundColor Magenta
Write-Host "- updatePatientInfo() 函数会触发滚动重新计算" -ForegroundColor Gray
Write-Host "- initializeNavScroll() 函数会智能调整滚动位置" -ForegroundColor Gray
Write-Host "- 延迟50ms执行，确保DOM更新完成" -ForegroundColor Gray
Write-Host "- 滚动位置不会超出有效范围" -ForegroundColor Gray 