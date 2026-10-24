// 여러 화면에서 같이 쓰는 기본 UI 조각

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C } from '@/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Sub({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  color = C.ink,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}>
      {icon && <Ionicons name={icon} size={20} color="#fff" />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ghost, pressed && { backgroundColor: C.divider }]}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', color: C.ink },
  sub: { fontSize: 13, color: C.muted },
  sec: { fontSize: 16, fontWeight: '700', color: C.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 18 },
  primary: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghost: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 13, fontWeight: '500', color: C.ink },
});
