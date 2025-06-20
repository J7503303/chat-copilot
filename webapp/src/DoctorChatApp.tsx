/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { FluentProvider, makeStyles, Text } from '@fluentui/react-components';
import React, { useCallback, useEffect, useState } from 'react';
import { DoctorChatHeader } from './components/doctor-chat/DoctorChatHeader';
import { DoctorChatRoom } from './components/doctor-chat/DoctorChatRoom';
import { useDoctorChat } from './components/doctor-chat/hooks/useDoctorChat';
import { DoctorInfo } from './components/doctor-chat/types';
import { semanticKernelLightTheme } from './styles';

const useClasses = makeStyles({
    app: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
    },
    error: {
        color: '#d13438',
        padding: '16px',
        textAlign: 'center',
    },
});

const DoctorChatApp: React.FC = () => {
    const classes = useClasses();
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    
    const {
        doctorInfo,
        messages,
        inputValue,
        isLoading,
        error,
        isAuthReady,
        isOffline,
        setDoctorInfo,
        setInputValue,
        createNewChat,
        sendMessage,
        initializeChatSession,
    } = useDoctorChat();

    // 获取医生参数的函数
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
        
        // 从URL参数获取医生信息
        const params = new URLSearchParams(window.location.search);
        return {
            doctorId: params.get('doctor_id') ?? params.get('userId') ?? '',
            doctorName: params.get('doctor_name') ?? params.get('userName') ?? '',
            deptName: params.get('dept_name') ?? '',
            patientName: params.get('patient_name') ?? ''
        };
    }, []);

    // 初始化医生信息
    useEffect(() => {
        // 只有在身份验证准备就绪后才初始化医生信息
        if (!isAuthReady) return;

        const { doctorId, doctorName, deptName, patientName } = getDoctorParams();

        if (!doctorId) {
            return; // error状态会在render中处理
        }

        const info: DoctorInfo = {
            id: doctorId,
            name: doctorName || `医生${doctorId}`,
            dept: deptName || undefined,
            patient: patientName || undefined,
        };

        setDoctorInfo(info);
        void initializeChatSession(info);
    }, [isAuthReady, getDoctorParams, setDoctorInfo, initializeChatSession]);

    const handleShowHistory = () => {
        setIsHistoryDrawerOpen(true);
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);
    };

    const handleSendMessage = () => {
        void sendMessage();
    };

    // 如果没有医生信息且有错误，显示错误界面
    if (!doctorInfo) {
        const { doctorId } = getDoctorParams();
        if (!doctorId) {
            return (
                <FluentProvider theme={semanticKernelLightTheme}>
                    <div className={classes.app}>
                        <div className={classes.error}>
                            <Text weight="semibold">配置错误</Text>
                            <br />
                            <Text>缺少必需的医生ID参数 (doctor_id)</Text>
                            <br />
                            <Text size={200}>
                                请检查URL参数，需要包含 doctor_id 或 userId 参数
                            </Text>
                        </div>
                    </div>
                </FluentProvider>
            );
        }
    }

    return (
        <FluentProvider theme={semanticKernelLightTheme}>
            <div className={classes.app}>
                <DoctorChatHeader
                    doctorInfo={doctorInfo}
                    onNewChat={createNewChat}
                    onShowHistory={handleShowHistory}
                />
                
                <DoctorChatRoom
                    messages={messages}
                    doctorName={doctorInfo?.name}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    error={error}
                    isOffline={isOffline}
                />
                
                {/* 历史记录抽屉组件将在后续实现 */}
                {isHistoryDrawerOpen && (
                    <div style={{ 
                        position: 'fixed', 
                        top: 0, 
                        right: 0, 
                        width: '300px', 
                        height: '100vh', 
                        backgroundColor: '#f5f5f5', 
                        border: '1px solid #ccc',
                        zIndex: 1000,
                        padding: '16px'
                    }}>
                        <Text weight="semibold">历史记录</Text>
                        <br />
                        <Text size={200}>TODO: 实现历史记录抽屉</Text>
                        <br />
                        <button 
                            onClick={() => {
                                setIsHistoryDrawerOpen(false);
                            }}
                        >
                            关闭
                        </button>
                    </div>
                )}
            </div>
        </FluentProvider>
    );
};

export default DoctorChatApp; 