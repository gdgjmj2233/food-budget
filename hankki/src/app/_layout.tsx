import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { ToastProvider } from '@/components/toast';
import { BudgetProvider, useBudget } from '@/store/budget-store';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', title: '홈', icon: 'home-outline', iconOn: 'home' },
  { name: 'recommend', title: '추천', icon: 'location-outline', iconOn: 'location' },
  { name: 'history', title: '기록', icon: 'receipt-outline', iconOn: 'receipt' },
  { name: 'budget', title: '예산', icon: 'wallet-outline', iconOn: 'wallet' },
];

function AppTabs() {
  const { ready } = useBudget();

  // 저장된 기록을 다 불러온 뒤에 스플래시를 내린다
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E4E6DE' },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: C.ground },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? t.iconOn : t.icon} size={size ?? 22} color={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <BudgetProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <AppTabs />
      </ToastProvider>
    </BudgetProvider>
  );
}
