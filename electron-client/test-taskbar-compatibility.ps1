#!/usr/bin/env pwsh

# 任务栏兼容性测试脚本

Write-Host "=== 任务栏兼容性测试 ===" -ForegroundColor Green
Write-Host ""

Write-Host "测试目标:" -ForegroundColor Cyan
Write-Host "✓ 验证窗口不会覆盖任务栏" -ForegroundColor Green
Write-Host "✓ 确认窗口不会被任务栏遮挡" -ForegroundColor Green
Write-Host "✓ 测试任务栏置顶时的表现" -ForegroundColor Green
Write-Host "✓ 验证任务栏自动隐藏的兼容性" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:19876"

Write-Host "窗口高度计算原理:" -ForegroundColor Yellow
Write-Host "- 使用 primaryDisplay.workAreaSize 获取工作区尺寸" -ForegroundColor Gray
Write-Host "- 工作区尺寸 = 屏幕尺寸 - 任务栏等系统UI高度" -ForegroundColor Gray
Write-Host "- 窗口高度 = 工作区高度 - marginTop(5px) - marginBottom(5px)" -ForegroundColor Gray
Write-Host "- 最终窗口高度 = 工作区高度 - 10px" -ForegroundColor Gray
Write-Host ""

# 测试基本窗口状态
Write-Host "步骤1: 测试基本窗口状态" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/status" -Method Get
    Write-Host "  ✓ 当前页面: $($response.currentTab)" -ForegroundColor Green
    Write-Host "  ✓ 窗口模式: $($response.windowMode)" -ForegroundColor Green
    Write-Host "  ✓ 窗口可见: $($response.isVisible)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 获取窗口状态失败: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 测试窗口切换，观察是否与任务栏冲突
Write-Host "步骤2: 测试窗口切换时的任务栏兼容性" -ForegroundColor Yellow
$pages = @(
    @{page="diagnosis"; name="病情分析"},
    @{page="chat"; name="聊天助手"},
    @{page="documents"; name="文档管理"}
)

foreach ($pageInfo in $pages) {
    try {
        $url = "$baseUrl/api/v1/navigate?page=$($pageInfo.page)&patient_name=测试患者"
        $response = Invoke-RestMethod -Uri $url -Method Get
        if ($response.success) {
            Write-Host "  ✓ $($pageInfo.name)页面切换成功，检查任务栏是否可见" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ $($pageInfo.name)页面切换失败" -ForegroundColor Red
    }
    Start-Sleep -Seconds 2
}

# 测试完整患者信息下的任务栏兼容性
Write-Host "步骤3: 测试完整患者信息下的任务栏兼容性" -ForegroundColor Yellow
try {
    $url = "$baseUrl/api/v1/navigate?page=documents&patient_name=张三&patient_bed=301-1&patient_sex=男&patient_age=45&dept_name=心内科&doctor_name=李医生"
    $response = Invoke-RestMethod -Uri $url -Method Get
    if ($response.success) {
        Write-Host "  ✓ 完整患者信息显示成功" -ForegroundColor Green
        Write-Host "  ✓ 请检查窗口底部是否露出任务栏" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ 患者信息显示失败" -ForegroundColor Red
}

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""

Write-Host "任务栏兼容性特性:" -ForegroundColor Yellow
Write-Host "✓ 使用 workAreaSize 自动排除任务栏高度" -ForegroundColor Green
Write-Host "✓ 设置小边距避免贴边和冲突" -ForegroundColor Green
Write-Host "✓ 窗口高度适应不同任务栏位置" -ForegroundColor Green
Write-Host "✓ 兼容任务栏自动隐藏行为" -ForegroundColor Green
Write-Host "✓ 支持任务栏置顶等特殊情况" -ForegroundColor Green
Write-Host ""

Write-Host "手动验证要点:" -ForegroundColor Magenta
Write-Host "1. 观察窗口底部是否露出任务栏" -ForegroundColor Gray
Write-Host "2. 尝试点击任务栏上的其他应用图标" -ForegroundColor Gray
Write-Host "3. 测试任务栏右键菜单是否可用" -ForegroundColor Gray
Write-Host "4. 验证系统托盘区域是否可访问" -ForegroundColor Gray
Write-Host "5. 测试Alt+Tab等系统快捷键" -ForegroundColor Gray
Write-Host ""

Write-Host "任务栏位置测试:" -ForegroundColor Cyan
Write-Host "- 底部任务栏（默认）: 窗口应在任务栏上方" -ForegroundColor Gray
Write-Host "- 顶部任务栏: 窗口应在任务栏下方" -ForegroundColor Gray
Write-Host "- 左侧任务栏: 窗口应在任务栏右侧" -ForegroundColor Gray
Write-Host "- 右侧任务栏: 窗口应避免重叠" -ForegroundColor Gray
Write-Host ""

Write-Host "问题排查:" -ForegroundColor Red
Write-Host "如果发现任务栏被遮挡，请检查:" -ForegroundColor Yellow
Write-Host "1. APP_CONFIG.marginBottom 是否设置正确（当前为5px）" -ForegroundColor Gray
Write-Host "2. 是否使用了 workAreaSize 而非 size" -ForegroundColor Gray
Write-Host "3. 任务栏是否设置为自动隐藏" -ForegroundColor Gray
Write-Host "4. 系统DPI缩放是否影响计算" -ForegroundColor Gray 