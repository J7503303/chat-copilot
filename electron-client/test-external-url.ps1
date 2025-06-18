# 测试外部URL嵌入功能
# 演示如何在医疗AI助手中嵌入外部网站

Write-Host "=== 外部URL嵌入功能测试 ===" -ForegroundColor Green
Write-Host ""

# 测试网站列表
$testUrls = @(
    @{ Name = "百度搜索"; Url = "https://www.baidu.com"; Category = "搜索引擎" },
    @{ Name = "PubMed医学文献"; Url = "https://pubmed.ncbi.nlm.nih.gov"; Category = "医学资源" },
    @{ Name = "GitHub"; Url = "https://github.com"; Category = "开发工具" },
    @{ Name = "丁香园"; Url = "https://www.dxy.cn"; Category = "医学社区" },
    @{ Name = "医学百科"; Url = "https://www.wiki8.cn"; Category = "医学资源" }
)

Write-Host "可测试的外部网站:" -ForegroundColor Yellow
for ($i = 0; $i -lt $testUrls.Count; $i++) {
    $site = $testUrls[$i]
    Write-Host "  $($i + 1). $($site.Name) - $($site.Category)" -ForegroundColor Cyan
    Write-Host "     URL: $($site.Url)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "测试步骤:" -ForegroundColor Yellow
Write-Host "1. 启动Electron应用" -ForegroundColor White
Write-Host "2. 在浏览器控制台中执行以下命令测试:" -ForegroundColor White
Write-Host ""

# 生成测试命令
Write-Host "// 测试外部URL嵌入" -ForegroundColor Green
Write-Host "function testExternalUrl(url) {" -ForegroundColor Gray
Write-Host "    const iframe = document.getElementById('contentFrame');" -ForegroundColor Gray
Write-Host "    if (iframe) {" -ForegroundColor Gray
Write-Host "        iframe.src = url;" -ForegroundColor Gray
Write-Host "        console.log('正在加载外部URL:', url);" -ForegroundColor Gray
Write-Host "    }" -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""

foreach ($site in $testUrls) {
    Write-Host "// 测试 $($site.Name)" -ForegroundColor Green
    Write-Host "testExternalUrl('$($site.Url)');" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "高级测试命令:" -ForegroundColor Yellow
Write-Host ""

# 带参数的URL测试
Write-Host "// PubMed搜索测试" -ForegroundColor Green
Write-Host "function searchPubMed(query) {" -ForegroundColor Gray
Write-Host "    const url = 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(query);" -ForegroundColor Gray
Write-Host "    testExternalUrl(url);" -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""
Write-Host "// 使用示例" -ForegroundColor Green
Write-Host "searchPubMed('diabetes treatment');" -ForegroundColor Cyan
Write-Host "searchPubMed('hypertension guidelines');" -ForegroundColor Cyan
Write-Host ""

# iframe通信测试
Write-Host "// 测试iframe通信" -ForegroundColor Green
Write-Host "window.addEventListener('message', function(event) {" -ForegroundColor Gray
Write-Host "    console.log('收到iframe消息:', event.data);" -ForegroundColor Gray
Write-Host "    console.log('消息来源:', event.origin);" -ForegroundColor Gray
Write-Host "});" -ForegroundColor Gray
Write-Host ""

Write-Host "注意事项:" -ForegroundColor Red
Write-Host "1. 某些网站可能设置了X-Frame-Options，无法在iframe中显示" -ForegroundColor Yellow
Write-Host "2. HTTPS网站在iframe中加载HTTP内容可能被阻止" -ForegroundColor Yellow
Write-Host "3. 跨域通信需要目标网站支持postMessage" -ForegroundColor Yellow
Write-Host ""

Write-Host "启动应用进行测试..." -ForegroundColor Green

# 启动Electron应用
try {
    $electronPath = "electron-client"
    if (Test-Path $electronPath) {
        Set-Location $electronPath
        Write-Host "正在启动Electron应用..." -ForegroundColor Cyan
        
        # 检查是否有package.json
        if (Test-Path "package.json") {
            npm start
        } else {
            electron .
        }
    } else {
        Write-Host "错误: 未找到electron-client目录" -ForegroundColor Red
        Write-Host "请在chat-copilot根目录下运行此脚本" -ForegroundColor Yellow
    }
} catch {
    Write-Host "启动失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请手动启动应用后在浏览器控制台中测试上述命令" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "测试完成！" -ForegroundColor Green 