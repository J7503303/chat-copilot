# 医生聊天界面离线状态优化测试脚本

Write-Host "=== 医生聊天界面离线状态优化测试 ===" -ForegroundColor Green

# 测试参数
$doctorId = "DOC-TEST-001"
$doctorName = "测试医生"
$patientName = "张三"
$deptName = "内科"

# 启动 Electron 应用进行离线状态测试
Write-Host "启动医生聊天界面..." -ForegroundColor Yellow

# 电子应用启动命令
$electronPath = "electron-client"
$mainScript = "main.js"

# 检查 Electron 客户端是否存在
if (-not (Test-Path $electronPath)) {
    Write-Host "❌ 错误: Electron 客户端目录不存在" -ForegroundColor Red
    exit 1
}

# 设置环境变量用于测试
$env:TEST_MODE = "offline"
$env:DOCTOR_ID = $doctorId
$env:DOCTOR_NAME = $doctorName
$env:PATIENT_NAME = $patientName
$env:DEPT_NAME = $deptName

Write-Host "📋 测试配置:" -ForegroundColor Cyan
Write-Host "  医生ID: $doctorId"
Write-Host "  医生姓名: $doctorName"
Write-Host "  患者姓名: $patientName"
Write-Host "  科室: $deptName"
Write-Host "  测试模式: 离线状态"

Write-Host "`n🔧 离线状态优化点:" -ForegroundColor Yellow
Write-Host "  ✅ 删除了所有预设的医疗回复"
Write-Host "  ✅ 离线时显示友好的系统提示"
Write-Host "  ✅ 输入框显示离线状态提示"
Write-Host "  ✅ 发送按钮在离线时被禁用"
Write-Host "  ✅ 欢迎消息改为系统状态提示"

Write-Host "`n🧪 测试验证项目:" -ForegroundColor Magenta
Write-Host "  1. 启动时显示离线状态提示而非预设回复"
Write-Host "  2. 发送消息时显示友好的离线提醒"
Write-Host "  3. 输入框显示离线状态并禁用发送"
Write-Host "  4. 没有任何医疗建议或预设内容"
Write-Host "  5. 界面提示用户检查网络连接"

Write-Host "`n⚠️ 手动测试步骤:" -ForegroundColor Red
Write-Host "  1. 确保 WebAPI 后端服务未启动 (模拟离线)"
Write-Host "  2. 启动 Electron 应用"
Write-Host "  3. 验证欢迎消息是系统提示而非医疗回复"
Write-Host "  4. 尝试发送消息，验证显示离线提醒"
Write-Host "  5. 检查输入框是否显示离线状态"
Write-Host "  6. 确认没有任何预设的医疗建议"

Write-Host "`n🚀 准备启动应用进行测试..." -ForegroundColor Green
Write-Host "按任意键继续启动 Electron 应用..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

try {
    # 进入 Electron 客户端目录
    Push-Location $electronPath
    
    # 启动 Electron 应用
    Write-Host "启动 Electron 应用..." -ForegroundColor Yellow
    & npm start
    
} catch {
    Write-Host "❌ 启动失败: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # 恢复原始目录
    Pop-Location
    
    # 清理环境变量
    Remove-Item Env:TEST_MODE -ErrorAction SilentlyContinue
    Remove-Item Env:DOCTOR_ID -ErrorAction SilentlyContinue
    Remove-Item Env:DOCTOR_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:PATIENT_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:DEPT_NAME -ErrorAction SilentlyContinue
}

Write-Host "`n✅ 离线状态优化测试完成" -ForegroundColor Green
Write-Host "如果测试正常，应该看到:" -ForegroundColor Cyan
Write-Host "  - 系统提示消息而非医疗回复"
Write-Host "  - 友好的离线状态说明"
Write-Host "  - 禁用的输入框和发送按钮"
Write-Host "  - 明确的网络连接建议" 