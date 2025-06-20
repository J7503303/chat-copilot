import { AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FluentProvider, Subtitle1, makeStyles, shorthands, tokens } from '@fluentui/react-components';

import * as React from 'react';
import { useCallback, useEffect } from 'react';
import DoctorChatApp from './DoctorChatApp';
import Chat from './components/chat/Chat';
import { Loading, Login } from './components/views';
import { AuthHelper } from './libs/auth/AuthHelper';
import { useChat, useFile } from './libs/hooks';
import { AlertType } from './libs/models/AlertType';
import { useAppDispatch, useAppSelector } from './redux/app/hooks';
import { RootState } from './redux/app/store';
import { FeatureKeys } from './redux/features/app/AppState';
import { addAlert, setActiveUserInfo, setServiceInfo } from './redux/features/app/appSlice';
import { semanticKernelDarkTheme, semanticKernelLightTheme } from './styles';

export const useClasses = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        ...shorthands.overflow('hidden'),
    },
    header: {
        alignItems: 'center',
        backgroundColor: tokens.colorBrandForeground2,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        '& h1': {
            paddingLeft: tokens.spacingHorizontalXL,
            display: 'flex',
        },
        height: '48px',
        justifyContent: 'space-between',
        width: '100%',
    },
    persona: {
        marginRight: tokens.spacingHorizontalXXL,
    },
    cornerItems: {
        display: 'flex',
        ...shorthands.gap(tokens.spacingHorizontalS),
    },
});

// 定义医生模式的类型接口
interface DoctorModeState {
    isDoctorMode: boolean;
    doctorId: string;
    doctorName: string;
    deptName: string;
    patientName: string;
}

// 更好的做法是使用Record类型
type UrlParamsRecord = Record<string, string>;

// 定义postMessage数据的类型接口
interface PostMessageData {
    type: string;
    data: {
        url: string;
        params: UrlParamsRecord;
    };
}

export enum AppState {
    ProbeForBackend,
    SettingUserInfo,
    ErrorLoadingChats,
    ErrorLoadingUserInfo,
    LoadChats,
    LoadingChats,
    Chat,
    SigningOut,
}

const checkDoctorChatMode = (): DoctorModeState => {
    const params = new URLSearchParams(window.location.search);
    const doctorId = params.get('doctor_id') ?? params.get('userId');
    const isDoctor = doctorId !== null && doctorId.trim() !== '';
    
    return {
        isDoctorMode: isDoctor,
        doctorId: doctorId ?? '',
        doctorName: params.get('doctor_name') ?? params.get('userName') ?? '',
        deptName: params.get('dept_name') ?? '',
        patientName: params.get('patient_name') ?? ''
    };
};

const App = () => {
    const classes = useClasses();
    const [appState, setAppState] = React.useState(AppState.ProbeForBackend);
    const dispatch = useAppDispatch();
    const { instance } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const { features, isMaintenance } = useAppSelector((state: RootState) => state.app);

    const chat = useChat();
    const file = useFile();

    // 检查医生聊天模式 - 监听URL参数变化
    const [doctorMode, setDoctorMode] = React.useState<DoctorModeState>(() => checkDoctorChatMode());

    // 通知父窗口URL参数变化（用于electron集成）
    const notifyParentOfUrlChange = React.useCallback((newDoctorMode: DoctorModeState) => {
        if (newDoctorMode.isDoctorMode && window.parent !== window) {
            try {
                const params = new URLSearchParams(window.location.search);
                const paramObj: UrlParamsRecord = {};
                params.forEach((value, key) => {
                    paramObj[key] = value;
                });
                
                const messageData: PostMessageData = {
                    type: 'URL_CHANGED',
                    data: {
                        url: window.location.href,
                        params: paramObj
                    }
                };
                
                window.parent.postMessage(messageData, '*');
            } catch (e) {
                // 忽略跨域错误
            }
        }
    }, []);

    // 处理URL参数变化
    const handleDoctorModeChange = React.useCallback((newDoctorMode: DoctorModeState) => {
        if (JSON.stringify(newDoctorMode) !== JSON.stringify(doctorMode)) {
            setDoctorMode(newDoctorMode);
            notifyParentOfUrlChange(newDoctorMode);
        }
    }, [doctorMode, notifyParentOfUrlChange]);

    // 监听URL参数变化
    React.useEffect(() => {
        let lastUrl = window.location.href;
        
        const checkAndUpdate = () => {
            // 只有URL实际改变时才检查
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                const newDoctorMode = checkDoctorChatMode();
                handleDoctorModeChange(newDoctorMode);
            }
        };

        // 监听各种URL变化事件
        window.addEventListener('popstate', checkAndUpdate);
        window.addEventListener('hashchange', checkAndUpdate);
        
        // 定期检查URL参数变化（备选方案，但减少频率）
        const intervalId = setInterval(checkAndUpdate, 5000);
        
        return () => {
            window.removeEventListener('popstate', checkAndUpdate);
            window.removeEventListener('hashchange', checkAndUpdate);
            clearInterval(intervalId);
        };
    }, [handleDoctorModeChange]);

    const handleAppStateChange = useCallback((newState: AppState) => {
        setAppState(newState);
    }, []);

    // 设置用户信息（适用于医生模式）
    const setupUserInfoForDoctorMode = useCallback(() => {
        if (isAuthenticated && doctorMode.isDoctorMode) {
            const account = instance.getActiveAccount();
            if (account) {
                dispatch(
                    setActiveUserInfo({
                        id: `${account.localAccountId}.${account.tenantId}`,
                        email: account.username,
                        username: account.name ?? account.username,
                    }),
                );
            }
        }
    }, [isAuthenticated, doctorMode.isDoctorMode, instance, dispatch]);

    React.useEffect(() => {
        // 如果是医生模式，设置用户信息
        if (doctorMode.isDoctorMode) {
            setupUserInfoForDoctorMode();
        }
    }, [doctorMode.isDoctorMode, setupUserInfoForDoctorMode]);

    useEffect(() => {
        if (isMaintenance && appState !== AppState.ProbeForBackend) {
            handleAppStateChange(AppState.ProbeForBackend);
            return;
        }

        if (isAuthenticated && appState === AppState.SettingUserInfo) {
            const account = instance.getActiveAccount();
            if (!account) {
                handleAppStateChange(AppState.ErrorLoadingUserInfo);
            } else {
                dispatch(
                    setActiveUserInfo({
                        id: `${account.localAccountId}.${account.tenantId}`,
                        email: account.username,
                        username: account.name ?? account.username,
                    }),
                );

                if (account.username.split('@')[1] === 'microsoft.com') {
                    dispatch(
                        addAlert({
                            message:
                                'By using Chat Copilot, you agree to protect sensitive data, not store it in chat, and allow chat history collection for service improvements. This tool is for internal use only.',
                            type: AlertType.Info,
                        }),
                    );
                }

                handleAppStateChange(AppState.LoadChats);
            }
        }

        if ((isAuthenticated || !AuthHelper.isAuthAAD()) && appState === AppState.LoadChats) {
            handleAppStateChange(AppState.LoadingChats);
            void Promise.all([
                chat
                    .loadChats()
                    .then(() => {
                        handleAppStateChange(AppState.Chat);
                    })
                    .catch((error) => {
                        console.error('Error loading chats:', error);
                        handleAppStateChange(AppState.ErrorLoadingChats);
                    }),
                file.getContentSafetyStatus(),
                chat.getServiceInfo().then((serviceInfo) => {
                    if (serviceInfo) {
                        dispatch(setServiceInfo(serviceInfo));
                    }
                }),
            ]);
        } // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instance, isAuthenticated, appState, isMaintenance]);

    const theme = features[FeatureKeys.DarkMode].enabled ? semanticKernelDarkTheme : semanticKernelLightTheme;

    // 如果是医生聊天模式，直接渲染医生聊天界面
    if (doctorMode.isDoctorMode) {
        return (
            <FluentProvider className="app-container" theme={theme}>
                <DoctorChatApp />
            </FluentProvider>
        );
    }

    // 原有的正常聊天模式
    return (
        <FluentProvider className="app-container" theme={theme}>
            <div className={classes.container}>
                {AuthHelper.isAuthAAD() ? (
                    <>
                        <UnauthenticatedTemplate>
                            <div className={classes.container}>
                                <div className={classes.header} aria-label="Application Header">
                                    <Subtitle1 as="h1">Chat Copilot</Subtitle1>
                                </div>
                                {appState === AppState.SigningOut && <Loading text="Signing you out..." />}
                                {appState !== AppState.SigningOut && <Login />}
                            </div>
                        </UnauthenticatedTemplate>
                        <AuthenticatedTemplate>
                            <Chat classes={classes} appState={appState} setAppState={handleAppStateChange} />
                        </AuthenticatedTemplate>
                    </>
                ) : (
                    <Chat classes={classes} appState={appState} setAppState={handleAppStateChange} />
                )}
            </div>
        </FluentProvider>
    );
};

export default App;
