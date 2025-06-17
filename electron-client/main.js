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
    compactSize: { width: 60, height: 800 }, // 折叠时只显示导航栏
    fullSize: { width: 540, height: 800 }, // 展开时显示完整界面
    httpPort: 3000
};

// 创建主窗口
function createWindow() {
    // 获取屏幕尺寸
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 计算窗口高度（适应屏幕高度，留出一些边距）
    const windowHeight = screenHeight - 80;

    mainWindow = new BrowserWindow({
        width: APP_CONFIG.fullSize.width,
        height: windowHeight,
        x: screenWidth - APP_CONFIG.fullSize.width, // 贴右边显示
        y: 40, // 距离顶部40px
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false, // 初始不显示，通过悬浮图标控制
        frame: false, // 去掉边框
        resizable: false, // 固定大小
        minimizable: true, // 允许最小化
        maximizable: false,
        closable: true, // 允许关闭
        alwaysOnTop: false,
        skipTaskbar: false, // 在任务栏显示
        transparent: false,
        titleBarStyle: 'hidden'
    });

    // 加载初始页面
    loadPage(currentTab);

    // 监听控制台消息（应急方案）
    mainWindow.webContents.on('console-message', (event, level, message) => {
        if (message.includes('🔥🔥🔥 MINIMIZE_WINDOW_NOW')) {
            mainWindow.minimize();
        }

        if (message.includes('🔥🔥🔥 CLOSE_WINDOW_NOW')) {
            mainWindow.hide();
            showFloatingWindow();
        }
    });

    // 窗口事件处理
    mainWindow.on('closed', () => {
        mainWindow = null;
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
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        focusable: true,
        acceptFirstMouse: true,
        show: false,
        x: 100,
        y: 100,
        type: process.platform === 'darwin' ? 'panel' : undefined,
        hasShadow: false,
        thickFrame: false
    });

    // 加载悬浮图标页面
    floatingWindow.loadFile(path.join(__dirname, 'pages/floating-icon.html'));

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

    // 窗口显示设置
    floatingWindow.once('ready-to-show', () => {
        floatingWindow.setIgnoreMouseEvents(false);
        floatingWindow.show();
        setTimeout(() => floatingWindow.focus(), 100);
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
        // 确保窗口尺寸适应当前屏幕
        adjustWindowSize();

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

// 调整窗口尺寸以适应当前屏幕
function adjustWindowSize() {
    if (mainWindow) {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const windowHeight = screenHeight - 80;

        const currentBounds = mainWindow.getBounds();
        const targetWidth = isCompactMode ? APP_CONFIG.compactSize.width : APP_CONFIG.fullSize.width;

        mainWindow.setBounds({
            x: screenWidth - targetWidth,
            y: 40,
            width: targetWidth,
            height: windowHeight
        });
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
    // 始终使用新的主界面布局
    const pagePath = path.join(__dirname, 'pages/main-layout.html');
    mainWindow.loadFile(pagePath);
    currentTab = tabName;
}

// 切换紧凑模式（现在通过toggle-sidebar IPC处理，这里保留兼容性）
function toggleCompactMode() {
    // 这个功能现在通过新界面的fold按钮和toggle-sidebar IPC处理
    // 保留这个函数是为了与托盘菜单兼容
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript('toggleCollapse()');
    }
}

// 切换Tab
function switchTab(tabName) {
    currentTab = tabName;

    // 确保窗口可见
    showWindow();

    // 向页面发送Tab切换消息
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('tab-params', { tabName });
    }

    // 显示通知
    if (tray) {
        tray.displayBalloon({
            iconType: 'info',
            title: '页面切换',
            content: `已切换到：${getTabDisplayName(tabName)}`
        });
    }
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

// 窗口控制相关IPC
ipcMain.handle('window-minimize', async () => {
    if (mainWindow) {
        mainWindow.minimize();
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('window-close', async () => {
    if (mainWindow) {
        mainWindow.hide();
        showFloatingWindow();
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('window-pin', async () => {
    if (mainWindow) {
        const isOnTop = mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(!isOnTop);
        return { success: true, pinned: !isOnTop };
    }
    return { success: false };
});

ipcMain.handle('toggle-sidebar', async () => {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowHeight = screenHeight - 80;

    if (mainWindow) {
        const currentBounds = mainWindow.getBounds();

        if (currentBounds.width === APP_CONFIG.fullSize.width) {
            // 切换到折叠模式
            mainWindow.setBounds({
                x: screenWidth - APP_CONFIG.compactSize.width,
                y: 40,
                width: APP_CONFIG.compactSize.width,
                height: windowHeight
            });
            isCompactMode = true;
        } else {
            // 切换到展开模式
            mainWindow.setBounds({
                x: screenWidth - APP_CONFIG.fullSize.width,
                y: 40,
                width: APP_CONFIG.fullSize.width,
                height: windowHeight
            });
            isCompactMode = false;
        }

        // 确保窗口高度始终适应当前屏幕
        if (currentBounds.height !== windowHeight) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({
                ...bounds,
                height: windowHeight
            });
        }

        return { success: true, isCompact: isCompactMode };
    }
    return { success: false };
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