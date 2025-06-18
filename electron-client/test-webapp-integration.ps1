# 测试 Webapp 集成功能
# 验证 electron-client 与 webapp 的集成是否正常工作

Write-Host "=== Webapp 集成功能测试 ===" -ForegroundColor Green
Write-Host ""

# 检查服务状态
function Test-Service {
    param([string]$Url, [string]$Name)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5
        Write-Host "✓ $Name 服务正常 (状态码: $($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ $Name 服务异常: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. 检查 webapp 服务
Write-Host "1. 检查 webapp 服务状态" -ForegroundColor Yellow
$webappRunning = Test-Service "http://localhost:8440" "Webapp"

if (-not $webappRunning) {
    Write-Host ""
    Write-Host "Webapp 服务未运行，请先启动:" -ForegroundColor Yellow
    Write-Host "  cd webapp" -ForegroundColor White
    Write-Host "  yarn install" -ForegroundColor White
    Write-Host "  yarn start" -ForegroundColor White
    Write-Host ""
    Write-Host "或者使用自动启动脚本:" -ForegroundColor Yellow
    Write-Host "  .\start-with-webapp.ps1" -ForegroundColor White
    Write-Host ""
}

# 2. 检查文件结构
Write-Host "2. 检查文件结构" -ForegroundColor Yellow

$requiredFiles = @(
    @{ Path = "pages/chat.html"; Name = "聊天页面" },
    @{ Path = "main.js"; Name = "主程序" },
    @{ Path = "package.json"; Name = "包配置" },
    @{ Path = "../webapp/src/App.tsx"; Name = "Webapp 主组件" }
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file.Path) {
        Write-Host "✓ $($file.Name) 存在" -ForegroundColor Green
    } else {
        Write-Host "✗ $($file.Name) 缺失: $($file.Path)" -ForegroundColor Red
    }
}

# 3. 检查 chat.html 的关键内容
Write-Host ""
Write-Host "3. 检查 chat.html 集成代码" -ForegroundColor Yellow

if (Test-Path "pages/chat.html") {
    $chatPageContent = Get-Content "pages/chat.html" -Raw
    
    $checks = @(
        @{ Pattern = "webapp-container"; Name = "iframe 容器样式" },
        @{ Pattern = "http://localhost:8440"; Name = "webapp URL" },
        @{ Pattern = "handleIframeLoad"; Name = "iframe 加载处理" },
        @{ Pattern = "sendContextToWebapp"; Name = "上下文传递功能" },
        @{ Pattern = "window.addEventListener.*message"; Name = "消息监听" },
        @{ Pattern = "ChatIntegration"; Name = "集成接口" }
    )
    
    foreach ($check in $checks) {
        if ($chatPageContent -match $check.Pattern) {
            Write-Host "✓ $($check.Name) 已实现" -ForegroundColor Green
        } else {
            Write-Host "✗ $($check.Name) 缺失" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ chat.html 文件不存在" -ForegroundColor Red
}

# 4. 生成测试命令
Write-Host ""
Write-Host "4. 浏览器控制台测试命令" -ForegroundColor Yellow
Write-Host "启动应用后，在浏览器开发者工具中执行以下命令:" -ForegroundColor Cyan
Write-Host ""

Write-Host "// 测试集成接口" -ForegroundColor Green
Write-Host "console.log('ChatIntegration 接口:', window.ChatIntegration);" -ForegroundColor Gray
Write-Host ""

Write-Host "// 获取集成状态" -ForegroundColor Green
Write-Host "console.log('集成状态:', window.ChatIntegration.getStatus());" -ForegroundColor Gray
Write-Host ""

Write-Host "// 测试消息发送" -ForegroundColor Green
Write-Host "window.ChatIntegration.sendMessage('测试消息', { source: 'test' });" -ForegroundColor Gray
Write-Host ""

Write-Host "// 测试上下文更新" -ForegroundColor Green
Write-Host "window.ChatIntegration.updateContext();" -ForegroundColor Gray
Write-Host ""

Write-Host "// 测试重试连接" -ForegroundColor Green
Write-Host "window.ChatIntegration.retry();" -ForegroundColor Gray
Write-Host ""

# 5. 性能测试建议
Write-Host "5. 性能测试建议" -ForegroundColor Yellow
Write-Host "- 检查 iframe 加载时间" -ForegroundColor White
Write-Host "- 测试消息传递延迟" -ForegroundColor White
Write-Host "- 验证内存使用情况" -ForegroundColor White
Write-Host "- 测试网络中断恢复" -ForegroundColor White
Write-Host ""

# 6. 常见问题排查
Write-Host "6. 常见问题排查" -ForegroundColor Yellow
Write-Host ""

Write-Host "问题: iframe 显示空白" -ForegroundColor Red
Write-Host "解决: 检查 webapp 服务是否正常运行" -ForegroundColor White
Write-Host "      检查浏览器控制台错误信息" -ForegroundColor White
Write-Host "      确认没有 CORS 或 X-Frame-Options 限制" -ForegroundColor White
Write-Host ""

Write-Host "问题: 上下文信息未传递" -ForegroundColor Red
Write-Host "解决: 检查 postMessage 是否正常发送" -ForegroundColor White
Write-Host "      确认 webapp 监听了 message 事件" -ForegroundColor White
Write-Host "      验证消息格式是否正确" -ForegroundColor White
Write-Host ""

Write-Host "问题: 重试连接失败" -ForegroundColor Red
Write-Host "解决: 检查网络连接" -ForegroundColor White
Write-Host "      确认端口 3000 未被其他程序占用" -ForegroundColor White
Write-Host "      查看 webapp 启动日志" -ForegroundColor White
Write-Host ""

# 7. 启动测试
Write-Host "7. 启动集成测试" -ForegroundColor Yellow

$choice = Read-Host "是否现在启动应用进行测试? (y/N)"
if ($choice -eq "y" -or $choice -eq "Y") {
    Write-Host ""
    Write-Host "正在启动应用..." -ForegroundColor Green
    
    if (Test-Path "start-with-webapp.ps1") {
        .\start-with-webapp.ps1
    } else {
        Write-Host "未找到启动脚本，手动启动..." -ForegroundColor Yellow
        
        # 检查是否需要启动 webapp
        if (-not $webappRunning) {
            Write-Host "请先在另一个终端中启动 webapp:" -ForegroundColor Red
            Write-Host "cd webapp && yarn start" -ForegroundColor White
            Read-Host "启动完成后按回车继续"
        }
        
        # 启动 electron
        npm start
    }
} else {
    Write-Host ""
    Write-Host "测试完成！" -ForegroundColor Green
    Write-Host "请手动启动应用后按照上述指导进行测试。" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== 测试检查完成 ===" -ForegroundColor Green 