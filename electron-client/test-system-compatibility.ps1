#!/usr/bin/env pwsh

# 系统兼容性测试脚本

Write-Host "=== 系统兼容性测试 ===" -ForegroundColor Green
Write-Host ""

# 获取系统信息
$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
$computerInfo = Get-CimInstance -ClassName Win32_ComputerSystem
$processorInfo = Get-CimInstance -ClassName Win32_Processor

Write-Host "当前系统信息:" -ForegroundColor Cyan
Write-Host "  操作系统: $($osInfo.Caption)" -ForegroundColor Gray
Write-Host "  版本号: $($osInfo.Version)" -ForegroundColor Gray
Write-Host "  构建号: $($osInfo.BuildNumber)" -ForegroundColor Gray
Write-Host "  架构: $($osInfo.OSArchitecture)" -ForegroundColor Gray
Write-Host "  计算机名: $($computerInfo.Name)" -ForegroundColor Gray
Write-Host "  总内存: $([math]::Round($computerInfo.TotalPhysicalMemory / 1GB, 2)) GB" -ForegroundColor Gray
Write-Host "  处理器: $($processorInfo.Name)" -ForegroundColor Gray
Write-Host "  核心数: $($processorInfo.NumberOfCores)" -ForegroundColor Gray
Write-Host ""

# Electron 28.0.0 兼容性检查
Write-Host "Electron 28.0.0 兼容性检查:" -ForegroundColor Yellow

# 检查Windows版本
$buildNumber = [int]$osInfo.BuildNumber
$version = [System.Version]$osInfo.Version

if ($version.Major -ge 10) {
    if ($buildNumber -ge 17763) {
        Write-Host "  ✅ Windows版本: 兼容 (Windows 10 1809+/Windows 11)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Windows版本: 不兼容 (需要Windows 10 1809或更高版本)" -ForegroundColor Red
        Write-Host "     当前构建号: $buildNumber, 需要: 17763+" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ Windows版本: 不兼容 (需要Windows 10或更高版本)" -ForegroundColor Red
}

# 检查架构
$arch = $osInfo.OSArchitecture
if ($arch -eq "64-bit" -or $arch -eq "ARM64") {
    Write-Host "  ✅ 系统架构: 兼容 ($arch)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 系统架构: 不兼容 (需要64-bit或ARM64)" -ForegroundColor Red
}

# 检查内存
$totalMemoryGB = [math]::Round($computerInfo.TotalPhysicalMemory / 1GB, 2)
if ($totalMemoryGB -ge 4) {
    Write-Host "  ✅ 系统内存: 充足 ($totalMemoryGB GB)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  系统内存: 不足 ($totalMemoryGB GB, 建议4GB+)" -ForegroundColor Yellow
}

Write-Host ""

# Node.js/Electron功能测试
Write-Host "Node.js功能测试:" -ForegroundColor Yellow

# 检查PowerShell版本
$psVersion = $PSVersionTable.PSVersion
Write-Host "  PowerShell版本: $psVersion" -ForegroundColor Gray

# 检查.NET Framework
try {
    $netVersions = Get-ChildItem "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP" -Recurse |
                   Get-ItemProperty -Name Version -ErrorAction SilentlyContinue |
                   Where-Object { $_.PSChildName -match '^(?!S)\p{L}' } |
                   Select-Object PSChildName, Version |
                   Sort-Object Version -Descending

    if ($netVersions) {
        $latestNet = $netVersions[0]
        Write-Host "  .NET Framework: $($latestNet.PSChildName) ($($latestNet.Version))" -ForegroundColor Gray
    }
} catch {
    Write-Host "  .NET Framework: 检测失败" -ForegroundColor Yellow
}

Write-Host ""

# 网络和端口测试
Write-Host "网络功能测试:" -ForegroundColor Yellow

# 测试端口可用性
$testPorts = @(19876, 19877, 19878)
foreach ($port in $testPorts) {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $port)
        $tcpClient.Close()
        Write-Host "  端口 $port`: 被占用" -ForegroundColor Yellow
    } catch {
        Write-Host "  端口 $port`: 可用" -ForegroundColor Green
    }
}

# 测试网络连接
try {
    $ping = Test-Connection -ComputerName "localhost" -Count 1 -Quiet
    if ($ping) {
        Write-Host "  本地回环: 正常" -ForegroundColor Green
    } else {
        Write-Host "  本地回环: 异常" -ForegroundColor Red
    }
} catch {
    Write-Host "  本地回环: 测试失败" -ForegroundColor Yellow
}

Write-Host ""

# 权限检查
Write-Host "权限检查:" -ForegroundColor Yellow

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-Host "  管理员权限: 是 (当前以管理员身份运行)" -ForegroundColor Green
} else {
    Write-Host "  管理员权限: 否 (以普通用户身份运行)" -ForegroundColor Gray
}

# 检查用户文件夹写入权限
$userProfile = $env:USERPROFILE
try {
    $testFile = Join-Path $userProfile "test_write_permission.tmp"
    "test" | Out-File -FilePath $testFile -ErrorAction Stop
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Write-Host "  用户目录写入: 正常" -ForegroundColor Green
} catch {
    Write-Host "  用户目录写入: 异常" -ForegroundColor Red
}

Write-Host ""

# 兼容性总结
Write-Host "=== 兼容性总结 ===" -ForegroundColor Green

$compatible = $true
$warnings = @()

if ($version.Major -lt 10 -or ($version.Major -eq 10 -and $buildNumber -lt 17763)) {
    $compatible = $false
    Write-Host "❌ 系统版本不兼容" -ForegroundColor Red
}

if ($arch -ne "64-bit" -and $arch -ne "ARM64") {
    $compatible = $false
    Write-Host "❌ 系统架构不兼容" -ForegroundColor Red
}

if ($totalMemoryGB -lt 4) {
    $warnings += "内存不足"
    Write-Host "⚠️  内存可能不足" -ForegroundColor Yellow
}

if ($compatible) {
    Write-Host "✅ 系统完全兼容 Electron 28.0.0" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  注意事项: $($warnings -join ', ')" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 系统不兼容，建议升级系统或降级Electron版本" -ForegroundColor Red
}

Write-Host ""

# 建议
Write-Host "建议:" -ForegroundColor Cyan
if ($version.Major -lt 10) {
    Write-Host "  - 升级到 Windows 10 1809 或 Windows 11" -ForegroundColor Gray
} elseif ($buildNumber -lt 17763) {
    Write-Host "  - 更新 Windows 10 到 1809 版本或更高" -ForegroundColor Gray
}

if ($totalMemoryGB -lt 4) {
    Write-Host "  - 考虑增加系统内存到 4GB 或更高" -ForegroundColor Gray
}

Write-Host "  - 定期更新 Windows 系统补丁" -ForegroundColor Gray
Write-Host "  - 确保防火墙允许应用程序网络访问" -ForegroundColor Gray
Write-Host "  - 如需支持更老系统，可考虑降级到 Electron 22.x" -ForegroundColor Gray

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green 