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
import { AuthorRoles, ChatMessageType } from '../../../libs/models/ChatMessage';
import { IChatSession, ICreateChatSessionResponse } from '../../../libs/models/ChatSession';
import { IAsk } from '../../../libs/semantic-kernel/model/Ask';
import { BackendServiceUrl } from '../../../libs/services/BaseService';
import { ChatService } from '../../../libs/services/ChatService';

import { useAppDispatch, useAppSelector } from '../../../redux/app/hooks';
import { RootState } from '../../../redux/app/store';
import { setActiveUserInfo, setAuthConfig } from '../../../redux/features/app/appSlice';

import { ChatSessionData, DoctorChatHistoryData, DoctorInfo, Message } from '../types';



// 日志管理工具
const isDevelopment = process.env.NODE_ENV === 'development';
const logger = {
    debug: isDevelopment ? console.log : () => {},
    info: console.log,
    warn: console.warn,
    error: console.error,
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
    const [_hubConnection, _setHubConnection] = useState<signalR.HubConnection | null>(null);

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

    // 初始化聊天会话
    const initializeChatSession = useCallback(async (doctor: DoctorInfo) => {
        try {
            logger.info('Initializing chat session');
            
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
                
                // 添加初始消息（来自后端）
                const initialMessage: Message = {
                    id: result.initialBotMessage.id ?? `initial-${Date.now()}`,
                    content: result.initialBotMessage.content,
                    isBot: true,
                    timestamp: result.initialBotMessage.timestamp ?? Date.now(),
                    type: result.initialBotMessage.type,
                    authorRole: result.initialBotMessage.authorRole,
                };

                // 添加医生专用欢迎消息
                const welcomeMessage: Message = {
                    id: 'doctor-welcome',
                    content: `您好，${doctor.name}！我是您的AI医疗助手。${
                        doctor.patient ? `\n当前患者：${doctor.patient}` : ''
                    }${doctor.dept ? `\n所属科室：${doctor.dept}` : ''}\n\n🔗 已连接到后端API，您现在可以享受完整的AI聊天功能！`,
                    isBot: true,
                    timestamp: Date.now(),
                    type: ChatMessageType.Message,
                    authorRole: AuthorRoles.Bot,
                };
                
                setMessages([initialMessage, welcomeMessage]);
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
    }, [instance, inProgress, chatService, generateGUID]);

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
        
        logger.info('Starting new chat session');
        void initializeChatSession(doctorInfo);
    }, [doctorInfo, messages, saveChatSessions, generateGUID, initializeChatSession]);

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

            logger.info('Sending API request');
            const apiResult = await chatService.getBotResponseAsync(ask, accessToken);
            
            logger.debug('Raw API response:', apiResult);
            
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
            throw err;
        }
    }, [activeUserInfo, instance, inProgress, chatService, doctorInfo]);

    // 离线状态友好提示
    const showOfflineNotification = useCallback((): string => {
        const doctorName = doctorInfo?.name || '医生';
        const patientInfo = doctorInfo?.patient ? `患者：${doctorInfo.patient}` : '';
        
        return `⚠️ **系统提示**\n\n${doctorName}，您好！\n\nAI助手当前处于离线状态。${patientInfo ? `\n\n${patientInfo}的咨询暂时无法处理。` : ''}\n\n**可能的原因：**\n• 网络连接中断\n• 后端服务暂时不可用\n• 系统正在维护\n\n**建议操作：**\n• 检查网络连接\n• 稍后重试发送消息\n• 如问题持续，请联系技术支持\n\n感谢您的理解！`;
    }, [doctorInfo]);

    // 发送消息
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

        try {
            // 首先尝试调用真实API
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
            logger.info('Message sent successfully via API');
            
        } catch (err) {
            logger.error('发送消息失败，显示离线提示:', err);
            
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
            logger.info('Offline notification shown to user');
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, doctorInfo, chatSession, callChatAPI, showOfflineNotification]);

    // 设置用户信息的Effect
    useEffect(() => {
        void setupUserInfo();
    }, [setupUserInfo]);

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
        setIsAuthReady,
        createNewChat,
        sendMessage,
        saveChatSessions,
        generateGUID,
        generateChatTitle,
        getStorageKey,
        setupUserInfo,
        initializeChatSession,
    };
}; 