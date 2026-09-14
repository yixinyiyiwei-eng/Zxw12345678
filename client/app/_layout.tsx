import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import '../global.css';

// Android 音频属性（用于闹钟频道）
const AndroidAudioUsage = { ALARM: 4, NOTIFICATION: 5 };
const AndroidAudioContentType = { SONIFICATION: 4 };

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

// 必须在模块顶部设置通知处理器，确保在收到通知前完成注册
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    try {
      // 请求通知权限
      Notifications.requestPermissionsAsync();

      // 如果是 Android，创建通知频道（确保声音和悬浮窗弹窗生效）
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: '默认通知',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D7D46',
          sound: 'default',
        });
        // 创建闹钟提醒频道，用于每日计划提醒
        Notifications.setNotificationChannelAsync('alarm', {
          name: '日程闹钟',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 500, 500, 500, 500],
          lightColor: '#2D7D46',
          sound: 'default',
          bypassDnd: true,
          audioAttributes: {
            usage: AndroidAudioUsage.ALARM,
            contentType: AndroidAudioContentType.SONIFICATION,
          },
        });
      }
    } catch (e) {
      console.warn('通知模块初始化失败:', e);
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
      </Stack>
      <Toast />
    </Provider>
  );
}