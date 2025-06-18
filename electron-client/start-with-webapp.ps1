# Chat Copilot 完整应用启动脚本
# 自动启动 webapp 和 electron-client

param(
    [switch]$SkipWebapp,
    [switch]$WebappOnly,
    [int]$WebappPort = 8440,
    [int]$WaitTime = 10
)

Write-Host "=== Chat Copilot 完整应用启动 ===" -ForegroundColor Green
Write-Host ""

# 检查当前目录
$currentDir = Get-Location
if (-not (Test-Path "main.js")) {
    Write-Host "错误: 请在 electron-client 目录下运行此脚本" -ForegroundColor Red
    Write-Host "当前目录: $currentDir" -ForegroundColor Yellow
    exit 1
}

# 检查webapp目录
$webappPath = "../webapp"
if (-not (Test-Path $webappPath)) {
    Write-Host "错误: 未找到 webapp 目录" -ForegroundColor Red
    Write-Host "预期路径: $((Resolve-Path $webappPath -ErrorAction SilentlyContinue))" -ForegroundColor Yellow
    exit 1
}

# 检查端口是否被占用
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# 启动 webapp
if (-not $SkipWebapp) {
    Write-Host "1. 检查 webapp 服务状态..." -ForegroundColor Yellow
    
    if (Test-Port $WebappPort) {
        Write-Host "   端口 $WebappPort 已被占用，webapp 可能已在运行" -ForegroundColor Green
        
        # 测试是否是我们的webapp
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$WebappPort" -TimeoutSec 3
            Write-Host "   ✓ Webapp 服务已运行" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠ 端口被其他服务占用，尝试使用其他端口" -ForegroundColor Yellow
            $WebappPort = 3001
        }
    } else {
        Write-Host "   端口 $WebappPort 可用，准备启动 webapp..." -ForegroundColor Cyan
        
        # 检查 yarn 或 npm
        $packageManager = "yarn"
        try {
            yarn --version | Out-Null
        } catch {
            Write-Host "   yarn 未安装，使用 npm" -ForegroundColor Yellow
            $packageManager = "npm"
        }
        
        # 启动 webapp
        Write-Host "   正在启动 webapp (使用 $packageManager)..." -ForegroundColor Cyan
        
        $webappProcess = Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$webappPath'; Write-Host 'Webapp 启动中...' -ForegroundColor Green; if ('$packageManager' -eq 'yarn') { yarn install; yarn start } else { npm install; npm start }"
        ) -WindowStyle Normal -PassThru
        
        Write-Host "   Webapp 进程已启动 (PID: $($webappProcess.Id))" -ForegroundColor Green
        
        # 等待 webapp 启动
        Write-Host "   等待 webapp 启动完成..." -ForegroundColor Yellow
        $timeout = $WaitTime
        $started = $false
        
        for ($i = 1; $i -le $timeout; $i++) {
            Write-Progress -Activity "等待 Webapp 启动" -Status "检查中... ($i/$timeout)" -PercentComplete (($i / $timeout) * 100)
            Start-Sleep -Seconds 1
            
            if (Test-Port $WebappPort) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$WebappPort" -TimeoutSec 2
                    Write-Host "   ✓ Webapp 启动成功! (耗时: ${i}秒)" -ForegroundColor Green
                    $started = $true
                    break
                } catch {
                    # 继续等待
                }
            }
        }
        
        Write-Progress -Activity "等待 Webapp 启动" -Completed
        
        if (-not $started) {
            Write-Host "   ⚠ Webapp 启动超时，但仍会尝试启动 Electron" -ForegroundColor Yellow
            Write-Host "   请检查 webapp 终端窗口的错误信息" -ForegroundColor Yellow
        }
    }
    
    if ($WebappOnly) {
        Write-Host ""
        Write-Host "仅启动 webapp 模式，脚本结束" -ForegroundColor Green
        Write-Host "Webapp 地址: http://localhost:$WebappPort" -ForegroundColor Cyan
        exit 0
    }
}

# 启动 Electron 应用
Write-Host ""
Write-Host "2. 启动 Electron 应用..." -ForegroundColor Yellow

# 检查 package.json
if (-not (Test-Path "package.json")) {
    Write-Host "   错误: 未找到 package.json" -ForegroundColor Red
    exit 1
}

# 检查 node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "   正在安装 Electron 依赖..." -ForegroundColor Cyan
    npm install
}

# 启动 Electron
Write-Host "   正在启动 Electron 应用..." -ForegroundColor Cyan
try {
    # 设置环境变量
    $env:WEBAPP_URL = "http://localhost:$WebappPort"
    
    # 启动应用
    npm start
} catch {
    Write-Host "   错误: Electron 启动失败" -ForegroundColor Red
    Write-Host "   错误信息: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # 尝试直接用 electron 命令
    Write-Host "   尝试直接启动..." -ForegroundColor Yellow
    try {
        electron .
    } catch {
        Write-Host "   请检查 Electron 是否正确安装" -ForegroundColor Red
        Write-Host "   可以尝试运行: npm install -g electron" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== 启动完成 ===" -ForegroundColor Green
Write-Host "Webapp 地址: http://localhost:$WebappPort" -ForegroundColor Cyan
Write-Host "如遇问题，请检查两个终端窗口的错误信息" -ForegroundColor Yellow

# 清理函数
function Cleanup {
    Write-Host ""
    Write-Host "正在清理进程..." -ForegroundColor Yellow
    
    # 这里可以添加清理逻辑，但通常用户会手动关闭窗口
    Write-Host "请手动关闭 webapp 和 electron 窗口" -ForegroundColor Cyan
}

# 注册清理函数
Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# 使用说明
Write-Host ""
Write-Host "使用说明:" -ForegroundColor Green
Write-Host "  正常启动: .\start-with-webapp.ps1" -ForegroundColor White
Write-Host "  跳过webapp: .\start-with-webapp.ps1 -SkipWebapp" -ForegroundColor White
Write-Host "  仅启动webapp: .\start-with-webapp.ps1 -WebappOnly" -ForegroundColor White
Write-Host "  自定义端口: .\start-with-webapp.ps1 -WebappPort 3001" -ForegroundColor White
Write-Host "  自定义等待时间: .\start-with-webapp.ps1 -WaitTime 15" -ForegroundColor White 