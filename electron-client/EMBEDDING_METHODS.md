# 页面嵌入方式对比分析

## 当前方案：iframe 嵌入

### 实现方式
```html
<!-- 主布局 -->
<div class="main-content">
    <iframe id="contentFrame" class="content-iframe" src="diagnosis.html"></iframe>
</div>
```

```javascript
// 页面切换
function switchPage(page) {
    const iframe = document.getElementById('contentFrame');
    iframe.src = `${page}.html`;
    
    // 页面加载后传递上下文
    iframe.onload = function () {
        try {
            if (iframe.contentWindow && iframe.contentWindow.setContextInfo) {
                iframe.contentWindow.setContextInfo(contextInfo);
            }
        } catch (e) {
            console.log('跨域访问限制');
        }
    };
}
```

### 优缺点分析

#### ✅ 优点
- **完全隔离** - CSS、JS作用域完全独立
- **简单开发** - 每个页面独立开发，类似传统网站
- **易于维护** - 页面间不会相互影响
- **调试友好** - 可以单独打开页面进行调试
- **团队协作** - 不同开发者可以独立开发不同页面

#### ❌ 缺点
- **通信复杂** - 需要通过postMessage或contentWindow通信
- **性能开销** - 每次切换重新加载整个页面
- **状态丢失** - 页面切换时丢失用户输入和状态
- **资源重复** - 每个页面重复加载相同的库和资源

## 替代方案

### 1. 动态内容加载 (AJAX/Fetch)

```html
<!-- 主布局 -->
<div class="main-content">
    <div id="contentContainer" class="content-container"></div>
</div>
```

```javascript
// 页面切换
async function switchPage(page) {
    try {
        const response = await fetch(`pages/${page}.html`);
        const html = await response.text();
        
        // 提取body内容
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;
        
        // 更新容器内容
        document.getElementById('contentContainer').innerHTML = bodyContent;
        
        // 执行页面脚本
        executePageScripts(doc);
        
    } catch (error) {
        console.error('页面加载失败:', error);
    }
}

function executePageScripts(doc) {
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
            newScript.src = script.src;
        } else {
            newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
    });
}
```

#### ✅ 优点
- **性能更好** - 只加载内容，不重新创建iframe
- **状态保持** - 可以保持全局状态
- **通信简单** - 直接访问全局变量和函数
- **资源共享** - 共享CSS和JS资源

#### ❌ 缺点
- **样式冲突** - CSS可能相互影响
- **全局污染** - JavaScript变量可能冲突
- **复杂性增加** - 需要手动管理脚本执行

### 2. 组件化方式 (类似Vue/React)

```javascript
// 页面组件定义
const PageComponents = {
    diagnosis: {
        template: `
            <div class="diagnosis-page">
                <h1>病情分析</h1>
                <div class="analysis-content">
                    <!-- 页面内容 -->
                </div>
            </div>
        `,
        init: function() {
            // 页面初始化逻辑
        },
        destroy: function() {
            // 页面销毁逻辑
        }
    },
    
    record: {
        template: `
            <div class="record-page">
                <h1>病历生成</h1>
                <!-- 页面内容 -->
            </div>
        `,
        init: function() {
            // 页面初始化逻辑
        }
    }
};

// 页面切换
function switchPage(page) {
    const container = document.getElementById('contentContainer');
    const component = PageComponents[page];
    
    if (component) {
        // 销毁当前页面
        if (currentPageComponent && currentPageComponent.destroy) {
            currentPageComponent.destroy();
        }
        
        // 加载新页面
        container.innerHTML = component.template;
        
        // 初始化新页面
        if (component.init) {
            component.init();
        }
        
        currentPageComponent = component;
    }
}
```

#### ✅ 优点
- **轻量级** - 无iframe开销
- **状态管理** - 更好的状态控制
- **性能优秀** - 快速切换
- **现代化** - 类似现代前端框架

#### ❌ 缺点
- **开发复杂** - 需要手动管理组件生命周期
- **样式管理** - 需要careful的CSS命名空间
- **调试困难** - 不能单独调试页面

### 3. Web Components 方式

```javascript
// 定义自定义元素
class DiagnosisPage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                /* 页面样式 */
                .container { padding: 20px; }
            </style>
            <div class="container">
                <h1>病情分析</h1>
                <!-- 页面内容 -->
            </div>
        `;
        
        // 初始化逻辑
        this.init();
    }
    
    init() {
        // 页面初始化
    }
    
    setContextInfo(info) {
        // 接收上下文信息
        this.contextInfo = info;
        this.render();
    }
}

// 注册组件
customElements.define('diagnosis-page', DiagnosisPage);

// 页面切换
function switchPage(page) {
    const container = document.getElementById('contentContainer');
    container.innerHTML = `<${page}-page></${page}-page>`;
    
    // 传递上下文信息
    const pageElement = container.querySelector(`${page}-page`);
    if (pageElement && pageElement.setContextInfo) {
        pageElement.setContextInfo(contextInfo);
    }
}
```

#### ✅ 优点
- **标准化** - 基于Web标准
- **样式隔离** - Shadow DOM提供样式隔离
- **可复用** - 真正的组件化
- **现代化** - 符合Web Components标准

#### ❌ 缺点
- **兼容性** - 需要现代浏览器支持
- **学习成本** - 需要了解Web Components API
- **调试复杂** - Shadow DOM调试相对困难

## 推荐方案

### 对于当前项目的建议

考虑到您的项目特点（医疗AI助手、Electron应用、团队开发），我推荐以下方案：

#### 1. 保持当前 iframe 方案（推荐）
- **适合场景**: 页面功能相对独立、团队协作开发
- **改进建议**: 优化通信机制、添加页面缓存

#### 2. 混合方案
- **简单页面**: 使用动态内容加载
- **复杂页面**: 继续使用iframe
- **共享组件**: 使用Web Components

### iframe 方案优化建议

```javascript
// 优化的页面切换逻辑
class PageManager {
    constructor() {
        this.pageCache = new Map();
        this.currentPage = null;
    }
    
    async switchPage(page) {
        // 缓存机制
        if (this.pageCache.has(page)) {
            const cachedIframe = this.pageCache.get(page);
            this.showIframe(cachedIframe);
        } else {
            await this.loadNewPage(page);
        }
    }
    
    async loadNewPage(page) {
        const iframe = document.createElement('iframe');
        iframe.src = `${page}.html`;
        iframe.className = 'content-iframe';
        
        // 预加载
        await new Promise((resolve) => {
            iframe.onload = resolve;
        });
        
        // 缓存页面
        this.pageCache.set(page, iframe);
        this.showIframe(iframe);
    }
    
    showIframe(iframe) {
        const container = document.getElementById('contentContainer');
        
        // 隐藏当前页面
        if (this.currentPage) {
            this.currentPage.style.display = 'none';
        }
        
        // 显示新页面
        container.appendChild(iframe);
        iframe.style.display = 'block';
        this.currentPage = iframe;
        
        // 传递上下文信息
        this.updateContext(iframe);
    }
}
```

## 总结

当前的iframe方案对于您的项目来说是合适的选择，特别是在以下情况下：
- 页面功能相对独立
- 团队多人协作开发
- 需要样式和逻辑完全隔离
- 医疗应用对稳定性要求高

如果需要优化，建议添加页面缓存机制，而不是完全更换架构。 