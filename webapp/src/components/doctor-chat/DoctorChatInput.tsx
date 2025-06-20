/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Button, Input, makeStyles } from '@fluentui/react-components';
import { Send24Regular } from '@fluentui/react-icons';
import React from 'react';

const useClasses = makeStyles({
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
});

interface DoctorChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
    isOffline?: boolean;
}

export const DoctorChatInput: React.FC<DoctorChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = '请输入您的医学问题或病例描述...',
    isOffline = false,
}) => {
    const classes = useClasses();

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
        }
    };

    const actualPlaceholder = isOffline 
        ? '⚠️ AI助手离线中，请稍后重试...' 
        : placeholder;

    const isDisabled = disabled || isOffline;

    return (
        <div className={classes.inputArea}>
            <Input
                className={classes.input}
                placeholder={actualPlaceholder}
                value={value}
                onChange={(_, data) => {
                    onChange(data.value);
                }}
                onKeyDown={handleKeyPress}
                disabled={isDisabled}
            />
            <Button
                className={classes.sendButton}
                icon={<Send24Regular />}
                appearance="primary"
                onClick={onSend}
                disabled={!value.trim() || isDisabled}
                title={isOffline ? 'AI助手离线中，无法发送消息' : '发送消息'}
            />
        </div>
    );
}; 