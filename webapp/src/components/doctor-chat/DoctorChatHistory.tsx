/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Text, makeStyles } from '@fluentui/react-components';
import React from 'react';
import { AuthorRoles, ChatMessageType } from '../../libs/models/ChatMessage';
import { DoctorChatMessage } from './DoctorChatMessage';

const useClasses = makeStyles({
    messagesArea: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '8px',
        overflow: 'auto',
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

interface DoctorChatHistoryProps {
    messages: Message[];
    doctorName?: string;
    error?: string | null;
    messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export const DoctorChatHistory: React.FC<DoctorChatHistoryProps> = ({
    messages,
    doctorName,
    error = null,
    messagesEndRef,
}) => {
    const classes = useClasses();

    return (
        <div className={classes.messagesArea}>
            {messages.map((message) => (
                <DoctorChatMessage
                    key={message.id}
                    message={message}
                    doctorName={doctorName}
                />
            ))}
            

            
            {error && (
                <div className={classes.error}>
                    <Text size={200}>{error}</Text>
                </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>
    );
}; 