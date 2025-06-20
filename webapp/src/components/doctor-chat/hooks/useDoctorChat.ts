/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react-hooks/exhaustive-deps */

import { useMsal } from '@azure/msal-react';
import * as signalR from '@microsoft/signalr';
import { useCallback, useEffect, useState } from 'react';

import { AuthHelper } from '../../../libs/auth/AuthHelper';
import { AuthorRoles, ChatMessageType, IChatMessage } from '../../../libs/models/ChatMessage';
import { IChatSession, ICreateChatSessionResponse } from '../../../libs/models/ChatSession';
import { IAsk } from '../../../libs/semantic-kernel/model/Ask';
import { BackendServiceUrl } from '../../../libs/services/BaseService';
import { ChatService } from '../../../libs/services/ChatService';

import { useAppDispatch, useAppSelector } from '../../../redux/app/hooks';
import { RootState } from '../../../redux/app/store';
import { setActiveUserInfo, setAuthConfig } from '../../../redux/features/app/appSlice';

import debug from 'debug';
import { ChatSessionData, DoctorChatHistoryData, DoctorInfo, Message } from '../types';

// 日志管理工具
const debugLogger = debug('doctor-chat');
const logger = {
    debug: debugLogger,
    info: debugLogger,
    warn: debugLogger,
    error: debugLogger,
};

export const useDoctorChat = () => {
    const { instance, inProgress } = useMsal();
    const dispatch = useAppDispatch();
    const { activeUserInfo } = useAppSelector((state: RootState) => state.app);

    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatSession, setChatSession] = useState<IChatSession | null>(null);
    const [currentChatId, setCurrentChatId] = useState<string>('');
    const [chatSessions, setChatSessions] = useState<Record<string, ChatSessionData>>({});
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatService] = useState(() => new ChatService());
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [isStreamingMode, setIsStreamingMode] = useState(false); // 标记是否处于流式模式
    const [contentStableTimer, setContentStableTimer] = useState<NodeJS.Timeout | null>(null); // 内容稳定检测定时器

    // 完成流式输出的辅助函数
    const completeStreaming = useCallback((reason: string) => {
        logger.debug(`Streaming completed: ${reason}`);
        setStreamingMessageId(null);
        setIsLoading(false);
        setIsStreamingMode(false);
        
        // 清理内容稳定检测定时器
        if (contentStableTimer) {
            clearTimeout(contentStableTimer);
            setContentStableTimer(null);
        }
    }, [contentStableTimer]);

    // 生成GUID
    const generateGUID = useCallback(() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    // 生成聊天标题
    const generateChatTitle = useCallback((doctorInfo: DoctorInfo) => {
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', { 
            month: 'numeric', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return `${doctorInfo.name} - ${timeStr}`;
    }, []);

    // 本地存储键名
    const getStorageKey = useCallback((doctorId: string) => `doctor-chat-${doctorId}`, []);

    // 保存聊天会话数据
    const saveChatSessions = useCallback((doctorInfo: DoctorInfo) => {
        if (!doctorInfo) return;
        
        try {
            const storageKey = getStorageKey(doctorInfo.id);
            
            const updatedSessions = {
                ...chatSessions,
                [currentChatId]: {
                    id: currentChatId,
                    title: chatSessions[currentChatId]?.title || generateChatTitle(doctorInfo),
                    messages,
                    chatSession,
                    timestamp: Date.now(),
                    lastMessageTime: messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now(),
                }
            };
            
            const chatData: DoctorChatHistoryData = {
                doctorInfo,
                currentChatId,
                chatSessions: updatedSessions,
                timestamp: Date.now(),
            };
            
            localStorage.setItem(storageKey, JSON.stringify(chatData));
            setChatSessions(updatedSessions);
        } catch (error) {
            logger.warn('保存聊天历史失败:', error);
        }
    }, [currentChatId, chatSessions, messages, chatSession, generateChatTitle, getStorageKey]);

    // 设置用户信息
    const setupUserInfo = useCallback(async () => {
        try {
            // 首先确保authConfig已加载
            const authConfig = AuthHelper.getAuthConfig();
            
            if (!authConfig) {
                logger.info('AuthConfig not loaded, retrying...');
                try {
                    const response = await fetch(new URL('authConfig', BackendServiceUrl));
                    if (response.ok) {
                        const config = await response.json();
                        logger.info('AuthConfig loaded successfully');
                        dispatch(setAuthConfig(config));
                    } else {
                        logger.warn('⚠️ 无法获取authConfig，使用None模式');
                        dispatch(setAuthConfig({ 
                            authType: 'None' as any,
                            aadAuthority: '',
                            aadClientId: '',
                            aadApiScope: ''
                        }));
                    }
                } catch (err) {
                    logger.warn('⚠️ 获取authConfig失败，使用None模式:', err);
                    dispatch(setAuthConfig({ 
                        authType: 'None' as any,
                        aadAuthority: '',
                        aadClientId: '',
                        aadApiScope: ''
                    }));
                }
            }
            
            // 检查是否为AAD认证
            if (AuthHelper.isAuthAAD()) {
                const account = instance.getActiveAccount();
                if (account) {
                    logger.info('Setting active user info (AAD mode)');
                    dispatch(setActiveUserInfo({
                        id: `${account.localAccountId}.${account.tenantId}`,
                        email: account.username,
                        username: account.name ?? account.username,
                    }));
                } else {
                    logger.warn('⚠️ AAD模式下未找到活跃账户，可能需要重新登录');
                    setError('AAD模式下未找到活跃账户，请重新登录');
                    return;
                }
            } else {
                // None模式，使用医生ID作为用户信息
                logger.info('Using doctor ID as user info (None mode)');
                
                if (doctorInfo) {
                    const userId = doctorInfo.id || 'c05c61eb-65e4-4223-915a-fe72b0c9ece1';
                    const userName = doctorInfo.name || 'Default User';
                    
                    dispatch(setActiveUserInfo({
                        id: userId,
                        email: `${userId}@medical.local`,
                        username: userName,
                    }));
                    
                    logger.info('Doctor user info set');
                }
            }
            
            setIsAuthReady(true);
        } catch (err) {
            logger.error('❌ 设置用户信息失败:', err);
            setError('身份验证失败：' + (err instanceof Error ? err.message : '未知错误'));
        }
    }, [instance, dispatch, doctorInfo]);

    // 加载聊天历史
    const loadChatHistory = useCallback((doctorId: string) => {
        try {
            logger.info('Loading chat history for doctor:', doctorId);
            const storageKey = getStorageKey(doctorId);
            const savedData = localStorage.getItem(storageKey);
            
            if (savedData) {
                const chatData = JSON.parse(savedData) as DoctorChatHistoryData;
                logger.info('📂 找到聊天历史数据:', {
                    doctorId: chatData.doctorInfo?.id,
                    currentChatId: chatData.currentChatId,
                    sessionCount: Object.keys(chatData.chatSessions || {}).length,
                    timestamp: new Date(chatData.timestamp).toLocaleString()
                });
                
                // 如果历史记录不超过7天，则恢复
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
                if (Date.now() - chatData.timestamp < maxAge) {
                    // 验证医生ID是否匹配
                    if (chatData.doctorInfo?.id !== doctorId) {
                        logger.warn('⚠️ 聊天历史中的医生ID不匹配，删除历史记录');
                        localStorage.removeItem(storageKey);
                        return false;
                    }
                    
                    // 恢复聊天会话数据
                    setChatSessions(chatData.chatSessions || {});
                    setCurrentChatId(chatData.currentChatId || '');
                    
                    // 恢复当前聊天会话
                    const currentSession = chatData.chatSessions?.[chatData.currentChatId];
                    if (currentSession) {
                        setMessages(currentSession.messages || []);
                        setChatSession(currentSession.chatSession);
                        logger.info('✅ Chat history restored successfully');
                        return true;
                    }
                } else {
                    // 历史记录过期，删除
                    localStorage.removeItem(storageKey);
                    logger.info('🗑️ Expired chat history deleted');
                }
            } else {
                logger.info('📭 No chat history found');
            }
        } catch (err) {
            logger.warn('❌ 加载聊天历史失败:', err);
        }
        return false;
    }, [getStorageKey]);

    // 初始化聊天会话
    const initializeChatSession = useCallback(async (doctor: DoctorInfo) => {
        try {
            logger.info('Initializing chat session');
            
            // 尝试从本地存储加载历史记录
            if (loadChatHistory(doctor.id)) {
                logger.info('✅ Restored chat history from local storage');
                return;
            }
            
            logger.info('🆕 Creating new chat session');
            
            // 生成新的聊天ID
            const newChatId = generateGUID();
            setCurrentChatId(newChatId);
            
            // 创建新的聊天会话 - 使用真实的API
            const chatTitle = `${doctor.name} - 医生聊天 @ ${new Date().toLocaleString()}`;
            
            logger.info('Creating chat session...');
            
            try {
                // 根据认证类型获取访问令牌
                let accessToken = '';
                if (AuthHelper.isAuthAAD()) {
                    logger.info('AAD mode, getting access token...');
                    accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                    if (!accessToken) {
                        throw new Error('无法获取访问令牌');
                    }
                    logger.info('Access token obtained');
                } else {
                    logger.info('None mode, skipping token');
                    accessToken = ''; // None模式下使用空令牌
                }
                
                logger.info('Sending create session request...');
                const result: ICreateChatSessionResponse = await chatService.createChatAsync(chatTitle, accessToken);
                logger.info('Create session response received');
                
                // 标记会话为已在后端创建
                const apiSession = {
                    ...result.chatSession,
                    title: chatTitle + ' (API)'
                };
                setChatSession(apiSession);
                logger.info('Chat session created successfully');
                
                // 为医生聊天界面创建专用欢迎消息，不使用后端的通用欢迎语
                const doctorWelcomeMessage: Message = {
                    id: 'doctor-welcome',
                    content: `您好，${doctor.name}！我是您的AI医疗助手。${
                        doctor.patient ? `\n\n**当前患者：** ${doctor.patient}` : ''
                    }${doctor.dept ? `\n**所属科室：** ${doctor.dept}` : ''}\n\n🩺 **服务功能：**\n• 医学咨询与诊断建议\n• 病例分析与治疗方案\n• 医学文献查询与解读\n• 临床决策支持\n\n🔗 **系统状态：** 已连接到后端API\n\n请问有什么可以帮助您的吗？`,
                    isBot: true,
                    timestamp: Date.now(),
                    type: ChatMessageType.Message,
                    authorRole: AuthorRoles.Bot,
                };
                
                // 只使用医生专用欢迎消息，忽略后端的通用欢迎语
                setMessages([doctorWelcomeMessage]);
                logger.info('Initial message setup completed');
                
            } catch (apiError) {
                logger.warn('❌ API创建聊天会话失败，切换到离线模式:', apiError);
                
                // 设置离线状态
                setIsOffline(true);
                
                // 如果API失败，创建本地会话
                const localSession: IChatSession = {
                    id: generateGUID(),
                    title: chatTitle,
                    systemDescription: '',
                    memoryBalance: 0.5,
                    enabledPlugins: [],
                };
                
                setChatSession(localSession);
                logger.info('Using local session (offline mode)');
                
                const welcomeMessage: Message = {
                    id: 'welcome-local',
                    content: `您好，${doctor.name}！\n\n⚠️ AI医疗助手当前处于离线状态。${
                        doctor.patient ? `\n\n当前患者：${doctor.patient}` : ''
                    }${doctor.dept ? `\n所属科室：${doctor.dept}` : ''}\n\n**系统状态：** 离线模式\n**可能原因：** 网络连接中断或后端服务不可用\n**建议操作：** 请检查网络连接后重试\n\n如需技术支持，请联系系统管理员。`,
                    isBot: true,
                    timestamp: Date.now(),
                    type: ChatMessageType.Message,
                    authorRole: AuthorRoles.Bot,
                };
                
                setMessages([welcomeMessage]);
            }
            
        } catch (err) {
            logger.error('❌ 初始化聊天会话失败:', err);
            setError('初始化聊天会话失败：' + (err instanceof Error ? err.message : '未知错误'));
        }
    }, [instance, inProgress, chatService, generateGUID, loadChatHistory]);

    // 创建新聊天
    const createNewChat = useCallback(() => {
        if (!doctorInfo) return;
        
        // 如果当前聊天有内容，先保存到历史记录
        if (messages.length > 1) {
            saveChatSessions(doctorInfo);
        }
        
        // 生成新的聊天ID
        const newChatId = generateGUID();
        setCurrentChatId(newChatId);
        
        // 清空当前聊天状态
        setMessages([]);
        setChatSession(null);
        setError(null);
        setInputValue('');
        setIsLoading(false);
        setStreamingMessageId(null);
        setIsStreamingMode(false);
        
        // 清理内容稳定检测定时器
        if (contentStableTimer) {
            clearTimeout(contentStableTimer);
            setContentStableTimer(null);
        }
        
        logger.info('Starting new chat session');
        void initializeChatSession(doctorInfo);
    }, [doctorInfo, messages, saveChatSessions, generateGUID, initializeChatSession, contentStableTimer]);

    // 调用真实的ChatAPI
    const callChatAPI = useCallback(async (message: string, session: IChatSession): Promise<string> => {
        try {
            // 确保有活跃用户信息
            if (!activeUserInfo) {
                throw new Error('用户信息未设置，请重新登录');
            }

            // 获取访问令牌
            let accessToken = '';
            if (AuthHelper.isAuthAAD()) {
                logger.info('AAD mode, getting access token...');
                accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                if (!accessToken) {
                    throw new Error('无法获取访问令牌');
                }
                logger.info('Access token obtained');
            } else {
                logger.info('None mode, skipping token');
                accessToken = ''; // None模式下使用空令牌
            }

            // 构建Ask对象
            const ask: IAsk = {
                input: message,
                variables: [
                    {
                        key: 'chatId',
                        value: session.id,
                    },
                    {
                        key: 'messageType',
                        value: ChatMessageType.Message.toString(),
                    },
                    // 添加医生信息到上下文
                    {
                        key: 'doctorId',
                        value: doctorInfo?.id || '',
                    },
                    {
                        key: 'doctorName',
                        value: doctorInfo?.name || '',
                    },
                ],
            };

            // 如果有科室和患者信息，也添加到上下文
            if (doctorInfo?.dept) {
                ask.variables?.push({
                    key: 'department',
                    value: doctorInfo.dept,
                });
            }
            if (doctorInfo?.patient) {
                ask.variables?.push({
                    key: 'currentPatient',
                    value: doctorInfo.patient,
                });
            }

            logger.info('Sending API request with ask:', ask);
            logger.info('Access token length:', accessToken.length);
            logger.info('Chat session ID:', session.id);
            
            const apiResult = await chatService.getBotResponseAsync(ask, accessToken);
            
            logger.info('Raw API response received:', apiResult);
            
            // 处理后端实际返回的格式 {Value: string, Variables: Array}
            if (apiResult && (apiResult as any).value) {
                const content = (apiResult as any).value as string;
                logger.debug('API value content:', content);
                
                // 检查content是否是KernelArguments类型，如果是则需要特殊处理
                if (content === 'Microsoft.SemanticKernel.KernelArguments') {
                    logger.info('KernelArguments response detected, extracting variables...');
                    const variables = (apiResult as any).variables;
                    if (variables && Array.isArray(variables)) {
                        logger.debug('Variables found:', variables);
                        
                        // 查找关键的回复内容变量，按优先级顺序
                        const contentKeys = ['input', 'response', 'content', 'message', 'answer', 'output', 'result'];
                        for (const key of contentKeys) {
                            const responseVar = variables.find((v: any) => v.key === key);
                            if (responseVar && responseVar.value && typeof responseVar.value === 'string') {
                                const extractedContent = responseVar.value as string;
                                logger.info(`Reply content found in variable '${key}':`, extractedContent);
                                return extractedContent;
                            }
                        }
                        
                        // 如果没有找到特定的key，尝试获取第一个有内容的变量
                        const firstValidVar = variables.find((v: any) => 
                            v.value && 
                            typeof v.value === 'string' && 
                            v.value.length > 10 &&
                            v.value !== 'Microsoft.SemanticKernel.KernelArguments'
                        );
                        if (firstValidVar) {
                            const extractedContent = firstValidVar.value as string;
                            logger.info(`Using first valid variable '${firstValidVar.key}' as reply:`, extractedContent);
                            return extractedContent;
                        }
                    }
                    
                    logger.warn('⚠️ KernelArguments响应但无法提取有效内容');
                    throw new Error('后端响应格式异常，无法提取回复内容');
                }
                
                logger.info('API reply received (direct value)');
                return content;
            }
            
            // 兼容前端期望的格式
            if (apiResult && apiResult.message && apiResult.message.content) {
                const content = apiResult.message.content;
                logger.info('API reply received (legacy format)');
                return content;
            }
            
            logger.warn('⚠️ API响应格式不正确:', apiResult);
            throw new Error('API响应格式不正确');
            
        } catch (err) {
            logger.error('❌ API调用失败:', err);
            logger.error('Session ID:', session.id);
            logger.error('Message was:', message);
            throw err;
        }
    }, [activeUserInfo, instance, inProgress, chatService, doctorInfo]);

    // 离线状态友好提示
    const showOfflineNotification = useCallback((): string => {
        const doctorName = doctorInfo?.name || '医生';
        const patientInfo = doctorInfo?.patient ? `患者：${doctorInfo.patient}` : '';
        
        return `⚠️ **系统提示**\n\n${doctorName}，您好！\n\nAI助手当前处于离线状态。${patientInfo ? `\n\n${patientInfo}的咨询暂时无法处理。` : ''}\n\n**可能的原因：**\n• 网络连接中断\n• 后端服务暂时不可用\n• 系统正在维护\n\n**建议操作：**\n• 检查网络连接\n• 稍后重试发送消息\n• 如问题持续，请联系技术支持\n\n感谢您的理解！`;
    }, [doctorInfo]);

    // SignalR连接管理 - 恢复流式输出支持
    const setupSignalRConnection = useCallback(async () => {
        if (!chatSession || !activeUserInfo || hubConnection) {
            return;
        }

        try {
            logger.info('Setting up SignalR connection...');
            
            const connectionHubUrl = new URL('/messageRelayHub', BackendServiceUrl);
            const connection = new signalR.HubConnectionBuilder()
                .withUrl(connectionHubUrl.toString(), {
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets,
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: retryContext => {
                        if (retryContext.previousRetryCount >= 3) {
                            logger.warn('SignalR max retries reached');
                            return null;
                        }
                        return Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 10000);
                    }
                })
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            // 连接事件处理
            connection.onclose((error) => {
                logger.info('SignalR connection closed:', error?.message || 'Normal closure');
                setHubConnection(null);
            });

            connection.onreconnecting(() => {
                logger.info('SignalR reconnecting...');
            });

            connection.onreconnected(() => {
                logger.info('SignalR reconnected');
                if (chatSession?.id) {
                    void connection.invoke('AddClientToGroupAsync', chatSession.id);
                }
            });

            // 设置机器人响应状态监听器 - 这是流式输出的关键
            connection.on('ReceiveBotResponseStatus', (chatId: string, status: string) => {
                logger.debug('SignalR ReceiveBotResponseStatus:', { chatId, status });
                // 这个事件告诉我们机器人开始响应，但我们已经有占位符了，所以不需要处理
            });

            // 设置消息监听器 - 接收完整的机器人消息
            connection.on('ReceiveMessage', (_chatId: string, _senderId: string, message: IChatMessage) => {
                logger.info('SignalR ReceiveMessage:', message);
                
                // 只有在流式模式下且是机器人消息才处理
                if (!isStreamingMode || message.authorRole !== AuthorRoles.Bot) {
                    return;
                }
                
                // 如果有占位符消息，更新它；否则创建新消息
                if (streamingMessageId) {
                    logger.debug('Updating placeholder with ReceiveMessage content');
                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === streamingMessageId 
                                ? { 
                                    ...msg, 
                                    content: message.content || '',
                                    id: message.id || streamingMessageId // 使用服务器返回的ID
                                }
                                : msg
                        )
                    );
                    // 如果消息有ID，更新流式消息ID以便后续ReceiveMessageUpdate使用
                    if (message.id) {
                        setStreamingMessageId(message.id);
                    }
                } else {
                    // 创建新的机器人消息
                    const newMessage: Message = {
                        id: message.id ?? `bot-${Date.now()}`,
                        content: message.content || '',
                        isBot: true,
                        timestamp: message.timestamp ?? Date.now(),
                        type: message.type,
                        authorRole: message.authorRole,
                    };
                    setMessages(prev => [...prev, newMessage]);
                    // 设置流式消息ID，等待后续的ReceiveMessageUpdate
                    setStreamingMessageId(newMessage.id);
                }
                // 不在这里结束流式模式，等待ReceiveMessageUpdate的tokenUsage信号
            });

            // 设置消息更新监听器 - 流式输出的关键，逐步更新消息内容
            connection.on('ReceiveMessageUpdate', (message: IChatMessage) => {
                logger.debug('SignalR ReceiveMessageUpdate:', message);
                
                // 只有在流式模式下才处理更新
                if (!isStreamingMode) {
                    return;
                }
                
                // 根据消息ID更新对应的消息内容
                if (message.id && message.content) {
                    logger.debug('Updating message content via ReceiveMessageUpdate');
                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === message.id 
                                ? { ...msg, content: message.content || '' }
                                : msg
                        )
                    );
                } else if (streamingMessageId && message.content) {
                    // 备用：如果没有消息ID，使用当前流式消息ID
                    logger.debug('Updating placeholder message with streaming content');
                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === streamingMessageId 
                                ? { ...msg, content: message.content || '' }
                                : msg
                        )
                    );
                }

                // 主要完成检测：通过tokenUsage判断
                if (message.tokenUsage) {
                    completeStreaming('tokenUsage detected');
                    return;
                }

                // 备用完成检测：内容稳定性检测
                if (message.content && message.content.length > 0) {
                    // 清除之前的稳定检测定时器
                    if (contentStableTimer) {
                        clearTimeout(contentStableTimer);
                    }
                    
                    // 设置新的稳定检测定时器
                    const newTimer = setTimeout(() => {
                        if (isStreamingMode && streamingMessageId) {
                            completeStreaming('content stable for 3 seconds');
                        }
                    }, 3000); // 3秒内容无变化则认为完成
                    
                    setContentStableTimer(newTimer);
                }
            });

            // 启动连接
            await connection.start();
            logger.info('SignalR connection established');
            
            // 加入聊天组
            await connection.invoke('AddClientToGroupAsync', chatSession.id);
            logger.info('Joined SignalR chat group:', chatSession.id);
            
            setHubConnection(connection);

        } catch (error) {
            logger.error('SignalR connection failed:', error);
        }
    }, [chatSession, activeUserInfo, hubConnection, streamingMessageId, isStreamingMode]);

    // 清理SignalR连接
    const cleanupSignalRConnection = useCallback(() => {
        if (hubConnection) {
            logger.info('Cleaning up SignalR connection');
            hubConnection.stop().catch(err => 
                logger.warn('Error stopping SignalR connection:', err)
            );
            setHubConnection(null);
        }
    }, [hubConnection]);

    // 改进的sendMessage方法 - 优先尝试流式，失败时回退到传统API
    const sendMessage = useCallback(async () => {
        if (!inputValue.trim() || isLoading || !doctorInfo || !chatSession) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: inputValue,
            isBot: false,
            timestamp: Date.now(),
            type: ChatMessageType.Message,
            authorRole: AuthorRoles.User,
        };

        const messageContent = inputValue;
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);
        setIsOffline(false);

        try {
            // 优先尝试流式输出
            if (hubConnection && hubConnection.state === signalR.HubConnectionState.Connected) {
                logger.info('Attempting streaming via SignalR...');
                setIsStreamingMode(true);
                
                try {
                    // 通过SignalR发送消息，等待流式响应
                    // SignalR的ReceiveMessage会创建初始消息，ReceiveMessageUpdate会更新内容
                    await callChatAPI(messageContent, chatSession);
                    
                    // 设置超时回退机制 - 作为最后的安全网
                    setTimeout(() => {
                        if (isStreamingMode && isLoading) {
                            logger.warn('SignalR streaming timeout (30s), falling back to traditional API');
                            setIsStreamingMode(false);
                            
                            // 重新调用API获取响应
                            callChatAPI(messageContent, chatSession).then(response => {
                                // 创建传统API响应消息
                                const botMessage: Message = {
                                    id: `bot-${Date.now()}`,
                                    content: response,
                                    isBot: true,
                                    timestamp: Date.now(),
                                    type: ChatMessageType.Message,
                                    authorRole: AuthorRoles.Bot,
                                };
                                setMessages(prev => [...prev, botMessage]);
                                setStreamingMessageId(null);
                                setIsLoading(false);
                            }).catch(err => {
                                logger.error('Fallback API call failed:', err);
                                setStreamingMessageId(null);
                                setIsLoading(false);
                            });
                        }
                    }, 30000); // 给流式响应30秒时间 - 作为最后的安全网
                    
                } catch (signalRError) {
                    logger.warn('SignalR streaming failed, falling back to traditional API:', signalRError);
                    setIsStreamingMode(false);
                    
                    // 回退到传统API
                    const response = await callChatAPI(messageContent, chatSession);
                    const botMessage: Message = {
                        id: `bot-${Date.now()}`,
                        content: response,
                        isBot: true,
                        timestamp: Date.now(),
                        type: ChatMessageType.Message,
                        authorRole: AuthorRoles.Bot,
                    };
                    setMessages(prev => [...prev, botMessage]);
                    setStreamingMessageId(null);
                    setIsLoading(false);
                }
            } else {
                // 直接使用传统API
                logger.info('No SignalR connection, using traditional API...');
                const response = await callChatAPI(messageContent, chatSession);
                
                const botMessage: Message = {
                    id: `bot-${Date.now()}`,
                    content: response,
                    isBot: true,
                    timestamp: Date.now(),
                    type: ChatMessageType.Message,
                    authorRole: AuthorRoles.Bot,
                };
                setMessages(prev => [...prev, botMessage]);
                setStreamingMessageId(null);
                setIsLoading(false);
            }
            
        } catch (err) {
            logger.error('发送消息失败:', err);
            
            // 移除思考中的占位符消息
            setMessages(prev => prev.filter(msg => !msg.isBot || msg.content !== ''));
            setStreamingMessageId(null);
            setIsStreamingMode(false);
            
            // 清理内容稳定检测定时器
            if (contentStableTimer) {
                clearTimeout(contentStableTimer);
                setContentStableTimer(null);
            }
            
            // 设置离线状态
            setIsOffline(true);
            
            // 显示友好的离线提示
            const offlineNotification = showOfflineNotification();
            const botMessage: Message = {
                id: `bot-offline-${Date.now()}`,
                content: offlineNotification,
                isBot: true,
                timestamp: Date.now(),
                type: ChatMessageType.Message,
                authorRole: AuthorRoles.Bot,
            };
            
            setMessages(prev => [...prev, botMessage]);
            setIsLoading(false);
        }
    }, [inputValue, isLoading, doctorInfo, chatSession, callChatAPI, showOfflineNotification, hubConnection, isStreamingMode]);

    // 自动保存聊天历史 - 使用防抖机制减少频繁写入
    useEffect(() => {
        if (!doctorInfo || !currentChatId || messages.length <= 1) return; // 排除只有欢迎消息的情况
        
        // 防抖保存，避免频繁写入localStorage
        const saveTimeoutId = setTimeout(() => {
            try {
                saveChatSessions(doctorInfo);
                logger.debug('✅ Auto-saved chat history');
            } catch (error) {
                logger.warn('❌ 自动保存聊天历史失败:', error);
            }
        }, 2000); // 2秒防抖

        return () => clearTimeout(saveTimeoutId);
    }, [messages, doctorInfo, chatSession, currentChatId, saveChatSessions]);

    // 设置用户信息的Effect
    useEffect(() => {
        void setupUserInfo();
    }, [setupUserInfo]);

    // 设置SignalR连接的Effect - 恢复流式输出
    useEffect(() => {
        if (isAuthReady && chatSession && activeUserInfo && !hubConnection) {
            void setupSignalRConnection();
        }
        
        return () => {
            cleanupSignalRConnection();
        };
    }, [isAuthReady, chatSession, activeUserInfo, setupSignalRConnection, cleanupSignalRConnection, hubConnection]);

    return {
        // 状态
        doctorInfo,
        messages,
        chatSession,
        currentChatId,
        chatSessions,
        inputValue,
        isLoading,
        error,
        isAuthReady,
        isOffline,
        
        // 方法
        setDoctorInfo,
        setMessages,
        setChatSession,
        setCurrentChatId,
        setChatSessions,
        setInputValue,
        setIsLoading,
        setError,
        createNewChat,
        sendMessage,
        saveChatSessions,
        generateGUID,
        generateChatTitle,
        getStorageKey,
        loadChatHistory,
        setupUserInfo,
        initializeChatSession,
    };
}; 