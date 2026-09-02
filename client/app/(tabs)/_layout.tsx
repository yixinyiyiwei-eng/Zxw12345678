import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle = {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: insets.bottom + 8,
    height: 60 + insets.bottom,
  };

  if (Platform.OS === 'web') {
    tabBarStyle = {
      ...tabBarStyle,
      height: 'auto' as any,
    };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#2D7D46',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '工作台',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: '财务',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="wallet" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '日程',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="calendar-days" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: '目标',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="bullseye" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: '笔记',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="book-open" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: '锻炼',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="dumbbell" size={18} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
