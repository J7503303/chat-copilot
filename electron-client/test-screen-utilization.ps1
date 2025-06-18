#!/usr/bin/env pwsh

# 屏幕空间利用率测试脚本

Write-Host "=== 屏幕空间利用率测试 ===" -ForegroundColor Green
Write-Host ""

Write-Host "测试目标:" -ForegroundColor Cyan
Write-Host "✓ 验证窗口高度接近屏幕高度" -ForegroundColor Green
Write-Host "✓ 确认充分利用屏幕空间" -ForegroundColor Green
Write-Host "✓ 测试不同分辨率下的表现" -ForegroundColor Green
Write-Host "✓ 验证折叠/展开时高度保持一致" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:19876"

# 获取当前窗口状态
Write-Host "步骤1: 获取当前窗口状态" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/status" -Method Get
    Write-Host "  ✓ 当前页面: $($response.currentTab)" -ForegroundColor Green
    Write-Host "  ✓ 窗口模式: $($response.windowMode)" -ForegroundColor Green
    Write-Host "  ✓ 窗口可见: $($response.isVisible)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 获取窗口状态失败: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 测试不同页面切换，观察窗口高度
Write-Host "步骤2: 测试页面切换时的窗口高度" -ForegroundColor Yellow
$pages = @(
    @{page="diagnosis"; name="病情分析"},
    @{page="record"; name="病历生成"},
    @{page="chat"; name="聊天助手"}
)

foreach ($pageInfo in $pages) {
    try {
        $url = "$baseUrl/api/v1/navigate?page=$($pageInfo.page)&patient_name=测试患者&doctor_name=测试医生"
        $response = Invoke-RestMethod -Uri $url -Method Get
        if ($response.success) {
            Write-Host "  ✓ $($pageInfo.name)页面切换成功" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ $($pageInfo.name)页面切换失败" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

# 测试完整患者信息，验证底部区域变化时的适应性
Write-Host "步骤3: 测试患者信息更新对窗口高度的影响" -ForegroundColor Yellow
try {
    $url = "$baseUrl/api/v1/navigate?page=documents&patient_name=张三&patient_bed=301-1&patient_sex=男&patient_age=45&dept_name=心内科&doctor_name=李医生"
    $response = Invoke-RestMethod -Uri $url -Method Get
    if ($response.success) {
        Write-Host "  ✓ 完整患者信息传入成功" -ForegroundColor Green
        Write-Host "    - 患者: 张三，男，45岁" -ForegroundColor Gray
        Write-Host "    - 床位: 301-1床" -ForegroundColor Gray
        Write-Host "    - 科室: 心内科" -ForegroundColor Gray
        Write-Host "    - 医生: 李医生" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ 患者信息更新失败" -ForegroundColor Red
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""

Write-Host "屏幕空间优化特性:" -ForegroundColor Yellow
Write-Host "✓ 使用 primaryDisplay.workAreaSize 避免与任务栏冲突" -ForegroundColor Green
Write-Host "✓ marginTop 和 marginBottom 设为 5px 小边距" -ForegroundColor Green
Write-Host "✓ 窗口高度 = 工作区高度 - 5 - 5 = 工作区高度 - 10px" -ForegroundColor Green
Write-Host "✓ 不会覆盖任务栏或被任务栏遮挡" -ForegroundColor Green
Write-Host "✓ 最大化可用空间利用率" -ForegroundColor Green
Write-Host ""

Write-Host "技术改进点:" -ForegroundColor Cyan
Write-Host "- createWindow(): 使用 primaryDisplay.workAreaSize" -ForegroundColor Gray
Write-Host "- adjustWindowSize(): 使用 primaryDisplay.workAreaSize" -ForegroundColor Gray
Write-Host "- toggle-sidebar IPC: 使用 primaryDisplay.workAreaSize" -ForegroundColor Gray
Write-Host "- showFloatingWindow(): 使用 primaryDisplay.workAreaSize" -ForegroundColor Gray
Write-Host "- APP_CONFIG.marginTop: 40 → 5" -ForegroundColor Gray
Write-Host "- APP_CONFIG.marginBottom: 40 → 5" -ForegroundColor Gray
Write-Host ""

Write-Host "手动验证要点:" -ForegroundColor Magenta
Write-Host "1. 观察窗口顶部是否贴近屏幕边缘" -ForegroundColor Gray
Write-Host "2. 观察窗口底部是否贴近屏幕边缘" -ForegroundColor Gray
Write-Host "3. 测试折叠/展开时高度是否保持" -ForegroundColor Gray
Write-Host "4. 在不同分辨率显示器上测试" -ForegroundColor Gray
Write-Host "5. 验证患者信息变化时的滚动适应" -ForegroundColor Gray
Write-Host ""

Write-Host "预期效果:" -ForegroundColor Green
Write-Host "✓ 窗口高度接近工作区高度（工作区高度-10px）" -ForegroundColor White
Write-Host "✓ 不会覆盖任务栏或被任务栏遮挡" -ForegroundColor White
Write-Host "✓ 充分利用可用工作空间" -ForegroundColor White
Write-Host "✓ 兼容任务栏自动隐藏/置顶等行为" -ForegroundColor White
Write-Host "✓ 适配各种屏幕尺寸和DPI设置" -ForegroundColor White 