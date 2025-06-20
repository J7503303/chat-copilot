/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { makeStyles } from '@fluentui/react-components';
import React, { useEffect, useRef } from 'react';
import { AuthorRoles, ChatMessageType } from '../../libs/models/ChatMessage';
import { DoctorChatHistory } from './DoctorChatHistory';
import { DoctorChatInput } from './DoctorChatInput';

const useClasses = makeStyles({
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
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

interface DoctorChatRoomProps {
    messages: Message[];
    doctorName?: string;
    inputValue: string;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    isLoading?: boolean;
    error?: string | null;
    isOffline?: boolean;
}

export const DoctorChatRoom: React.FC<DoctorChatRoomProps> = ({
    messages,
    doctorName,
    inputValue,
    onInputChange,
    onSendMessage,
    isLoading = false,
    error = null,
    isOffline = false,
}) => {
    const classes = useClasses();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到消息底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className={classes.chatContainer}>
            <DoctorChatHistory
                messages={messages}
                doctorName={doctorName}
                error={error}
                messagesEndRef={messagesEndRef}
            />
            <DoctorChatInput
                value={inputValue}
                onChange={onInputChange}
                onSend={onSendMessage}
                disabled={isLoading}
                isOffline={isOffline}
            />
        </div>
    );
}; 