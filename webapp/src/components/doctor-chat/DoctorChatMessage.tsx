/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Text, makeStyles } from '@fluentui/react-components';
import { Bot24Regular, Person24Regular } from '@fluentui/react-icons';
import React from 'react';
import { AuthorRoles, ChatMessageType } from '../../libs/models/ChatMessage';

const useClasses = makeStyles({
    messageContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '8px',
        maxWidth: '80%',
        wordBreak: 'break-word',
    },
    botMessage: {
        alignSelf: 'flex-start',
        border: '1px solid #e0e0e0',
        backgroundColor: '#ffffff',
        color: 'inherit',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#0078d4',
        color: 'white',
    },
    messageHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
    },
    messageContent: {
        whiteSpace: 'pre-wrap',
    },
    timestamp: {
        marginLeft: '8px',
        opacity: 0.7,
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

interface DoctorChatMessageProps {
    message: Message;
    doctorName?: string;
}

export const DoctorChatMessage: React.FC<DoctorChatMessageProps> = ({
    message,
    doctorName = '您',
}) => {
    const classes = useClasses();

    return (
        <div
            className={`${classes.messageContainer} ${
                message.isBot ? classes.botMessage : classes.userMessage
            }`}
        >
            <div className={classes.messageHeader}>
                {message.isBot ? <Bot24Regular /> : <Person24Regular />}
                <div>
                    <Text size={200} weight="semibold">
                        {message.isBot ? 'AI医疗助手' : doctorName}
                    </Text>
                    <Text size={100} className={classes.timestamp}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                </div>
            </div>
            <div>
                <Text className={classes.messageContent}>
                    {message.content}
                </Text>
            </div>
        </div>
    );
}; 