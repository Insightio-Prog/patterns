import {
  IconChartBar,
  IconFileText,
  IconHome,
  IconPlus,
} from '@tabler/icons-react-native';
import { Tabs } from 'expo-router';

import { color } from '@/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.text3,
        tabBarStyle: {
          display: 'none',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: tint, size }) => (
            <IconHome color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color: tint, size }) => (
            <IconPlus color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          title: 'Patterns',
          tabBarIcon: ({ color: tint, size }) => (
            <IconChartBar color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color: tint, size }) => (
            <IconFileText color={tint} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
