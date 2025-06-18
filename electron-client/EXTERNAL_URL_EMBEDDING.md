# 外部网站URL嵌入指南

## 基本实现

### 1. 直接嵌入外部URL

```javascript
// 修改switchPage函数支持外部URL
function switchPage(page) {
    const iframe = document.getElementById('contentFrame');
    
    // 判断是否为外部URL
    if (page.startsWith('http://') || page.startsWith('https://')) {
        iframe.src = page;  // 直接使用外部URL
    } else {
        iframe.src = `${page}.html`;  // 本地页面
    }
    
    currentPage = page;
}

// 使用示例
switchPage('https://www.baidu.com');
switchPage('https://github.com');
switchPage('diagnosis');  // 本地页面
```

### 2. 配置化的URL管理

```javascript
// 页面配置
const PAGE_CONFIG = {
    // 本地页面
    diagnosis: { type: 'local', url: 'diagnosis.html', title: '病情分析' },
    record: { type: 'local', url: 'record.html', title: '病历生成' },
    
    // 外部网站
    baidu: { type: 'external', url: 'https://www.baidu.com', title: '百度搜索' },
    github: { type: 'external', url: 'https://github.com', title: 'GitHub' },
    pubmed: { type: 'external', url: 'https://pubmed.ncbi.nlm.nih.gov', title: 'PubMed' },
    
    // 内部系统
    his: { type: 'external', url: 'http://192.168.1.100:8080/his', title: 'HIS系统' },
    pacs: { type: 'external', url: 'http://192.168.1.101:3000/pacs', title: 'PACS系统' }
};

// 增强的页面切换函数
function switchPage(page) {
    const iframe = document.getElementById('contentFrame');
    const config = PAGE_CONFIG[page];
    
    if (!config) {
        console.error('未找到页面配置:', page);
        return;
    }
    
    // 设置iframe源
    iframe.src = config.url;
    
    // 更新标题
    updatePageTitle(config.title);
    
    // 记录当前页面
    currentPage = page;
    
    // 外部URL特殊处理
    if (config.type === 'external') {
        handleExternalPage(config);
    }
}

function handleExternalPage(config) {
    console.log('加载外部页面:', config.title, config.url);
    
    // 可以添加加载状态、错误处理等
    showLoadingIndicator();
    
    const iframe = document.getElementById('contentFrame');
    iframe.onload = function() {
        hideLoadingIndicator();
        console.log('外部页面加载完成');
    };
    
    iframe.onerror = function() {
        hideLoadingIndicator();
        showErrorMessage('页面加载失败: ' + config.url);
    };
}
```

### 3. 导航配置更新

```html
<!-- 在导航按钮中添加外部网站 -->
<div class="nav-items-container" id="navItemsContainer">
    <!-- 本地页面 -->
    <button class="nav-item active no-drag" data-page="diagnosis" data-tooltip="病情分析">
        <div class="nav-icon">🔍</div>
        <div class="nav-text">病情分析</div>
    </button>
    
    <!-- 外部网站 -->
    <button class="nav-item no-drag" data-page="pubmed" data-tooltip="PubMed医学文献">
        <div class="nav-icon">📚</div>
        <div class="nav-text">PubMed</div>
    </button>
    
    <button class="nav-item no-drag" data-page="his" data-tooltip="HIS系统">
        <div class="nav-icon">🏥</div>
        <div class="nav-text">HIS系统</div>
    </button>
    
    <button class="nav-item no-drag" data-page="pacs" data-tooltip="PACS系统">
        <div class="nav-icon">🖼️</div>
        <div class="nav-text">PACS</div>
    </button>
</div>
```

## 高级功能

### 1. URL参数传递

```javascript
// 构建带参数的URL
function buildUrlWithParams(baseUrl, params) {
    const url = new URL(baseUrl);
    
    // 添加参数
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    
    return url.toString();
}

// 使用示例
function switchToHisSystem(patientId) {
    const baseUrl = 'http://192.168.1.100:8080/his';
    const params = {
        patientId: patientId,
        module: 'patient-info',
        token: getCurrentUserToken()
    };
    
    const fullUrl = buildUrlWithParams(baseUrl, params);
    switchPage(fullUrl);
}
```

### 2. 跨域通信

```javascript
// 监听来自iframe的消息
window.addEventListener('message', function(event) {
    // 验证来源
    const allowedOrigins = [
        'http://192.168.1.100:8080',  // HIS系统
        'http://192.168.1.101:3000',  // PACS系统
        'https://pubmed.ncbi.nlm.nih.gov'
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
        console.warn('未授权的消息来源:', event.origin);
        return;
    }
    
    // 处理消息
    const { type, data } = event.data;
    
    switch (type) {
        case 'patient-selected':
            handlePatientSelection(data);
            break;
        case 'navigate-to':
            switchPage(data.page);
            break;
        case 'update-context':
            updateContextInfo(data);
            break;
    }
});

// 向iframe发送消息
function sendMessageToIframe(message) {
    const iframe = document.getElementById('contentFrame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(message, '*');
    }
}
```

### 3. 安全性考虑

```javascript
// 安全的URL验证
function isUrlSafe(url) {
    try {
        const urlObj = new URL(url);
        
        // 只允许HTTP和HTTPS协议
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // 白名单域名检查
        const allowedDomains = [
            'localhost',
            '192.168.1.100',
            '192.168.1.101',
            'pubmed.ncbi.nlm.nih.gov',
            'www.baidu.com'
        ];
        
        return allowedDomains.some(domain => 
            urlObj.hostname === domain || 
            urlObj.hostname.endsWith('.' + domain)
        );
        
    } catch (e) {
        return false;
    }
}

// 安全的页面切换
function switchPageSafe(page) {
    const config = PAGE_CONFIG[page];
    
    if (config && config.type === 'external') {
        if (!isUrlSafe(config.url)) {
            showErrorMessage('不安全的URL: ' + config.url);
            return;
        }
    }
    
    switchPage(page);
}
```

## 医疗场景应用示例

### 1. 集成HIS系统

```javascript
const MEDICAL_SYSTEMS = {
    his: {
        name: 'HIS系统',
        baseUrl: 'http://192.168.1.100:8080/his',
        icon: '🏥',
        modules: {
            'patient-list': '/patient/list',
            'patient-detail': '/patient/detail',
            'medical-record': '/record/view'
        }
    },
    
    pacs: {
        name: 'PACS影像系统',
        baseUrl: 'http://192.168.1.101:3000/pacs',
        icon: '🖼️',
        modules: {
            'image-viewer': '/viewer',
            'report-list': '/reports'
        }
    },
    
    lis: {
        name: 'LIS检验系统',
        baseUrl: 'http://192.168.1.102:8888/lis',
        icon: '🧪',
        modules: {
            'test-results': '/results',
            'test-reports': '/reports'
        }
    }
};

// 打开特定模块
function openMedicalSystem(system, module, params = {}) {
    const systemConfig = MEDICAL_SYSTEMS[system];
    if (!systemConfig) return;
    
    const moduleUrl = systemConfig.modules[module];
    if (!moduleUrl) return;
    
    const fullUrl = buildUrlWithParams(
        systemConfig.baseUrl + moduleUrl, 
        params
    );
    
    switchPage(fullUrl);
}

// 使用示例
function viewPatientInHis(patientId) {
    openMedicalSystem('his', 'patient-detail', { 
        patientId: patientId,
        from: 'ai-assistant'
    });
}
```

### 2. 医学文献检索

```javascript
// PubMed搜索集成
function searchPubMed(query) {
    const pubmedUrl = buildUrlWithParams('https://pubmed.ncbi.nlm.nih.gov/', {
        term: query,
        sort: 'relevance'
    });
    
    switchPage(pubmedUrl);
}

// 根据诊断建议搜索相关文献
function searchRelatedLiterature(diagnosis) {
    const searchQuery = `${diagnosis} treatment guidelines`;
    searchPubMed(searchQuery);
}
```

## 注意事项

### 1. 跨域限制
- 某些网站设置了 `X-Frame-Options` 或 `Content-Security-Policy`
- 这些网站无法在iframe中显示
- 可以通过代理服务器或浏览器设置解决

### 2. 性能考虑
- 外部网站加载速度取决于网络状况
- 建议添加加载指示器和超时处理
- 可以实现页面预加载机制

### 3. 安全性
- 验证URL的安全性
- 实施域名白名单机制
- 谨慎处理跨域消息通信

### 4. 用户体验
- 外部网站可能有不同的UI风格
- 考虑添加返回按钮或面包屑导航
- 提供页面加载状态反馈

## 实际部署建议

对于医疗AI助手项目，建议这样使用外部URL嵌入：

1. **内部系统集成** - HIS、PACS、LIS等医院内部系统
2. **医学资源** - PubMed、医学指南网站等
3. **第三方工具** - 医学计算器、药物查询等
4. **监管平台** - 卫健委相关系统、质控平台等

这样可以将您的AI助手打造成一个统一的医疗工作台，集成所有常用的医疗系统和资源。 