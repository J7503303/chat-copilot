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
                                                            console.log('SignalR max retries reached, stopping reconnection');
                            return null; // 停止重连
                        }
                        const delay = Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 10000);
                        return delay;
                        }
                    })
                    .configureLogging(signalR.LogLevel.Error) // 只显示错误日志
                    .build();

                // 设置连接事件处理
                connection.onclose((error) => {
                    console.log('SignalR connection closed:', error?.message || 'Normal closure');
                    setHubConnection(null);
                    isConnecting = false;
                });

                connection.onreconnecting((_error) => {
                    console.log('SignalR reconnecting...');
                });

                connection.onreconnected((_connectionId) => {
                    console.log('SignalR reconnected');
                    // 重连后重新加入聊天组
                    if (chatSession) {
                        void addToSignalRGroup(chatSession.id);
                    }
                });

                await connection.start();
                console.log('SignalR connection established');
                setHubConnection(connection);
                isConnecting = false;

                // 监听消息接收 - 完整的新消息
                connection.on('ReceiveMessage', (_chatId: string, _senderId: string, message: SignalRMessage) => {
                    console.log('SignalR message received');
                    
                    if (message.authorRole === AuthorRoles.Bot) {
                        const newMessage: Message = {
                            id: message.id ?? `signalr-${Date.now()}`,
                            content: message.content,
                            isBot: true,
                            timestamp: message.timestamp ?? Date.now(),
                            type: message.type ?? ChatMessageType.Message,
                            authorRole: message.authorRole,
                        };
                        
                        setMessages(prev => {
                            // 检查是否已经存在相同ID的消息，避免重复
                            const existingIndex = prev.findIndex(m => m.id === newMessage.id);
                            if (existingIndex >= 0) {
                                const updated = [...prev];
                                updated[existingIndex] = newMessage;
                                return updated;
                            }
                            return [...prev, newMessage];
                        });
                        
                        setIsLoading(false); // 收到完整消息后停止加载状态
                    }
                });

                // 监听消息更新 - 流式输出的增量更新
                connection.on('ReceiveMessageUpdate', (message: SignalRMessage) => {
                    console.log('SignalR message updated');
                    
                    if (message.authorRole === AuthorRoles.Bot) {
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            
                            // 优先通过ID查找消息
                            let targetIndex = -1;
                            if (message.id) {
                                targetIndex = updatedMessages.findIndex(m => m.id === message.id);
                            }
                            
                            // 如果没有找到，查找最后一个Bot消息
                            if (targetIndex === -1) {
                                for (let i = updatedMessages.length - 1; i >= 0; i--) {
                                    if (updatedMessages[i].isBot) {
                                        targetIndex = i;
                                        break;
                                    }
                                }
                            }
                            
                            if (targetIndex >= 0) {
                                updatedMessages[targetIndex] = {
                                    ...updatedMessages[targetIndex],
                                    content: message.content,
                                    timestamp: message.timestamp || updatedMessages[targetIndex].timestamp,
                                };
                            } else {
                                // 如果没有找到现有消息，创建新消息
                                const newMessage: Message = {
                                    id: message.id || `update-${Date.now()}`,
                                    content: message.content,
                                    isBot: true,
                                    timestamp: message.timestamp || Date.now(),
                                    type: message.type,
                                    authorRole: message.authorRole
                                };
                                updatedMessages.push(newMessage);
                            }
                            
                            return updatedMessages;
                        });
                    }
                });

                // 监听Bot响应状态更新
                connection.on('ReceiveBotResponseStatus', (_chatId: string, status: string | null) => {
                    try {
                        console.log('Bot response status received');
                        if (status && typeof status === 'string' && status.includes('Generating bot response')) {
                            setIsLoading(true);
                        }
                    } catch (error) {
                        console.error('ReceiveBotResponseStatus处理错误:', error, { status, statusType: typeof status });
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
                console.log('Cleaning up SignalR connection');
                void connection.stop();
            }
            isConnecting = false;
        };
    }, [chatSession, activeUserInfo]);

    // 将聊天ID添加到SignalR组
    const addToSignalRGroup = useCallback(async (chatId: string) => {
        if (hubConnection && hubConnection.state === signalR.HubConnectionState.Connected && chatId) {
            try {
                console.log('Adding chat to SignalR group');
                await hubConnection.invoke('AddClientToGroupAsync', chatId);
                console.log('Successfully joined SignalR group');
            } catch (err) {
                console.warn('❌ 添加到SignalR组失败:', err);
            }
        } else {
            console.log('Skipping SignalR group join, connection unavailable');
        }
    }, [hubConnection]);

    // 自动保存聊天历史（当消息更新时）
    useEffect(() => {
        if (doctorInfo && chatSession && messages.length > 0) {
            const storageKey = getStorageKey(doctorInfo.id);
            const chatData: ChatHistoryData = {
                doctorInfo,
                messages,
                chatSession,
                timestamp: Date.now(),
            };
            localStorage.setItem(storageKey, JSON.stringify(chatData));
            console.log('Auto-saving chat history');
        }
    }, [messages, doctorInfo, chatSession]); // 当消息、医生信息或会话变化时自动保存

    // 设置用户信息（如果还没有设置）
    useEffect(() => {
        const setupUserInfo = async () => {
            try {
                // 首先确保authConfig已加载
                const authConfig = AuthHelper.getAuthConfig();
                
                
                if (!authConfig) {
                    console.log('AuthConfig not loaded, retrying...');
                    // 如果authConfig未加载，尝试从后端获取
                    try {
                        const response = await fetch(new URL('authConfig', BackendServiceUrl));
                        if (response.ok) {
                            const config = await response.json();
                            console.log('AuthConfig loaded successfully');
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
                        console.log('Setting active user info (AAD mode)');
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
                    // None模式，使用医生ID作为用户信息
                    console.log('Using doctor ID as user info (None mode)');
                    
                    // 获取医生参数
                    const getDoctorParams = () => {
                        if ((window as any).DOCTOR_PARAMS) {
                            const params = (window as any).DOCTOR_PARAMS;
                            return {
                                doctorId: params.doctor_id || params.userId || '',
                                doctorName: params.doctor_name || params.userName || '',
                            };
                        }
                        
                        const params = new URLSearchParams(window.location.search);
                        return {
                            doctorId: params.get('doctor_id') ?? params.get('userId') ?? '',
                            doctorName: params.get('doctor_name') ?? params.get('userName') ?? '',
                        };
                    };

                    const { doctorId, doctorName } = getDoctorParams();
                    const userId = doctorId || 'c05c61eb-65e4-4223-915a-fe72b0c9ece1';
                    const userName = doctorName || 'Default User';
                    
                    dispatch(setActiveUserInfo({
                        id: userId,
                        email: `${userId}@medical.local`,
                        username: userName,
                    }));
                    
                    console.log('Doctor user info set');
                }
                
                setIsAuthReady(true);
            } catch (err) {
                console.error('❌ 设置用户信息失败:', err);
                setError('身份验证失败：' + (err instanceof Error ? err.message : '未知错误'));
            }
        };

        void setupUserInfo();
    }, [instance, dispatch]);

    // 获取医生参数的函数 - 移到组件顶层便于复用
    const getDoctorParams = useCallback(() => {
        // 检查是否有全局参数（electron模式）
        if ((window as any).DOCTOR_PARAMS) {
            const params = (window as any).DOCTOR_PARAMS;
            return {
                doctorId: params.doctor_id || params.userId || '',
                doctorName: params.doctor_name || params.userName || '',
                deptName: params.dept_name || '',
                patientName: params.patient_name || ''
            };
        }
        
        // 从URL参数获取医生信息，空字符串也作为有效值（用于清空显示）
        const params = new URLSearchParams(window.location.search);
        return {
            doctorId: params.get('doctor_id') ?? params.get('userId') ?? '',
            doctorName: params.get('doctor_name') ?? params.get('userName') ?? '',
            deptName: params.get('dept_name') ?? '',
            patientName: params.get('patient_name') ?? ''
        };
    }, []);

    // 通知父窗口URL参数变化（用于electron集成）
    const notifyParentOfUrlChange = useCallback(() => {
        if (window.parent && window.parent !== window) {
            try {
                const params = new URLSearchParams(window.location.search);
                const paramObj: any = {};
                params.forEach((value, key) => {
                    paramObj[key] = value;
                });
                
                window.parent.postMessage({
                    type: 'URL_CHANGED',
                    data: {
                        url: window.location.href,
                        params: paramObj
                    }
                }, '*');
            } catch (e) {
                // 忽略跨域错误
            }
        }
    }, []);

    // 重新初始化医生信息
    const reinitializeDoctorInfo = useCallback((newParams: any) => {
        if (newParams.doctorId) {
            const userId = newParams.doctorId;
            const userName = newParams.doctorName ?? `医生${newParams.doctorId}`;
            
            if (!AuthHelper.isAuthAAD()) {
                dispatch(setActiveUserInfo({
                    id: userId,
                    email: `${userId}@medical.local`,
                    username: userName,
                }));
            }
            
            const info: DoctorInfo = {
                id: newParams.doctorId,
                name: userName,
                dept: newParams.deptName || undefined,
                patient: newParams.patientName || undefined,
            };
            
            // 清空当前状态并重新初始化
            setMessages([]);
            setChatSession(null);
            setError(null);
            setDoctorInfo(info);
            
            // 重新加载聊天历史和初始化会话
            loadChatHistory(newParams.doctorId);
            void initializeChatSession(info);
        } else {
            setError('缺少必需的医生ID参数 (doctor_id)');
        }
    }, [dispatch]);

    // 监听URL参数变化
    const [currentParams, setCurrentParams] = useState(() => getDoctorParams());
    
    useEffect(() => {
        const checkParamsChange = () => {
            const newParams = getDoctorParams();
            const hasChanged = JSON.stringify(newParams) !== JSON.stringify(currentParams);
            
            if (hasChanged && isAuthReady) {
                setCurrentParams(newParams);
                notifyParentOfUrlChange();
                reinitializeDoctorInfo(newParams);
            }
        };

        // 监听各种URL变化事件
        window.addEventListener('popstate', checkParamsChange);
        window.addEventListener('hashchange', checkParamsChange);
        
        // 定期检查参数变化（备选方案）
        const intervalId = setInterval(checkParamsChange, 1000);
        
        return () => {
            window.removeEventListener('popstate', checkParamsChange);
            window.removeEventListener('hashchange', checkParamsChange);
            clearInterval(intervalId);
        };
    }, [currentParams, getDoctorParams, isAuthReady, notifyParentOfUrlChange, reinitializeDoctorInfo]);

    useEffect(() => {
        // 只有在身份验证准备就绪后才初始化医生信息和聊天会话
        if (!isAuthReady) return;

        const { doctorId, doctorName, deptName, patientName } = currentParams;

        if (!doctorId) {
            setError('缺少必需的医生ID参数 (doctor_id)');
            return;
        }

        const info: DoctorInfo = {
            id: doctorId,
            name: doctorName || `医生${doctorId}`,
            dept: deptName || undefined,
            patient: patientName || undefined,
        };

        setDoctorInfo(info);
        void initializeChatSession(info);

        // 初始化时也通知父窗口当前参数
        notifyParentOfUrlChange();
    }, [isAuthReady, currentParams, notifyParentOfUrlChange]);

    // 监听来自父窗口的参数更新（用于electron集成）
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'CONTEXT_UPDATE') {
                
                // 更新全局参数
                if (event.data.data && (window as any).DOCTOR_PARAMS) {
                    Object.assign((window as any).DOCTOR_PARAMS, event.data.data);
                }
                
                // 重新获取医生信息并初始化
                const getDoctorParams = () => {
                    if ((window as any).DOCTOR_PARAMS) {
                        const params = (window as any).DOCTOR_PARAMS;
                        return {
                            doctorId: params.doctor_id || params.userId || '',
                            doctorName: params.doctor_name || params.userName || '',
                            deptName: params.dept_name || '',
                            patientName: params.patient_name || ''
                        };
                    }
                    return null;
                };

                const params = getDoctorParams();
                if (params && params.doctorId) {
                    // 检查医生ID是否改变
                    const currentDoctorId = doctorInfo?.id;
                    const newDoctorId = params.doctorId;
                    
                    if (currentDoctorId !== newDoctorId) {
                        // 更新用户信息
                        dispatch(setActiveUserInfo({
                            id: newDoctorId,
                            email: `${newDoctorId}@medical.local`,
                            username: params.doctorName ?? `医生${newDoctorId}`,
                        }));
                    }
                    
                    const info: DoctorInfo = {
                        id: params.doctorId,
                        name: params.doctorName || `医生${params.doctorId}`,
                        dept: params.deptName || undefined,
                        patient: params.patientName || undefined,
                    };
                    
                    setDoctorInfo(info);
                    void initializeChatSession(info);
                }
            } else if (event.data && event.data.type === 'RESET') {
                // 处理重置消息
                console.log('收到重置消息，清空所有状态');
                
                // 清空所有状态
                setMessages([]);
                setChatSession(null);
                setDoctorInfo(null);
                setError(null);
                setInputValue('');
                
                // 清空全局参数
                if ((window as any).DOCTOR_PARAMS) {
                    (window as any).DOCTOR_PARAMS = {
                        doctor_id: '',
                        doctor_name: '',
                        dept_name: '',
                        patient_name: '',
                        mode: 'doctor'
                    };
                }
                
                // 清空所有本地存储的聊天历史
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('doctor-chat-')) {
                        localStorage.removeItem(key);
                    }
                });
                
                console.log('重置完成');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isAuthReady, doctorInfo, dispatch]);

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
            console.log('Loading chat history');
            const storageKey = getStorageKey(doctorId);
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const chatData = JSON.parse(savedData) as ChatHistoryData;
                console.log('📂 找到聊天历史数据:', {
                    doctorId: chatData.doctorInfo?.id,
                    messageCount: chatData.messages?.length,
                    timestamp: new Date(chatData.timestamp).toLocaleString()
                });
                
                // 如果历史记录不超过24小时，则恢复
                if (Date.now() - chatData.timestamp < 24 * 60 * 60 * 1000) {
                    // 验证医生ID是否匹配
                    if (chatData.doctorInfo?.id !== doctorId) {
                        console.warn('⚠️ 聊天历史中的医生ID不匹配，删除历史记录');
                        localStorage.removeItem(storageKey);
                        return false;
                    }
                    
                    // 检查会话ID是否为GUID格式
                    const isGUID = (id: string) => {
                        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        return guidRegex.test(id);
                    };
                    
                    // 如果会话ID不是GUID格式，生成新的GUID格式ID
                    if (chatData.chatSession && !isGUID(chatData.chatSession.id)) {
                        console.log('Converting old session ID to GUID format');
                        const generateGUID = () => {
                            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                                const r = Math.random() * 16 | 0;
                                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });
                        };
                        
                        const newGUID = generateGUID();
                        console.log('Session ID converted');
                        chatData.chatSession.id = newGUID;
                        
                        // 更新本地存储
                        chatData.timestamp = Date.now();
                        localStorage.setItem(storageKey, JSON.stringify(chatData));
                    }
                    
                    setMessages(chatData.messages || []);
                    setChatSession(chatData.chatSession);
                    console.log('Chat history restored');
                    return true;
                } else {
                    // 历史记录过期，删除
                    localStorage.removeItem(storageKey);
                    console.log('Expired chat history deleted');
                }
            } else {
                console.log('No chat history found');
            }
        } catch (err) {
            console.warn('加载聊天历史失败，医生ID:', doctorId, '错误:', err);
        }
        return false;
    };

    const initializeChatSession = async (doctor: DoctorInfo) => {
        try {
            console.log('Initializing chat session');
            
            // 检查是否是新的医生ID，如果是则清除当前状态
            const currentDoctorId = doctorInfo?.id;
            if (currentDoctorId && currentDoctorId !== doctor.id) {
                console.log('Doctor ID changed, clearing current state');
                setMessages([]);
                setChatSession(null);
            }
            
            // 尝试从本地存储加载历史记录
            if (loadChatHistory(doctor.id)) {
                console.log('Restoring chat history from local storage');
                return;
            }
            
            console.log('No chat history found, creating new session');

            // 创建新的聊天会话 - 使用真实的API
            const chatTitle = `${doctor.name} - 医生聊天 @ ${new Date().toLocaleString()}`;
            
            console.log('Creating chat session...');
            
            try {
                // 根据认证类型获取访问令牌
                let accessToken = '';
                if (AuthHelper.isAuthAAD()) {
                    console.log('AAD mode, getting access token...');
                    accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                if (!accessToken) {
                    throw new Error('无法获取访问令牌');
                    }
                    console.log('Access token obtained');
                } else {
                    console.log('None mode, skipping token');
                    accessToken = ''; // None模式下使用空令牌
                }
                
                console.log('Sending create session request...');
                const result: ICreateChatSessionResponse = await chatService.createChatAsync(chatTitle, accessToken);
                console.log('Create session response received');
                
                // 标记会话为已在后端创建
                const apiSession = {
                    ...result.chatSession,
                    title: chatTitle + ' (API)'
                };
                setChatSession(apiSession);
                console.log('Chat session created successfully');
                
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
                console.log('Initial message setup completed');
                
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
                console.log('Using local session (GUID format)');
                
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

        // 保存用户输入的内容，因为setInputValue会清空它
        const messageContent = inputValue;
        
        // 立即添加用户消息到界面并清空输入框
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            // 调用API获取回复，SignalR会自动处理Bot回复的添加
            await callChatAPI(messageContent, chatSession);
            
            // 聊天历史会通过useEffect自动保存，无需手动保存
            
        } catch (err) {
            console.error('❌ 发送消息失败:', err);
            setIsLoading(false);
            
            // 检查是否是会话过期错误
            if (err instanceof Error && err.message.includes('会话已过期')) {
                // 不显示错误消息，因为callChatAPI已经处理了会话过期的情况
                return;
            }
            
            setError(err instanceof Error ? err.message : '发送消息失败');
            
            // 如果API调用失败，但不是因为SignalR问题，添加一个离线回复
            if (!err?.toString().includes('SignalR')) {
                try {
                    const offlineResponse = await generateSmartResponse(messageContent);
            const botMessage: Message = {
                        id: `bot-offline-${Date.now()}`,
                        content: offlineResponse,
                isBot: true,
                timestamp: Date.now(),
                type: ChatMessageType.Message,
                authorRole: AuthorRoles.Bot,
            };
            
            setMessages(prev => [...prev, botMessage]);
                    setError(null); // 清除错误，因为我们提供了离线回复
                } catch (offlineErr) {
                    console.error('❌ 离线回复也失败了:', offlineErr);
                }
            }
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
                console.log('AAD mode, getting access token...');
                accessToken = await AuthHelper.getSKaaSAccessToken(instance, inProgress);
                if (!accessToken) {
                    throw new Error('无法获取访问令牌');
                }
                console.log('Access token obtained');
            } else {
                console.log('None mode, skipping token');
                accessToken = ''; // None模式下使用空令牌
            }

            // 使用现有会话或创建新会话（支持多轮对话）
            let currentSession = session;
            
            // 检查会话是否已经在后端创建过
            if (!session.id || !session.title.includes('(API)')) {
                console.log('Creating new backend session...');
                const sessionTitle = session.title.replace(' (API)', ''); // 移除已有的API标记
                const result: ICreateChatSessionResponse = await chatService.createChatAsync(sessionTitle, accessToken);
                console.log('Backend session created successfully');
                
                // 更新会话信息
                currentSession = {
                    ...result.chatSession,
                    title: sessionTitle + ' (API)' // 标记为已创建到后端
                };
                setChatSession(currentSession); // 更新状态
                
                // 将新会话添加到SignalR组
                await addToSignalRGroup(currentSession.id);
                
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
                    console.log('Local session info updated');
                }
            } else {
                console.log('Using existing session for multi-turn conversation');
                // 确保现有会话也在SignalR组中
                await addToSignalRGroup(session.id);
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
            
            console.log('Sending API request');
            const apiResult = await chatService.getBotResponseAsync(ask, accessToken);
            
            
            
            // 处理后端实际返回的格式 {Value: string, Variables: Array}
            if (apiResult && (apiResult as any).value) {
                const content = (apiResult as any).value as string;
                console.log('API reply received');
                
                // 检查content是否是KernelArguments类型，如果是则需要特殊处理
                if (content === 'Microsoft.SemanticKernel.KernelArguments') {
                    console.log('KernelArguments response detected');
                    const variables = (apiResult as any).variables;
                    if (variables && Array.isArray(variables)) {
                        
                        
                        // 查找关键的回复内容变量，按优先级顺序
                        const contentKeys = ['input', 'response', 'content', 'message', 'answer', 'output'];
                        for (const key of contentKeys) {
                            const responseVar = variables.find((v: any) => v.key === key);
                            if (responseVar && responseVar.value && typeof responseVar.value === 'string') {
                                const content = responseVar.value as string;
                                console.log('Reply content found in variables');
                                // 不直接返回，让SignalR处理消息显示
                                return content;
                            }
                        }
                        
                        // 如果没有找到特定的key，尝试获取第一个有内容的变量
                        const firstVar = variables.find((v: any) => v.value && typeof v.value === 'string' && v.value.length > 10);
                        if (firstVar) {
                            const content = firstVar.value as string;
                            console.log('Using first valid variable as reply');
                            return content;
                        }
                    }
                    
                    console.warn('⚠️ KernelArguments响应但无法提取有效内容');
                    throw new Error('后端响应格式异常，无法提取回复内容');
                }
                
                return content;
            }
            
            // 兼容前端期望的格式 {message: {content: string}}
            if (apiResult && apiResult.message && apiResult.message.content) {
                const content = apiResult.message.content;
                console.log('API reply received (legacy format)');
                return content;
            }
            
            console.warn('⚠️ API响应格式不正确:', apiResult);
            throw new Error('API响应格式不正确');
            
        } catch (err) {
            console.error('❌ API调用失败，错误详情:', err);
            
            // 检查是否是会话不存在错误 (404)
            if (err instanceof Error && (err.message.includes('404') || err.message.includes('Failed to find chat session'))) {
                console.log('Chat session not found (404), clearing invalid session and switching to offline mode');
                
                // 清除无效的会话和历史记录
                if (doctorInfo) {
                    const storageKey = getStorageKey(doctorInfo.id);
                    localStorage.removeItem(storageKey);
                    
                    // 添加提示消息
                    const warningMessage: Message = {
                        id: `warning-${Date.now()}`,
                        content: '⚠️ 检测到会话已过期，已清除无效数据。请点击"清除记录"按钮重新开始，或继续使用离线模式。',
                        isBot: true,
                        timestamp: Date.now(),
                        type: ChatMessageType.Message,
                        authorRole: AuthorRoles.Bot,
                    };
                    
                    setMessages(prev => [...prev, warningMessage]);
                }
                
                // 使用离线模式回复当前消息
                return await generateSmartResponse(message);
            }
            
            // 检查是否是身份验证错误
            if (err instanceof Error && (err.message.includes('401') || err.message.includes('访问令牌'))) {
                console.log('Authentication failed, switching to offline mode');
                return await generateSmartResponse(message);
            }
            
            // 检查是否是网络错误
            if (err instanceof Error && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
                console.log('Network failed, switching to offline mode');
                return await generateSmartResponse(message);
            }
            
            // 对于其他错误，也使用智能模拟回复
            console.log('API unavailable, switching to offline mode');
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
            console.log('Chat history cleared, reinitializing session');
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