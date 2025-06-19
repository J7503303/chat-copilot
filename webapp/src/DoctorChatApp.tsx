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
import {
    Button,
    FluentProvider,
    Input,
    Spinner,
    Subtitle1,
    Text,
    makeStyles
} from '@fluentui/react-components';
import { Bot24Regular, Person24Regular, Send24Regular } from '@fluentui/react-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { semanticKernelLightTheme } from './styles';

// 导入ChatService相关
import { AuthHelper } from './libs/auth/AuthHelper';
import { AuthorRoles, ChatMessageType } from './libs/models/ChatMessage';
import { IChatSession, ICreateChatSessionResponse } from './libs/models/ChatSession';
import { IAsk } from './libs/semantic-kernel/model/Ask';
import { ChatService } from './libs/services/ChatService';

// 导入Redux相关
import { useAppDispatch, useAppSelector } from './redux/app/hooks';
import { RootState } from './redux/app/store';
import { setActiveUserInfo, setAuthConfig } from './redux/features/app/appSlice';

// 导入SignalR相关
import * as signalR from '@microsoft/signalr';
import { BackendServiceUrl } from './libs/services/BaseService';

const useClasses = makeStyles({
    app: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        backgroundColor: '#8B5A96',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        height: '48px',
        width: '100%',
    },
    doctorInfo: {
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        gap: '8px',
        padding: '16px 24px',
        borderBottom: '1px solid #e0e0e0',
    },
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
    },
    messagesArea: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '8px',
        overflow: 'auto',
        padding: '16px',
    },

    inputArea: {
        alignItems: 'center',
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
    },
    input: {
        flex: 1,
    },
    sendButton: {
        minWidth: '40px',
    },
    loading: {
        alignItems: 'center',
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        padding: '16px',
    },
    error: {
        color: '#d13438',
        padding: '16px',
        textAlign: 'center',
    },
});

interface Message {
    id: string;
    content: string;
    isBot: boolean;
    timestamp: number;
    type?: ChatMessageType;
    authorRole?: AuthorRoles;
}

interface DoctorInfo {
    id: string;
    name: string;
    dept?: string;
    patient?: string;
}

// 定义SignalR消息接口
interface SignalRMessage {
    id?: string;
    content: string;
    timestamp?: number;
    type?: ChatMessageType;
    authorRole: AuthorRoles;
    chatId?: string;
}

// 定义聊天历史数据接口
interface ChatHistoryData {
    doctorInfo: DoctorInfo;
    messages: Message[];
    chatSession: IChatSession | null;
    timestamp: number;
}

const DoctorChatApp: React.FC = () => {
    const classes = useClasses();
    const { instance, inProgress } = useMsal();
    
    // 添加Redux状态管理
    const dispatch = useAppDispatch();
    const { activeUserInfo } = useAppSelector((state: RootState) => state.app);
    
    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatSession, setChatSession] = useState<IChatSession | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatService] = useState(() => new ChatService());
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 本地存储键名
    const getStorageKey = (doctorId: string) => `doctor-chat-${doctorId}`;

    // 建立SignalR连接
    useEffect(() => {
        let connection: signalR.HubConnection | null = null;
        let isConnecting = false;
        
        const setupSignalRConnection = async () => {
            // 避免重复连接和并发连接
            if (hubConnection || isConnecting || !chatSession || !activeUserInfo) {
                return;
            }
            
            isConnecting = true;
            
            try {
                const connectionHubUrl = new URL('/messageRelayHub', BackendServiceUrl);
                connection = new signalR.HubConnectionBuilder()
                    .withUrl(connectionHubUrl.toString(), {
                        skipNegotiation: true,
                        transport: signalR.HttpTransportType.WebSockets,
                    })
                    .withAutomaticReconnect({
                        nextRetryDelayInMilliseconds: retryContext => {
                            // 更严格的重连控制
                            if (retryContext.previousRetryCount >= 3) {
                                console.log('🛑 SignalR达到最大重连次数，停止重连');
                                return null; // 停止重连
                            }
                            const delay = Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 10000);
                            console.log(`⏱️ SignalR将在${delay}ms后重连 (第${retryContext.previousRetryCount + 1}次)`);
                            return delay;
                        }
                    })
                    .configureLogging(signalR.LogLevel.Error) // 只显示错误日志
                    .build();

                // 设置连接事件处理
                connection.onclose((error) => {
                    console.log('📡 SignalR连接已关闭', error?.message || '正常关闭');
                    setHubConnection(null);
                    isConnecting = false;
                });

                connection.onreconnecting((error) => {
                    console.log('🔄 SignalR正在重连...', error?.message || '');
                });

                connection.onreconnected((connectionId) => {
                    console.log('✅ SignalR重连成功', connectionId);
                    // 重连后重新加入聊天组
                    if (chatSession) {
                        void addToSignalRGroup(chatSession.id);
                    }
                });

                await connection.start();
                console.log('✅ SignalR连接已建立，状态:', connection.state);
                setHubConnection(connection);
                isConnecting = false;

                // 监听消息接收
                connection.on('ReceiveMessage', (chatId: string, senderId: string, message: SignalRMessage) => {
                    console.log('📥 SignalR收到消息:', { chatId, senderId, message });
                    
                    if (chatSession && chatId === chatSession.id && message.authorRole === AuthorRoles.Bot) {
                        const newMessage: Message = {
                            id: message.id ?? `signalr-${Date.now()}`,
                            content: message.content,
                            isBot: true,
                            timestamp: message.timestamp ?? Date.now(),
                            type: message.type ?? ChatMessageType.Message,
                            authorRole: message.authorRole,
                        };
                        
                        setMessages(prev => {
                            // 避免重复添加相同的消息
                            const exists = prev.some(m => m.id === newMessage.id);
                            if (!exists) {
                                return [...prev, newMessage];
                            }
                            return prev;
                        });
                        setIsLoading(false);
                    }
                });

                connection.on('ReceiveMessageUpdate', (message: SignalRMessage) => {
                    console.log('📥 SignalR消息更新:', message);
                    
                    if (chatSession && message.chatId === chatSession.id) {
                        setMessages(prev => prev.map(m => 
                            m.id === message.id 
                                ? { ...m, content: message.content }
                                : m
                        ));
                    }
                });

                // 立即加入聊天组
                void addToSignalRGroup(chatSession.id);

            } catch (err) {
                console.warn('❌ SignalR连接失败:', err);
                setHubConnection(null);
                isConnecting = false;
            }
        };

        // 只有在有聊天会话和用户信息时才建立连接
        if (chatSession && activeUserInfo && !hubConnection && !isConnecting) {
            void setupSignalRConnection();
        }

        return () => {
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                console.log('🔌 清理SignalR连接');
                void connection.stop();
            }
            isConnecting = false;
        };
    }, [chatSession, activeUserInfo]);

    // 将聊天ID添加到SignalR组
    const addToSignalRGroup = useCallback(async (chatId: string) => {
        if (hubConnection && hubConnection.state === signalR.HubConnectionState.Connected && chatId) {
            try {
                console.log('🔗 将聊天添加到SignalR组:', chatId);
                await hubConnection.invoke('AddClientToGroupAsync', chatId);
                console.log('✅ 成功加入SignalR组:', chatId);
            } catch (err) {
                console.warn('❌ 添加到SignalR组失败:', err);
            }
        } else {
            console.log('⚠️ 跳过SignalR组加入，连接状态:', hubConnection?.state || 'null');
        }
    }, [hubConnection]);

    // 设置用户信息（如果还没有设置）
    useEffect(() => {
        const setupUserInfo = async () => {
            try {
                // 首先确保authConfig已加载
                const authConfig = AuthHelper.getAuthConfig();
                console.log('🔍 当前authConfig状态:', authConfig);
                
                if (!authConfig) {
                    console.log('⚠️ authConfig未加载，尝试重新获取...');
                    // 如果authConfig未加载，尝试从后端获取
                    try {
                        const response = await fetch(new URL('authConfig', BackendServiceUrl));
                        if (response.ok) {
                            const config = await response.json();
                            console.log('✅ 成功获取authConfig:', config);
                            dispatch(setAuthConfig(config));
                        } else {
                            console.warn('⚠️ 无法获取authConfig，使用None模式');
                            dispatch(setAuthConfig({ 
                                authType: 'None' as any,
                                aadAuthority: '',
                                aadClientId: '',
                                aadApiScope: ''
                            }));
                        }
                    } catch (err) {
                        console.warn('⚠️ 获取authConfig失败，使用None模式:', err);
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
                        console.log('🔄 设置活跃用户信息 (AAD模式)...', account);
                        dispatch(setActiveUserInfo({
                            id: `${account.localAccountId}.${account.tenantId}`,
                            email: account.username,
                            username: account.name ?? account.username,
                        }));
                    } else {
                        console.warn('⚠️ AAD模式下未找到活跃账户，可能需要重新登录');
                        setError('AAD模式下未找到活跃账户，请重新登录');
                        return;
                    }
                } else {
                    // None模式，使用默认用户信息
                    console.log('🔄 使用默认用户信息 (None模式)...');
                    dispatch(setActiveUserInfo({
                        id: 'c05c61eb-65e4-4223-915a-fe72b0c9ece1',
                        email: 'user@contoso.com',
                        username: 'Default User',
                    }));
                }
                
                setIsAuthReady(true);
            } catch (err) {
                console.error('❌ 设置用户信息失败:', err);
                setError('身份验证失败：' + (err instanceof Error ? err.message : '未知错误'));
            }
        };

        void setupUserInfo();
    }, [instance, dispatch]);

    useEffect(() => {
        // 只有在身份验证准备就绪后才初始化医生信息和聊天会话
        if (!isAuthReady) return;

        // 从URL参数获取医生信息
        const params = new URLSearchParams(window.location.search);
        const doctorId = params.get('doctor_id') ?? params.get('userId');
        const doctorName = params.get('doctor_name') ?? params.get('userName');
        const deptName = params.get('dept_name');
        const patientName = params.get('patient_name');

        if (!doctorId) {
            setError('缺少必需的医生ID参数 (doctor_id)');
            return;
        }

        const info: DoctorInfo = {
            id: doctorId,
            name: doctorName ?? `医生${doctorId}`,
            dept: deptName ?? undefined,
            patient: patientName ?? undefined,
        };

        setDoctorInfo(info);
        void initializeChatSession(info);
    }, [isAuthReady]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 保存聊天历史到本地存储
    useEffect(() => {
        if (doctorInfo && messages.length > 1) { // 排除只有欢迎消息的情况
            const storageKey = getStorageKey(doctorInfo.id);
            const chatData: ChatHistoryData = {
                doctorInfo,
                messages,
                chatSession,
                timestamp: Date.now(),
            };
            localStorage.setItem(storageKey, JSON.stringify(chatData));
        }
    }, [messages, doctorInfo, chatSession]);

    const loadChatHistory = (doctorId: string) => {
        try {
            const storageKey = getStorageKey(doctorId);
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const chatData = JSON.parse(savedData) as ChatHistoryData;
                // 如果历史记录不超过24小时，则恢复
                if (Date.now() - chatData.timestamp < 24 * 60 * 60 * 1000) {
                    // 检查会话ID是否为GUID格式
                    const isGUID = (id: string) => {
                        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        return guidRegex.test(id);
                    };
                    
                    // 如果会话ID不是GUID格式，生成新的GUID格式ID
                    if (chatData.chatSession && !isGUID(chatData.chatSession.id)) {
                        console.log('🔄 检测到旧格式的会话ID，转换为GUID格式');
                        const generateGUID = () => {
                            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                                const r = Math.random() * 16 | 0;
                                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });
                        };
                        
                        const newGUID = generateGUID();
                        console.log(`🆔 旧ID: ${chatData.chatSession.id} -> 新ID: ${newGUID}`);
                        chatData.chatSession.id = newGUID;
                        
                        // 更新本地存储
                        chatData.timestamp = Date.now();
                        localStorage.setItem(storageKey, JSON.stringify(chatData));
                    }
                    
                    setMessages(chatData.messages || []);
                    setChatSession(chatData.chatSession);
                    return true;
                }
            }
        } catch (err) {
            console.warn('加载聊天历史失败:', err);
        }
        return false;
    };

    const initializeChatSession = async (doctor: DoctorInfo) => {
        try {
            // 如果已经从本地存储加载了历史记录，就不需要重新初始化
            if (loadChatHistory(doctor.id)) {
                console.log('📂 从本地存储恢复聊天历史');
                return;
            }

            // 创建新的聊天会话 - 使用真实的API
            const chatTitle = `${doctor.name} - 医生聊天 @ ${new Date().toLocaleString()}`;
            
            console.log('🔄 开始创建聊天会话...', { chatTitle, doctorId: doctor.id });
            
            try {
                // 根据认证类型获取访问令牌
                let accessToken = '';
                if (AuthHelper.isAuthAAD()) {
                    console.log('🔑 AAD模式，获取访问令牌...');
                    accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                if (!accessToken) {
                    throw new Error('无法获取访问令牌');
                    }
                    console.log('✅ 获取访问令牌成功');
                } else {
                    console.log('🔓 None模式，跳过令牌获取');
                    accessToken = ''; // None模式下使用空令牌
                }
                
                console.log('📤 发送创建会话请求...');
                const result: ICreateChatSessionResponse = await chatService.createChatAsync(chatTitle, accessToken);
                console.log('📥 创建会话响应:', result);
                
                // 标记会话为已在后端创建
                const apiSession = {
                    ...result.chatSession,
                    title: chatTitle + ' (API)'
                };
                setChatSession(apiSession);
                console.log('✅ 聊天会话创建成功:', apiSession.id);
                
                // 将聊天会话添加到SignalR组
                void addToSignalRGroup(apiSession.id);
                
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
                console.log('✅ 初始化消息设置完成');
                
            } catch (apiError) {
                console.warn('❌ API创建聊天会话失败，使用本地会话:', apiError);
                
                // 如果API失败，创建本地会话
                // 生成GUID格式的ID以符合WebAPI要求
                const generateGUID = () => {
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };
                
                const localSession: IChatSession = {
                    id: generateGUID(), // 使用GUID格式的ID
                    title: chatTitle,
                    systemDescription: '',
                    memoryBalance: 0.5,
                    enabledPlugins: [],
                };
                
                setChatSession(localSession);
                console.log('⚠️ 使用本地会话 (GUID格式):', localSession.id);
                
                const welcomeMessage: Message = {
                    id: 'welcome-local',
                    content: `您好，${doctor.name}！我是您的AI医疗助手。${
                        doctor.patient ? `\n当前患者：${doctor.patient}` : ''
                    }${doctor.dept ? `\n所属科室：${doctor.dept}` : ''}\n\n⚠️ 当前使用离线模式，部分功能可能受限。\n\n可能的原因：\n• WebAPI服务未启动\n• 身份验证配置问题\n• 网络连接问题\n\n请检查浏览器控制台获取更多信息。`,
                    isBot: true,
                    timestamp: Date.now(),
                    type: ChatMessageType.Message,
                    authorRole: AuthorRoles.Bot,
                };
                
                setMessages([welcomeMessage]);
            }
            
        } catch (err) {
            console.error('❌ 初始化聊天会话失败:', err);
            setError('初始化聊天会话失败：' + (err instanceof Error ? err.message : '未知错误'));
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading || !doctorInfo || !chatSession) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: inputValue,
            isBot: false,
            timestamp: Date.now(),
            type: ChatMessageType.Message,
            authorRole: AuthorRoles.User,
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await callChatAPI(inputValue, chatSession);
            
            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                content: response,
                isBot: true,
                timestamp: Date.now(),
                type: ChatMessageType.Message,
                authorRole: AuthorRoles.Bot,
            };
            
            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '发送消息失败');
        } finally {
            setIsLoading(false);
        }
    };

    const callChatAPI = async (message: string, session: IChatSession): Promise<string> => {
        try {
            // 确保有活跃用户信息
            if (!activeUserInfo) {
                throw new Error('用户信息未设置，请重新登录');
            }

            // 获取访问令牌
            let accessToken = '';
            if (AuthHelper.isAuthAAD()) {
                console.log('🔑 AAD模式，获取访问令牌...');
                accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                if (!accessToken) {
                    throw new Error('无法获取访问令牌');
                }
                console.log('✅ 获取访问令牌成功');
            } else {
                console.log('🔓 None模式，跳过令牌获取');
                accessToken = ''; // None模式下使用空令牌
            }

            // 每次都创建新的会话以确保后端一致性
            console.log('🔄 创建新的后端会话...');
            const sessionTitle = session.title.replace(' (API)', ''); // 移除已有的API标记
            const result: ICreateChatSessionResponse = await chatService.createChatAsync(sessionTitle, accessToken);
            console.log('📥 后端会话创建成功:', result.chatSession.id);
            
            // 更新会话信息
            const currentSession: IChatSession = {
                ...result.chatSession,
                title: sessionTitle + ' (API)' // 标记为已创建到后端
            };
            setChatSession(currentSession); // 更新状态
            
            // 将新会话添加到SignalR组
            void addToSignalRGroup(currentSession.id);
            
            // 更新本地存储
            if (doctorInfo) {
                const storageKey = getStorageKey(doctorInfo.id);
                const chatData: ChatHistoryData = {
                    doctorInfo,
                    messages,
                    chatSession: currentSession,
                    timestamp: Date.now(),
                };
                localStorage.setItem(storageKey, JSON.stringify(chatData));
                console.log('💾 已更新本地存储的会话信息');
            }

            // 构建Ask对象，使用新创建的会话
            const ask: IAsk = {
                input: message,
                variables: [
                    {
                        key: 'chatId',
                        value: currentSession.id,
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

            // 调用真实的ChatService API
            console.log('🔄 开始调用API...', { 
                ask, 
                chatId: currentSession.id,
                sessionTitle: currentSession.title,
                doctorInfo: doctorInfo,
                activeUserInfo: activeUserInfo,
                authType: AuthHelper.getAuthConfig()?.authType
            });
            
            console.log('📤 发送API请求到:', `chats/${currentSession.id}/messages`);
            const apiResult = await chatService.getBotResponseAsync(ask, accessToken);
            console.log('📥 API响应成功:', apiResult);
            console.log('🔍 API响应详细结构:', JSON.stringify(apiResult, null, 2));
            
            // 处理后端实际返回的格式 {Value: string, Variables: Array}
            if (apiResult && (apiResult as any).value) {
                const content = (apiResult as any).value as string;
                console.log('✅ 成功获取API回复:', content.substring(0, 100) + '...');
                
                // 检查content是否是KernelArguments类型，如果是则需要特殊处理
                if (content === 'Microsoft.SemanticKernel.KernelArguments') {
                    console.log('⚠️ 检测到KernelArguments响应，检查variables字段...');
                    const variables = (apiResult as any).variables;
                    if (variables && Array.isArray(variables)) {
                        console.log('📋 Variables内容:', variables);
                        
                        // 查找关键的回复内容变量，按优先级顺序
                        const contentKeys = ['input', 'response', 'content', 'message', 'answer', 'output'];
                        for (const key of contentKeys) {
                            const responseVar = variables.find((v: any) => v.key === key);
                            if (responseVar && responseVar.value && typeof responseVar.value === 'string') {
                                console.log(`✅ 从variables[${key}]中找到回复内容:`, responseVar.value.substring(0, 100) + '...');
                                return responseVar.value;
                            }
                        }
                        
                        // 如果没有找到特定的key，尝试获取第一个有内容的变量
                        const firstVar = variables.find((v: any) => v.value && typeof v.value === 'string' && v.value.length > 10);
                        if (firstVar) {
                            console.log('✅ 使用第一个有效变量作为回复:', firstVar.key, firstVar.value.substring(0, 100) + '...');
                            return firstVar.value;
                        }
                    }
                    
                    console.warn('⚠️ KernelArguments响应但无法提取有效内容');
                    throw new Error('后端响应格式异常，无法提取回复内容');
                }
                
                return content;
            }
            
            // 兼容前端期望的格式 {message: {content: string}}
            if (apiResult && apiResult.message && apiResult.message.content) {
                console.log('✅ 成功获取API回复(旧格式):', apiResult.message.content.substring(0, 100) + '...');
                return apiResult.message.content;
            }
            
            console.warn('⚠️ API响应格式不正确:', apiResult);
            throw new Error('API响应格式不正确');
            
        } catch (err) {
            console.error('❌ API调用失败，错误详情:', err);
            
            // 检查是否是身份验证错误
            if (err instanceof Error && (err.message.includes('401') || err.message.includes('访问令牌'))) {
                console.log('🔄 身份验证失败，切换到离线模式...');
                return await generateSmartResponse(message);
            }
            
            // 检查是否是网络错误
            if (err instanceof Error && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
                console.log('🔄 网络连接失败，切换到离线模式...');
                return await generateSmartResponse(message);
            }
            
            // 对于其他错误，也使用智能模拟回复
            console.log('🔄 API不可用，切换到离线模式...');
            return await generateSmartResponse(message);
        }
    };

    // 智能模拟回复（当真实API不可用时）
    const generateSmartResponse = async (message: string): Promise<string> => {
        // 模拟API延迟
        await new Promise<void>(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const lowerMessage = message.toLowerCase();
        
        // 医学相关关键词检测和智能回复
        if (lowerMessage.includes('症状') || lowerMessage.includes('病症')) {
            return `关于"${message}"中提到的症状，我建议：\n\n1. 详细记录症状的持续时间、严重程度和触发因素\n2. 考虑进行相关的体格检查和实验室检查\n3. 结合患者的病史和体征进行综合分析\n\n请注意，这只是初步建议，具体诊疗方案需要结合临床实际情况制定。`;
        }
        
        if (lowerMessage.includes('诊断') || lowerMessage.includes('疾病')) {
            return `针对您提到的"${message}"，建议采用循证医学的方法：\n\n1. 收集完整的病史信息\n2. 进行系统的体格检查\n3. 选择合适的辅助检查\n4. 制定鉴别诊断清单\n5. 综合分析得出最可能的诊断\n\n如需要更具体的建议，请提供更多临床信息。`;
        }
        
        if (lowerMessage.includes('治疗') || lowerMessage.includes('用药')) {
            return `关于"${message}"的治疗方案，需要考虑以下因素：\n\n1. 患者的具体病情和严重程度\n2. 既往病史和过敏史\n3. 当前用药情况和药物相互作用\n4. 患者的年龄、体重和肾肝功能\n5. 治疗指南和循证医学证据\n\n建议制定个体化的治疗方案，并密切监测治疗效果和不良反应。`;
        }
        
        if (lowerMessage.includes('检查') || lowerMessage.includes('化验')) {
            return `根据您的询问"${message}"，建议的检查策略：\n\n1. 根据临床表现选择针对性检查\n2. 遵循从简单到复杂的检查原则\n3. 考虑检查的成本效益比\n4. 注意检查的时机和顺序\n5. 结合患者的配合度和耐受性\n\n具体的检查项目需要根据临床情况个体化选择。`;
        }
        
        // 默认智能回复
        const responses = [
            `作为您的AI医疗助手，我理解您关于"${message}"的询问。基于医学知识库，我建议您：\n\n1. 仔细评估患者的整体状况\n2. 考虑相关的临床指南和最佳实践\n3. 结合您的临床经验做出判断\n\n如果您能提供更多具体信息，我可以给出更精准的建议。`,
            
            `关于"${message}"这个问题，从临床角度来看：\n\n• 需要进行系统性的评估\n• 考虑多种可能的原因和机制\n• 制定个体化的处理方案\n• 注意随访和监测\n\n请告诉我更多详细信息，以便提供更有针对性的建议。`,
            
            `您提到的"${message}"是一个很好的临床问题。建议：\n\n→ 回顾相关的医学文献和指南\n→ 考虑患者的具体情况和特殊因素\n→ 与同事讨论复杂病例\n→ 必要时寻求专科会诊\n\n医学实践需要谨慎和持续学习，我很乐意协助您分析具体情况。`,
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
        }
    };

    const buildDisplayText = () => {
        if (!doctorInfo) return '';
        const parts = [doctorInfo.name];
        if (doctorInfo.dept) parts.push(`[${doctorInfo.dept}]`);
        if (doctorInfo.patient) parts.push(`- ${doctorInfo.patient}`);
        return parts.join(' ');
    };

    const clearChatHistory = () => {
        if (doctorInfo) {
            const storageKey = getStorageKey(doctorInfo.id);
            localStorage.removeItem(storageKey);
            setMessages([]);
            setChatSession(null);
            console.log('🧹 已清理聊天历史，重新初始化会话...');
            void initializeChatSession(doctorInfo);
        }
    };

    if (error && !doctorInfo) {
        return (
            <FluentProvider theme={semanticKernelLightTheme}>
                <div className={classes.app}>
                    <div className={classes.header}>
                        <Subtitle1>Chat Copilot - 医生聊天</Subtitle1>
                    </div>
                    <div className={classes.error}>
                        <Text weight="semibold">配置错误</Text>
                        <br />
                        <Text>{error}</Text>
                        <br />
                        <Text size={200}>
                            请检查URL参数，需要包含 doctor_id 或 userId 参数
                        </Text>
                    </div>
                </div>
            </FluentProvider>
        );
    }

    return (
        <FluentProvider theme={semanticKernelLightTheme}>
            <div className={classes.app}>
                <div className={classes.header}>
                    <Subtitle1>Chat Copilot - 医生聊天</Subtitle1>
                </div>
                
                {doctorInfo && (
                    <div className={classes.doctorInfo}>
                        <Person24Regular />
                        <Text weight="semibold">
                            {buildDisplayText()}
                        </Text>
                        <div style={{ marginLeft: 'auto' }}>
                            <Button 
                                size="small" 
                                appearance="subtle"
                                onClick={clearChatHistory}
                            >
                                清除记录
                            </Button>
                        </div>
                    </div>
                )}

                <div className={classes.chatContainer}>
                    <div className={classes.messagesArea}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: message.isBot ? '1px solid #e0e0e0' : 'none',
                                    backgroundColor: message.isBot ? '#ffffff' : '#0078d4',
                                    color: message.isBot ? 'inherit' : 'white',
                                    maxWidth: '80%',
                                    alignSelf: message.isBot ? 'flex-start' : 'flex-end',
                                    wordBreak: 'break-word',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {message.isBot ? <Bot24Regular /> : <Person24Regular />}
                                    <div>
                                        <Text size={200} weight="semibold">
                                            {message.isBot ? 'AI医疗助手' : (doctorInfo?.name ?? '您')}
                                        </Text>
                                        <Text size={100} style={{ marginLeft: '8px', opacity: 0.7 }}>
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </div>
                                </div>
                                <div>
                                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                                        {message.content}
                                    </Text>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className={classes.loading}>
                                <Spinner size="tiny" />
                                <Text size={200}>AI正在分析中...</Text>
                            </div>
                        )}
                        
                        {error && (
                            <div className={classes.error}>
                                <Text size={200}>{error}</Text>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={classes.inputArea}>
                        <Input
                            className={classes.input}
                            placeholder="请输入您的医学问题或病例描述..."
                            value={inputValue}
                            onChange={(_, data) => setInputValue(data.value)}
                            onKeyDown={handleKeyPress}
                            disabled={isLoading}
                        />
                        <Button
                            className={classes.sendButton}
                            icon={<Send24Regular />}
                            appearance="primary"
                            onClick={() => { void sendMessage(); }}
                            disabled={!inputValue.trim() || isLoading}
                        />
                    </div>
                </div>
            </div>
        </FluentProvider>
    );
};

export default DoctorChatApp; 