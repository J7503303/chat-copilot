# 恢复原版本脚本

Write-Host "🔙 恢复原版本..." -ForegroundColor Green

if (Test-Path "src/DoctorChatApp.backup.tsx") {
    Write-Host "📦 恢复备份文件..." -ForegroundColor Blue
    Copy-Item "src/DoctorChatApp.backup.tsx" "src/DoctorChatApp.tsx" -Force
    Write-Host "  ✅ 已恢复原版本" -ForegroundColor Green
    
    # 检查编译
    Write-Host "🔨 检查编译..." -ForegroundColor Blue
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ 编译成功" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 编译失败" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ 未找到备份文件 DoctorChatApp.backup.tsx" -ForegroundColor Red
    Write-Host "  请手动检查原文件是否完整" -ForegroundColor Yellow
}

Write-Host "`n✅ 恢复完成！" -ForegroundColor Green 