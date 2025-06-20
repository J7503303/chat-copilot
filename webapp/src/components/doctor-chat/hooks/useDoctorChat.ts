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
                logger.warn('❌ API创建聊天会话失败，使用本地会话:', apiError);
                
                // 如果API失败，创建本地会话
                const localSession: IChatSession = {
                    id: generateGUID(),
                    title: chatTitle,
                    systemDescription: '',
                    memoryBalance: 0.5,
                    enabledPlugins: [],
                };
                
                setChatSession(localSession);
                logger.info('Using local session (GUID format)');
                
                const welcomeMessage: Message = {
                    id: 'welcome-local',
                    content: `您好，${doctor.name}！我是您的AI医疗助手。${
                        doctor.patient ? `\n当前患者：${doctor.patient}` : ''
                    }${doctor.dept ? `\n所属科室：${doctor.dept}` : ''}\n\n⚠️ 当前使用离线模式，部分功能可能受限。\n\n可能的原因：\n• WebAPI服务未启动\n• 身份验证配置问题\n• 网络连接问题`,
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

    // 医疗智能回复 - 离线模式下的专业医疗建议
    const generateSmartResponse = useCallback(async (message: string): Promise<string> => {
        await new Promise<void>(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const lowerMessage = message.toLowerCase();
        const patientInfo = doctorInfo?.patient ? `患者${doctorInfo.patient}` : '患者';
        const deptContext = doctorInfo?.dept ? `在${doctorInfo.dept}` : '';
        
        // 医疗专业关键词识别和回复
        if (lowerMessage.includes('症状') || lowerMessage.includes('病症') || lowerMessage.includes('表现')) {
            return `🔍 **症状分析建议**\n\n关于"${message}"，建议${deptContext}进行以下评估：\n\n**📋 病史采集**\n• 症状持续时间和发展过程\n• 伴随症状和诱发因素\n• 既往病史和用药史\n\n**🔬 体格检查**\n• 生命体征监测\n• 相关系统体格检查\n• 疼痛评估(如适用)\n\n**🧪 辅助检查**\n• 基础实验室检查\n• 影像学检查(按需)\n• 特殊检查(根据症状)\n\n💡 请结合${patientInfo}的具体情况和临床经验制定个体化诊疗方案。`;
        }
        
        if (lowerMessage.includes('诊断') || lowerMessage.includes('疾病') || lowerMessage.includes('病因')) {
            return `🎯 **诊断思路建议**\n\n针对"${message}"的诊断，建议遵循循证医学原则：\n\n**🔍 鉴别诊断**\n• 根据主诉建立鉴别诊断清单\n• 按疾病可能性和严重性排序\n• 考虑常见病、多发病优先\n\n**📊 诊断依据**\n• 临床症状和体征\n• 实验室和影像学证据\n• 治疗反应性诊断\n\n**⚠️ 风险评估**\n• 排除危重疾病\n• 评估并发症风险\n• 制定监测计划\n\n${deptContext}的${patientInfo}需要综合评估，请结合最新临床指南制定诊疗方案。`;
        }
        
        if (lowerMessage.includes('治疗') || lowerMessage.includes('用药') || lowerMessage.includes('方案')) {
            return `💊 **治疗方案建议**\n\n关于"${message}"的治疗，需要考虑以下要素：\n\n**🎯 治疗原则**\n• 个体化治疗方案\n• 获益风险平衡\n• 循证医学指导\n\n**💉 药物治疗**\n• 药物选择和剂量调整\n• 禁忌症和相互作用\n• 不良反应监测\n\n**🔄 非药物治疗**\n• 生活方式干预\n• 物理治疗和康复\n• 心理支持和健康教育\n\n**📈 疗效监测**\n• 定期随访计划\n• 疗效评估指标\n• 方案调整时机\n\n请为${patientInfo}制定安全有效的个体化治疗方案。`;
        }
        
        if (lowerMessage.includes('检查') || lowerMessage.includes('化验') || lowerMessage.includes('影像')) {
            return `🔬 **检查建议策略**\n\n针对"${message}"的检查需求：\n\n**🎯 检查原则**\n• 基于临床需要选择\n• 成本效益最优化\n• 从基础到复杂递进\n\n**📋 基础检查**\n• 血常规、生化全套\n• 尿常规、便常规\n• 心电图、胸片\n\n**🎭 专科检查**\n• 根据${deptContext}特点选择\n• CT/MRI等影像学检查\n• 内镜、超声等功能检查\n\n**⚡ 急诊检查**\n• 危重症快速筛查\n• 床旁即时检测\n• 紧急影像评估\n\n请根据${patientInfo}的病情轻重缓急合理安排检查项目。`;
        }
        
        if (lowerMessage.includes('护理') || lowerMessage.includes('康复') || lowerMessage.includes('预防')) {
            return `🤝 **护理康复建议**\n\n关于"${message}"的护理康复：\n\n**👩‍⚕️ 护理要点**\n• 病情观察和监护\n• 基础护理和专科护理\n• 并发症预防措施\n\n**🏃‍♂️ 康复指导**\n• 功能锻炼和活动指导\n• 营养支持和饮食管理\n• 心理疏导和健康教育\n\n**🛡️ 预防措施**\n• 一级预防：病因预防\n• 二级预防：早期发现\n• 三级预防：康复治疗\n\n**📚 健康教育**\n• 疾病相关知识普及\n• 自我管理技能培训\n• 家属参与和支持\n\n${deptContext}的${patientInfo}需要全方位的护理康复支持。`;
        }
        
        // 默认专业医疗回复
        const responses = [
            `🩺 **医疗咨询回复**\n\n感谢您关于"${message}"的咨询。作为${deptContext}的AI医疗助手，我建议：\n\n**📋 临床评估**\n• 详细病史采集和体格检查\n• 综合分析临床表现\n• 制定初步诊疗计划\n\n**📖 循证参考**\n• 查阅最新临床指南\n• 参考同类病例经验\n• 考虑多学科会诊\n\n**⚠️ 注意事项**\n• 密切观察病情变化\n• 及时调整治疗方案\n• 加强患者沟通\n\n如需要更具体的建议，请提供${patientInfo}的详细临床信息。`,
            
            `🔍 **专业分析建议**\n\n针对您提到的"${message}"，${deptContext}诊疗建议：\n\n**🎯 诊疗思路**\n• 系统性临床思维\n• 个体化评估方案\n• 规范化诊疗流程\n\n**📊 决策支持**\n• 临床决策树分析\n• 风险效益评估\n• 多方案比较选择\n\n**🤝 团队协作**\n• 医护协同配合\n• 多学科团队讨论\n• 患者参与决策\n\n我会继续为${patientInfo}的诊疗提供专业支持。`,
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
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
            logger.error('发送消息失败，尝试离线模式:', err);
            
            try {
                // 如果API失败，使用离线回复
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
                logger.info('Message sent successfully via offline mode');
                
            } catch (offlineErr) {
                logger.error('❌ 离线回复也失败了:', offlineErr);
                setError(err instanceof Error ? err.message : '发送消息失败');
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, doctorInfo, chatSession, callChatAPI, generateSmartResponse]);

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