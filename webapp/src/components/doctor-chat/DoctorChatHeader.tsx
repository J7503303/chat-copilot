/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Button, Text, makeStyles } from '@fluentui/react-components';
import { Add24Regular, History24Regular, Person24Regular } from '@fluentui/react-icons';
import React from 'react';

const useClasses = makeStyles({
    doctorInfo: {
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        gap: '8px',
        padding: '16px 24px',
        borderBottom: '1px solid #e0e0e0',
    },
});

interface DoctorInfo {
    id: string;
    name: string;
    dept?: string;
    patient?: string;
}

interface DoctorChatHeaderProps {
    doctorInfo: DoctorInfo | null;
    onNewChat: () => void;
    onShowHistory: () => void;
}

export const DoctorChatHeader: React.FC<DoctorChatHeaderProps> = ({
    doctorInfo,
    onNewChat,
    onShowHistory,
}) => {
    const classes = useClasses();

    const buildDisplayText = () => {
        if (!doctorInfo) return '';
        const parts = [doctorInfo.name];
        if (doctorInfo.dept) parts.push(`[${doctorInfo.dept}]`);
        if (doctorInfo.patient) parts.push(`- ${doctorInfo.patient}`);
        return parts.join(' ');
    };

    if (!doctorInfo) return null;

    return (
        <div className={classes.doctorInfo}>
            <Person24Regular />
            <Text weight="semibold">
                {buildDisplayText()}
            </Text>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <Button 
                    size="small" 
                    appearance="subtle"
                    icon={<Add24Regular />}
                    onClick={onNewChat}
                >
                    新聊天
                </Button>
                <Button 
                    size="small" 
                    appearance="subtle"
                    icon={<History24Regular />}
                    onClick={onShowHistory}
                >
                    历史记录
                </Button>
            </div>
        </div>
    );
}; 