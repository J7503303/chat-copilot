const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');

let mainWindow;
let floatingWindow;
let tray;
let isCompactMode = false;
let currentTab = 'chat';
let httpServer;

// 应用配置
const APP_CONFIG = {
    compactSize: { width: 1200, height: 120 },
    fullSize: { width: 1200, height: 800 },
    httpPort: 3000
};

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: APP_CONFIG.fullSize.width,
        height: APP_CONFIG.fullSize.height,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false, // 初始不显示，通过悬浮图标控制
        frame: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
        alwaysOnTop: false,
        skipTaskbar: false // 在任务栏显示
    });

    // 加载初始页面
    loadPage(currentTab);

    // 窗口事件处理
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 最小化时隐藏窗口，显示悬浮图标
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
        showFloatingWindow();
    });

    // 关闭窗口时隐藏到悬浮图标
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
            showFloatingWindow();
        }
    });
}

// 创建悬浮窗口
function createFloatingWindow() {
    floatingWindow = new BrowserWindow({
        width: 120,
        height: 120,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        },
        frame: false, // 无边框
        transparent: true, // 透明背景
        alwaysOnTop: true, // 始终置顶
        skipTaskbar: true, // 不在任务栏显示
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        focusable: true, // 必须为true才能接收事件
        acceptFirstMouse: true, // 允许第一次点击
        show: false,
        x: 100,
        y: 100,
        // 关键：确保窗口可以接收鼠标事件
        type: process.platform === 'darwin' ? 'panel' : undefined,
        hasShadow: false,
        thickFrame: false
    });

    // 加载悬浮图标页面
    floatingWindow.loadFile(path.join(__dirname, 'pages/floating-icon.html'));

    // 生产环境不自动打开开发者工具

    // 悬浮窗口事件处理
    floatingWindow.on('closed', () => {
        floatingWindow = null;
    });

    // 禁用右键菜单
    floatingWindow.on('system-context-menu', (event, point) => {
        event.preventDefault();
    });

    floatingWindow.webContents.on('context-menu', (e, params) => {
        e.preventDefault();
        return false;
    });

    // 移除可能干扰鼠标事件的监听器

    // 确保鼠标事件正常工作（用于拖动和点击）
    floatingWindow.setIgnoreMouseEvents(false);
    
    // 确保窗口可以接收鼠标事件
    floatingWindow.once('ready-to-show', () => {
        floatingWindow.setIgnoreMouseEvents(false);
        floatingWindow.show();
        
        setTimeout(() => {
            floatingWindow.focus();
        }, 100);
    });

    // 窗口就绪后的设置
    floatingWindow.webContents.once('dom-ready', () => {
        // 注入CSS - 确保鼠标事件可用
        floatingWindow.webContents.insertCSS(`
            * {
                -webkit-user-select: none !important;
                user-select: none !important;
                pointer-events: auto !important;
            }
            body {
                pointer-events: auto !important;
            }
            .floating-icon {
                cursor: move !important;
                pointer-events: auto !important;
            }
        `);

        // 注入基础事件处理
        floatingWindow.webContents.executeJavaScript(`
            // 禁用右键菜单
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, false);
            
            // 禁用文本选择
            document.addEventListener('selectstart', function(e) {
                e.preventDefault();
                return false;
            }, false);
        `);
    });
}

// 创建系统托盘
function createTray() {
    // 托盘图标路径
    const trayIconPath = path.join(__dirname, 'assets/tray-icon.png');
    
    tray = new Tray(trayIconPath);
    
    // 托盘提示文本
    tray.setToolTip('医疗AI助手 - 点击打开');
    
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示主窗口',
            click: () => {
                showWindow();
            }
        },
        {
            label: '紧凑模式',
            type: 'checkbox',
            checked: isCompactMode,
            click: () => {
                toggleCompactMode();
            }
        },
        { type: 'separator' },
        {
            label: '快速切换',
            submenu: [
                {
                    label: '💬 智能问诊',
                    click: () => switchTab('chat')
                },
                {
                    label: '🔍 病情分析',
                    click: () => switchTab('diagnosis')
                },
                {
                    label: '📋 检验解读',
                    click: () => switchTab('report')
                },
                {
                    label: '📝 病历生成',
                    click: () => switchTab('record')
                },
                {
                    label: '✅ 病历质控',
                    click: () => switchTab('quality')
                },
                {
                    label: '📁 文档管理',
                    click: () => switchTab('documents')
                }
            ]
        },
        { type: 'separator' },
        {
            label: '设置',
            click: () => {
                // 打开设置页面
                shell.openExternal('http://localhost:3000/settings');
            }
        },
        {
            label: '关于',
            click: () => {
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '关于医疗AI助手',
                    message: '医疗AI助手 v1.0.0',
                    detail: '智能医疗辅助诊断系统\n\n开发者：您的团队\n技术支持：support@medical-ai.com'
                });
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
    
    // 单击托盘图标显示/隐藏窗口
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            showWindow();
        }
    });
    
    // 双击托盘图标切换紧凑模式
    tray.on('double-click', () => {
        toggleCompactMode();
    });
}

// 显示主窗口
function showWindow() {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        
        // 如果窗口被最小化，恢复它
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        
        // 隐藏悬浮窗口
        hideFloatingWindow();
    }
}

// 显示悬浮窗口
function showFloatingWindow() {
    if (floatingWindow) {
        floatingWindow.show();
        
        // 获取屏幕尺寸，设置默认位置（右上角）
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        floatingWindow.setPosition(width - 120, 50);
    }
}

// 隐藏悬浮窗口
function hideFloatingWindow() {
    if (floatingWindow) {
        floatingWindow.hide();
    }
}

// 加载页面
function loadPage(tabName) {
    let pagePath;
    
    if (isCompactMode) {
        pagePath = path.join(__dirname, 'pages/navigation.html');
    } else {
        switch (tabName) {
            case 'chat':
                pagePath = path.join(__dirname, 'pages/chat-page.html');
                break;
            case 'diagnosis':
                pagePath = path.join(__dirname, 'pages/diagnosis.html');
                break;
            case 'report':
                pagePath = path.join(__dirname, 'pages/report.html');
                break;
            case 'record':
                pagePath = path.join(__dirname, 'pages/record.html');
                break;
            case 'quality':
                pagePath = path.join(__dirname, 'pages/quality.html');
                break;
            case 'documents':
                pagePath = path.join(__dirname, 'pages/documents.html');
                break;
            default:
                pagePath = path.join(__dirname, 'pages/chat-page.html');
        }
    }
    
    mainWindow.loadFile(pagePath);
    currentTab = tabName;
}

// 切换紧凑模式
function toggleCompactMode() {
    isCompactMode = !isCompactMode;
    
    if (isCompactMode) {
        // 切换到紧凑模式
        mainWindow.setSize(APP_CONFIG.compactSize.width, APP_CONFIG.compactSize.height);
        mainWindow.setResizable(false);
        loadPage('navigation');
        
        // 更新托盘菜单
        updateTrayMenu();
        
        // 显示通知
        tray.displayBalloon({
            iconType: 'info',
            title: '紧凑模式',
            content: '已切换到紧凑模式，只显示导航栏'
        });
    } else {
        // 切换到完整模式
        mainWindow.setSize(APP_CONFIG.fullSize.width, APP_CONFIG.fullSize.height);
        mainWindow.setResizable(true);
        loadPage(currentTab);
        
        // 更新托盘菜单
        updateTrayMenu();
        
        // 显示通知
        tray.displayBalloon({
            iconType: 'info',
            title: '完整模式',
            content: `已切换到完整模式，当前页面：${getTabDisplayName(currentTab)}`
        });
    }
    
    // 确保窗口可见
    showWindow();
}

// 切换Tab
function switchTab(tabName) {
    currentTab = tabName;
    
    if (!isCompactMode) {
        loadPage(tabName);
    } else {
        // 如果在紧凑模式，先切换到完整模式
        isCompactMode = false;
        mainWindow.setSize(APP_CONFIG.fullSize.width, APP_CONFIG.fullSize.height);
        mainWindow.setResizable(true);
        loadPage(tabName);
        updateTrayMenu();
    }
    
    showWindow();
    
    // 显示通知
    tray.displayBalloon({
        iconType: 'info',
        title: '页面切换',
        content: `已切换到：${getTabDisplayName(tabName)}`
    });
}

// 获取Tab显示名称
function getTabDisplayName(tabName) {
    const tabNames = {
        'chat': '智能问诊',
        'diagnosis': '病情分析',
        'report': '检验解读',
        'record': '病历生成',
        'quality': '病历质控',
        'documents': '文档管理'
    };
    return tabNames[tabName] || tabName;
}

// 更新托盘菜单
function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示主窗口',
            click: () => showWindow()
        },
        {
            label: '紧凑模式',
            type: 'checkbox',
            checked: isCompactMode,
            click: () => toggleCompactMode()
        },
        { type: 'separator' },
        {
            label: '快速切换',
            submenu: [
                {
                    label: '💬 智能问诊',
                    type: 'radio',
                    checked: currentTab === 'chat',
                    click: () => switchTab('chat')
                },
                {
                    label: '🔍 病情分析',
                    type: 'radio',
                    checked: currentTab === 'diagnosis',
                    click: () => switchTab('diagnosis')
                },
                {
                    label: '📋 检验解读',
                    type: 'radio',
                    checked: currentTab === 'report',
                    click: () => switchTab('report')
                },
                {
                    label: '📝 病历生成',
                    type: 'radio',
                    checked: currentTab === 'record',
                    click: () => switchTab('record')
                },
                {
                    label: '✅ 病历质控',
                    type: 'radio',
                    checked: currentTab === 'quality',
                    click: () => switchTab('quality')
                },
                {
                    label: '📁 文档管理',
                    type: 'radio',
                    checked: currentTab === 'documents',
                    click: () => switchTab('documents')
                }
            ]
        },
        { type: 'separator' },
        {
            label: '设置',
            click: () => {
                shell.openExternal('http://localhost:3000/settings');
            }
        },
        {
            label: '关于',
            click: () => {
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '关于医疗AI助手',
                    message: '医疗AI助手 v1.0.0',
                    detail: '智能医疗辅助诊断系统\n\n开发者：您的团队\n技术支持：support@medical-ai.com'
                });
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

// 创建本地HTTP服务
function createHttpServer() {
    const server = express();
    server.use(cors());
    server.use(express.json());
    
    // 第三方系统调用接口
    server.post('/api/switch-tab', (req, res) => {
        const { tabName, params = {}, windowMode } = req.body;
        
        try {
            // 切换Tab
            switchTab(tabName);
            
            // 设置窗口模式
            if (windowMode === 'compact' && !isCompactMode) {
                toggleCompactMode();
            } else if (windowMode === 'full' && isCompactMode) {
                toggleCompactMode();
            }
            
            // 向页面发送参数
            if (mainWindow && Object.keys(params).length > 0) {
                mainWindow.webContents.send('tab-params', { tabName, params });
            }
            
            res.json({
                success: true,
                currentTab: tabName,
                windowMode: isCompactMode ? 'compact' : 'full',
                message: `已切换到${getTabDisplayName(tabName)}`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // 获取当前状态
    server.get('/api/status', (req, res) => {
        res.json({
            currentTab,
            windowMode: isCompactMode ? 'compact' : 'full',
            isVisible: mainWindow ? mainWindow.isVisible() : false
        });
    });
    
    // 控制窗口显示/隐藏
    server.post('/api/window/toggle', (req, res) => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            showWindow();
        }
        
        res.json({
            success: true,
            isVisible: mainWindow.isVisible()
        });
    });
    
    httpServer = server.listen(APP_CONFIG.httpPort, 'localhost', () => {
        console.log(`医疗AI助手HTTP服务已启动: http://localhost:${APP_CONFIG.httpPort}`);
    });
}

// IPC事件处理
ipcMain.handle('toggle-compact-mode', async () => {
    toggleCompactMode();
    return isCompactMode;
});

ipcMain.handle('switch-tab', async (event, tabName) => {
    switchTab(tabName);
    return { success: true, currentTab: tabName };
});

ipcMain.handle('quick-action', async (event, action) => {
    console.log('快速操作:', action);
    // 处理快速操作逻辑
    return { success: true, action };
});

// 悬浮窗口相关IPC
ipcMain.handle('show-main-window', async () => {
    showWindow();
    return { success: true };
});

ipcMain.handle('hide-floating-icon', async () => {
    hideFloatingWindow();
    return { success: true };
});

ipcMain.handle('exit-app', async () => {
    app.isQuiting = true;
    app.quit();
    return { success: true };
});

ipcMain.handle('set-floating-position', async (event, x, y) => {
    if (floatingWindow) {
        floatingWindow.setPosition(x, y);
        return { success: true, position: { x, y } };
    }
    return { success: false };
});

ipcMain.handle('get-window-position', async () => {
    if (floatingWindow) {
        const position = floatingWindow.getPosition();
        return { success: true, x: position[0], y: position[1] };
    }
    return { success: false };
});

// 应用事件处理
app.whenReady().then(() => {
    createWindow();
    createFloatingWindow();
    createTray();
    createHttpServer();
    
    // 启动时显示悬浮图标
    showFloatingWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            createFloatingWindow();
        } else {
            showWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // 在macOS上，保持应用运行即使所有窗口都关闭了
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuiting = true;
    
    // 关闭HTTP服务器
    if (httpServer) {
        httpServer.close();
    }
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // 当运行第二个实例时，聚焦到主窗口
        if (mainWindow) {
            showWindow();
        }
    });
} 