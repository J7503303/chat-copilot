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
    compactSize: { width: 60 }, // 折叠时只显示导航栏
    fullSize: { width: 540 }, // 展开时显示完整界面
    httpPort: 19876, // 改为不易冲突的端口
    marginTop: 5, // 距离工作区顶部的小边距
    marginBottom: 5 // 距离工作区底部的小边距，避免与任务栏冲突
};

// 创建主窗口
function createWindow() {
    // 获取屏幕尺寸
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    // 使用工作区尺寸，避免与任务栏等系统UI冲突
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 计算窗口高度（充分利用工作区高度，减少边距）
    const windowHeight = screenHeight - APP_CONFIG.marginTop - APP_CONFIG.marginBottom;

    mainWindow = new BrowserWindow({
        width: APP_CONFIG.fullSize.width,
        height: windowHeight,
        x: screenWidth - APP_CONFIG.fullSize.width, // 贴右边显示
        y: APP_CONFIG.marginTop, // 距离顶部边距
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
        alwaysOnTop: true,
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
                shell.openExternal(`http://localhost:${APP_CONFIG.httpPort}/settings`);
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
        // 只在窗口首次显示或屏幕分辨率改变时调整窗口尺寸
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const windowHeight = screenHeight - 80;
        const currentBounds = mainWindow.getBounds();

        // 只有当屏幕尺寸变化时才调整窗口位置
        if (currentBounds.height !== windowHeight) {
            adjustWindowSize();
        }

        // 如果窗口被最小化，先恢复它
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.show();
        mainWindow.focus();

        // 隐藏悬浮窗口
        hideFloatingWindow();
    }
}

// 调整窗口尺寸以适应当前屏幕
function adjustWindowSize() {
    if (mainWindow) {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        // 使用工作区尺寸，避免与任务栏等系统UI冲突
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const windowHeight = screenHeight - APP_CONFIG.marginTop - APP_CONFIG.marginBottom;

        const currentBounds = mainWindow.getBounds();
        const targetWidth = isCompactMode ? APP_CONFIG.compactSize.width : APP_CONFIG.fullSize.width;

        mainWindow.setBounds({
            x: screenWidth - targetWidth,
            y: APP_CONFIG.marginTop,
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
        // 使用工作区尺寸，避免与任务栏等系统UI冲突
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
    if (mainWindow) {
        // 如果窗口被最小化，先恢复它
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
        mainWindow.focus();

        // 隐藏悬浮窗口
        hideFloatingWindow();
    }

    // 向页面发送Tab切换消息
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('tab-params', { tabName });
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
                shell.openExternal(`http://localhost:${APP_CONFIG.httpPort}/settings`);
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

    // 移除了 /api/switch-tab 接口 - 功能已由 /api/v1/navigate 替代

    // 获取当前状态
    server.get('/api/status', (req, res) => {
        res.json({
            currentTab,
            windowMode: isCompactMode ? 'compact' : 'full',
            isVisible: mainWindow ? mainWindow.isVisible() : false
        });
    });

    // 移除了 /api/window/toggle 接口 - 窗口控制已集成到 /api/v1/navigate 中

    // 统一的GET接口 - 支持页面切换和参数传递
    server.get('/api/v1/navigate', (req, res) => {
        try {
            const {
                page,           // 页面名称 (chat|diagnosis|report|record|quality|documents)
                doctor_id,      // 医生ID
                doctor_code,    // 医生编码
                doctor_name,    // 医生姓名
                dept_id,        // 科室ID
                dept_code,      // 科室编码
                dept_name,      // 科室名称
                patient_id,     // 患者ID
                patient_name,   // 患者姓名
                patient_bed,    // 床位号
                patient_sex,    // 患者性别
                patient_age,    // 患者年龄
                window_mode     // 窗口模式 (compact|full)
            } = req.query;

            // 验证页面参数
            const validPages = ['chat', 'diagnosis', 'report', 'record', 'quality', 'documents'];
            if (page && !validPages.includes(page)) {
                return res.status(400).json({
                    success: false,
                    error: `无效的页面参数。支持的页面: ${validPages.join(', ')}`
                });
            }

            // 构建参数对象
            const params = {
                doctor: {
                    id: doctor_id,
                    code: doctor_code,
                    name: doctor_name
                },
                department: {
                    id: dept_id,
                    code: dept_code,
                    name: dept_name
                },
                patient: {
                    id: patient_id,
                    name: patient_name,
                    bed: patient_bed,
                    sex: patient_sex,
                    age: patient_age
                }
            };

            // 改进的参数处理 - 自动清空未传递的参数，保留传递的参数（包括空字符串）
            const cleanParams = {
                doctor: {},
                department: {},
                patient: {}
            };

            // 处理所有可能的参数，未传递的设为空字符串
            const allParamDefs = {
                'doctor': ['id', 'code', 'name'],
                'department': ['id', 'code', 'name'],
                'patient': ['id', 'name', 'bed', 'sex', 'age']
            };

            Object.keys(allParamDefs).forEach(key => {
                allParamDefs[key].forEach(subKey => {
                    const paramName = getParamName(key, subKey);
                    if (req.query.hasOwnProperty(paramName)) {
                        // 参数被传递（包括空字符串）
                        cleanParams[key][subKey] = req.query[paramName] || '';
                    } else {
                        // 参数未传递，设为空字符串以清空显示
                        cleanParams[key][subKey] = '';
                    }
                });
            });

            // 清理空对象（如果所有子参数都为空）
            Object.keys(cleanParams).forEach(key => {
                const hasNonEmptyValue = Object.values(cleanParams[key]).some(value => value !== '');
                if (!hasNonEmptyValue) {
                    // 保留空对象，用于清空显示
                    // delete cleanParams[key];
                }
            });

            // 辅助函数：根据对象键和子键获取对应的查询参数名
            function getParamName(key, subKey) {
                const paramMap = {
                    'doctor': {
                        'id': 'doctor_id',
                        'code': 'doctor_code',
                        'name': 'doctor_name'
                    },
                    'department': {
                        'id': 'dept_id',
                        'code': 'dept_code',
                        'name': 'dept_name'
                    },
                    'patient': {
                        'id': 'patient_id',
                        'name': 'patient_name',
                        'bed': 'patient_bed',
                        'sex': 'patient_sex',
                        'age': 'patient_age'
                    }
                };
                return paramMap[key]?.[subKey] || `${key}_${subKey}`;
            }

            console.log('参数处理:', { original: params, cleaned: cleanParams });

            // 显示主窗口并确保置顶
            showWindow();

            // API调用时确保窗口置顶并同步Logo状态
            if (mainWindow) {
                mainWindow.setAlwaysOnTop(true);
                // 通知前端更新Logo状态为置顶
                if (mainWindow.webContents) {
                    mainWindow.webContents.send('api-pin-status', { pinned: true });
                }
            }

            // 切换页面（如果指定了页面）
            if (page) {
                switchTab(page);
            }

            // 设置窗口模式
            if (window_mode === 'compact' && !isCompactMode) {
                toggleCompactMode();
            } else if (window_mode === 'full' && isCompactMode) {
                toggleCompactMode();
            }

            // 向页面发送参数 - 总是发送消息，即使参数为空
            const messageData = {
                page: page || currentTab,
                params: cleanParams,
                timestamp: new Date().toISOString()
            };

            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('navigation-params', messageData);
                console.log('Navigation params sent:', messageData.page);
            } else {
                console.log('Warning: mainWindow or webContents unavailable');
            }

            // 返回简化的成功响应
            res.json({
                success: true,
                message: `已切换到${getTabDisplayName(page || currentTab)}`
            });

        } catch (error) {
            console.error('导航接口错误:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 重置接口 - 清空所有参数
    server.get('/api/v1/reset', (req, res) => {
        try {
            console.log('收到重置请求');

            // 显示主窗口
            showWindow();

            // 发送重置消息到前端
            const messageData = {
                reset: true,
                timestamp: new Date().toISOString()
            };

            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('navigation-params', messageData);
                console.log('Reset message sent');
            }

            res.json({
                success: true,
                message: '所有参数已重置'
            });

        } catch (error) {
            console.error('重置接口错误:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 尝试启动HTTP服务器，如果端口被占用则尝试其他端口
    const tryPorts = [APP_CONFIG.httpPort, 19877, 19878, 19879, 19880];
    let serverStarted = false;

    for (const port of tryPorts) {
        try {
            httpServer = server.listen(port, 'localhost', () => {
                console.log(`医疗AI助手HTTP服务已启动: http://localhost:${port}`);
                APP_CONFIG.httpPort = port; // 更新实际使用的端口
                serverStarted = true;
            });

            httpServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
                    console.log(`端口 ${port} 不可用，尝试下一个端口...`);
                    httpServer = null;
                } else {
                    console.error('HTTP服务器错误:', err);
                }
            });

            break; // 成功启动就跳出循环
        } catch (error) {
            console.log(`端口 ${port} 不可用: ${error.message}`);
            if (port === tryPorts[tryPorts.length - 1]) {
                console.error('所有端口都不可用，HTTP服务启动失败');
            }
        }
    }
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
    // 使用工作区尺寸，避免与任务栏等系统UI冲突
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowHeight = screenHeight - APP_CONFIG.marginTop - APP_CONFIG.marginBottom;

    if (mainWindow) {
        const currentBounds = mainWindow.getBounds();

        if (currentBounds.width === APP_CONFIG.fullSize.width) {
            // 切换到折叠模式
            mainWindow.setBounds({
                x: screenWidth - APP_CONFIG.compactSize.width,
                y: APP_CONFIG.marginTop,
                width: APP_CONFIG.compactSize.width,
                height: windowHeight
            });
            isCompactMode = true;
        } else {
            // 切换到展开模式
            mainWindow.setBounds({
                x: screenWidth - APP_CONFIG.fullSize.width,
                y: APP_CONFIG.marginTop,
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