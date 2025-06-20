/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Text, makeStyles } from '@fluentui/react-components';
import { Bot24Regular, Person24Regular } from '@fluentui/react-icons';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AuthorRoles, ChatMessageType } from '../../libs/models/ChatMessage';
import { TypingIndicator } from '../chat/typing-indicator/TypingIndicator';

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
        wordBreak: 'break-word',
    },
    markdownContent: {
        '& p': {
            margin: '0 0 8px 0',
        },
        '& p:last-child': {
            margin: '0',
        },
        '& ul, & ol': {
            paddingLeft: '20px',
            margin: '8px 0',
        },
        '& li': {
            margin: '4px 0',
        },
        '& code': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '0.9em',
        },
        '& pre': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            margin: '8px 0',
        },
        '& pre code': {
            backgroundColor: 'transparent',
            padding: '0',
        },
        '& blockquote': {
            borderLeft: '4px solid #0078d4',
            paddingLeft: '12px',
            margin: '8px 0',
            fontStyle: 'italic',
        },
        '& h1, & h2, & h3, & h4, & h5, & h6': {
            margin: '12px 0 8px 0',
            fontWeight: '600',
        },
        '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: '8px 0',
        },
        '& th, & td': {
            border: '1px solid #ddd',
            padding: '8px',
            textAlign: 'left',
        },
        '& th': {
            backgroundColor: 'rgba(0, 120, 212, 0.1)',
            fontWeight: '600',
        },
    },
    timestamp: {
        marginLeft: '8px',
        opacity: 0.7,
    },
    typingContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
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

    // 渲染消息内容
    const renderMessageContent = () => {
        // 如果是机器人消息且内容为空，显示打字指示器
        if (message.isBot && message.content.length === 0) {
            return (
                <div className={classes.typingContainer}>
                    <TypingIndicator />
                    <Text size={200} style={{ opacity: 0.7 }}>
                        AI正在思考中...
                    </Text>
                </div>
            );
        }

        // 如果消息有内容，根据类型渲染
        if (message.content) {
            // 对于机器人消息，使用Markdown渲染以支持格式化文本
            if (message.isBot) {
                return (
                    <div className={classes.markdownContent}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                );
            } else {
                // 用户消息使用简单文本渲染
                return (
                    <Text className={classes.messageContent}>
                        {message.content}
                    </Text>
                );
            }
        }

        return null;
    };

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
            {renderMessageContent()}
        </div>
    );
}; 