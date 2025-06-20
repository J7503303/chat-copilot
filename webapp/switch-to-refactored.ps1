# 切换到重构版本测试脚本

Write-Host "🔄 切换到重构版本进行测试..." -ForegroundColor Green

# 1. 备份原文件
if (!(Test-Path "src/DoctorChatApp.backup.tsx")) {
    Write-Host "📦 备份原文件..." -ForegroundColor Blue
    Copy-Item "src/DoctorChatApp.tsx" "src/DoctorChatApp.backup.tsx"
    Write-Host "  ✅ 原文件已备份为 DoctorChatApp.backup.tsx" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ 备份文件已存在，跳过备份" -ForegroundColor Yellow
}

# 2. 用重构版本替换原文件
Write-Host "🔄 替换为重构版本..." -ForegroundColor Blue
Copy-Item "src/DoctorChatAppRefactored.tsx" "src/DoctorChatApp.tsx" -Force
Write-Host "  ✅ 已切换到重构版本" -ForegroundColor Green

# 3. 检查编译
Write-Host "🔨 检查编译..." -ForegroundColor Blue
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ 编译成功" -ForegroundColor Green
} else {
    Write-Host "  ❌ 编译失败，恢复原文件" -ForegroundColor Red
    Copy-Item "src/DoctorChatApp.backup.tsx" "src/DoctorChatApp.tsx" -Force
    Write-Host "  ✅ 已恢复原文件" -ForegroundColor Green
    exit 1
}

Write-Host "`n🎯 测试地址:" -ForegroundColor Blue
Write-Host "  http://localhost:8440/?doctor_id=ganjiayi&doctor_name=%E7%94%98%E7%94%9F&patient_name=%E9%99%88%E4%BB%81&dept_name=%E5%86%85%E4%B8%80%E7%A7%91" -ForegroundColor Cyan

Write-Host "`n📋 测试要点:" -ForegroundColor Blue
Write-Host "  1. 页面能正常加载" -ForegroundColor White
Write-Host "  2. 显示医生信息：甘生 [内一科] - 陈仁" -ForegroundColor White  
Write-Host "  3. 新聊天按钮可点击" -ForegroundColor White
Write-Host "  4. 历史记录按钮显示TODO抽屉" -ForegroundColor White
Write-Host "  5. 可以发送消息并收到回复" -ForegroundColor White
Write-Host "  6. 界面布局清晰，组件分离明显" -ForegroundColor White

Write-Host "`n⚡ 启动开发服务器（如果未运行）：" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Cyan

Write-Host "`n🔙 测试完成后恢复原版本：" -ForegroundColor Yellow  
Write-Host "  .\restore-original.ps1" -ForegroundColor Cyan

Write-Host "`n重构版本已激活，开始测试！" -ForegroundColor Green 