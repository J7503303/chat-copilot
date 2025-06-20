/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { useCallback, useState } from 'react';
import { AuthorRoles, ChatMessageType } from '../../../libs/models/ChatMessage';
import { IChatSession } from '../../../libs/models/ChatSession';
import { ChatSessionData, DoctorChatHistoryData, DoctorInfo, Message } from '../types';

export const useDoctorChat = () => {
    // const { instance, inProgress } = useMsal();
    // const dispatch = useAppDispatch();
    // const { activeUserInfo } = useAppSelector((state: RootState) => state.app);

    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatSession, setChatSession] = useState<IChatSession | null>(null);
    const [currentChatId, setCurrentChatId] = useState<string>('');
    const [chatSessions, setChatSessions] = useState<Record<string, ChatSessionData>>({});
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [chatService] = useState(() => new ChatService());
    const [isAuthReady, setIsAuthReady] = useState(false);

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
            console.warn('保存聊天历史失败:', error);
        }
    }, [currentChatId, chatSessions, messages, chatSession, generateChatTitle, getStorageKey]);

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
        
        console.log('Starting new chat session');
    }, [doctorInfo, messages, saveChatSessions, generateGUID]);

    // 智能模拟回复
    const generateSmartResponse = useCallback(async (message: string): Promise<string> => {
        await new Promise<void>(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('症状') || lowerMessage.includes('病症')) {
            return `关于"${message}"中提到的症状，我建议：\n\n1. 详细记录症状的持续时间、严重程度和触发因素\n2. 考虑进行相关的体格检查和实验室检查\n3. 结合患者的病史和体征进行综合分析\n\n请注意，这只是初步建议，具体诊疗方案需要结合临床实际情况制定。`;
        }
        
        const responses = [
            `作为您的AI医疗助手，我理解您关于"${message}"的询问。基于医学知识库，我建议您：\n\n1. 仔细评估患者的整体状况\n2. 考虑相关的临床指南和最佳实践\n3. 结合您的临床经验做出判断\n\n如果您能提供更多具体信息，我可以给出更精准的建议。`,
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }, []);

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
            // 这里可以调用真实的API
            const response = await generateSmartResponse(messageContent);
            
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
            console.error('发送消息失败:', err);
            setError(err instanceof Error ? err.message : '发送消息失败');
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, doctorInfo, chatSession, generateSmartResponse]);

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
    };
}; 