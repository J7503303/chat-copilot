import { AuthorRoles, ChatMessageType } from '../../libs/models/ChatMessage';
import { IChatSession } from '../../libs/models/ChatSession';

export interface Message {
    id: string;
    content: string;
    isBot: boolean;
    timestamp: number;
    type?: ChatMessageType;
    authorRole?: AuthorRoles;
}

export interface DoctorInfo {
    id: string;
    name: string;
    dept?: string;
    patient?: string;
}

export interface ChatSessionData {
    id: string;
    title: string;
    messages: Message[];
    chatSession: IChatSession | null;
    timestamp: number;
    lastMessageTime: number;
}

export interface DoctorChatHistoryData {
    doctorInfo: DoctorInfo;
    currentChatId: string;
    chatSessions: Record<string, ChatSessionData>;
    timestamp: number;
}

export interface LegacyChatHistoryData {
    doctorInfo: DoctorInfo;
    messages: Message[];
    chatSession: IChatSession | null;
    timestamp: number;
} 