import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import { DEFAULT_AMOUNT, formatShort, won, type Period } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';

const MAX_AMOUNT = 10_000_000;

export default function BudgetScreen() {
  const { settings, summary: s, updateSettings, startNewPeriod } = useBudget();
  const toast = useToast();
  const [text, setText] = useState(won(settings.amount));
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : won(settings.amount);

  const setPeriod = (period: Period) => {
    if (period === settings.period) return;
    updateSettings({ period, amount: DEFAULT_AMOUNT[period] });
  };

  const onAmount = (t: string) => {
    const n = Math.min(parseInt(t.replace(/\D/g, ''), 10) || 0, MAX_AMOUNT);
    setText(n ? won(n) : '');
    if (n >= 1000) updateSettings({ amount: n });
  };

  const onNewPeriod = () => {
    confirm('새 기간 시작', '오늘부터 새 예산 기간을 시작할까요? 지난 기록은 남아 있지만 계산에서는 빠집니다.', '시작', () => {
      startNewPeriod();
      toast('오늘부터 새 기간을 시작했어요');
    });
  };

  const endDay = new Date(s.end.getFullYear(), s.end.getMonth(), s.end.getDate() - 1);

  return (
    <Screen>
      <Title>식비 예산 설정</Title>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>예산 기간</Text>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {(
            [
              ['week', '주간'],
              ['month', '월간'],
            ] as const
          ).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => setPeriod(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings.period === k }}
              style={[styles.segBtn, settings.period === k && styles.segOn]}>
              <Text style={[styles.segText, settings.period === k && { fontWeight: '700' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{settings.period === 'week' ? '일주일' : '한 달'} 식비 예산</Text>
        <View style={styles.amount}>
          <TextInput
            value={shown}
            keyboardType="number-pad"
            accessibilityLabel="식비 예산 금액"
            onFocus={() => {
              setText(won(settings.amount));
              setEditing(true);
            }}
            onBlur={() => setEditing(false)}
            onChangeText={onAmount}
            style={styles.amountInput}
          />
          <Text style={styles.amountUnit}>원</Text>
        </View>
      </View>

      <Card style={{ paddingVertical: 6 }}>
        <View style={styles.setRow}>
          <Text style={styles.setLabel}>하루 식사 횟수</Text>
          <View style={styles.step}>
            <Pressable
              style={styles.stepBtn}
              accessibilityLabel="식사 횟수 줄이기"
              onPress={() => updateSettings({ mealsPerDay: Math.max(1, settings.mealsPerDay - 1) })}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepVal}>{settings.mealsPerDay}끼</Text>
            <Pressable
              style={styles.stepBtn}
              accessibilityLabel="식사 횟수 늘리기"
              onPress={() => updateSettings({ mealsPerDay: Math.min(3, settings.mealsPerDay + 1) })}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.setRow, styles.divider]}>
          <Text style={styles.setLabel}>주말은 예산에서 제외</Text>
          <Pressable
            onPress={() => updateSettings({ skipWeekend: !settings.skipWeekend })}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.skipWeekend }}
            accessibilityLabel="주말 제외"
            style={[styles.tog, settings.skipWeekend && styles.togOn]}>
            <View style={styles.knob} />
          </Pressable>
        </View>
      </Card>

      <View style={styles.result}>
        <Text style={styles.resultSmall}>
          자동 계산 결과 · {formatShort(s.start)} ~ {formatShort(endDay)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={styles.resultLabel}>한 끼 기준</Text>
          <Text style={styles.resultBig}>{won(s.base)}원</Text>
        </View>
        <Text style={styles.resultSmall}>
          {s.totalDays}일 × 하루 {settings.mealsPerDay}끼 = 총 {s.totalDays * settings.mealsPerDay}끼 기준
        </Text>
      </View>

      <Sub>설정을 바꾸면 이미 먹은 기록은 그대로 두고 남은 예산을 다시 계산합니다.</Sub>

      <View style={{ alignItems: 'center' }}>
        <GhostButton label="오늘부터 새 기간 시작" onPress={onNewPeriod} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: C.ink },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: '#E7E9E1', padding: 4, borderRadius: 14 },
  segBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#fff' },
  segText: { fontSize: 15, fontWeight: '500', color: C.ink },
  amount: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '900', color: C.ink },
  amountUnit: { fontSize: 18, fontWeight: '700', color: C.ink },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 60 },
  divider: { borderTopWidth: 1, borderTopColor: C.divider },
  setLabel: { fontSize: 15, fontWeight: '500', color: C.ink },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 20, color: C.ink },
  stepVal: { fontSize: 17, fontWeight: '700', minWidth: 32, textAlign: 'center', color: C.ink },
  tog: { width: 52, height: 32, borderRadius: 16, backgroundColor: '#C9CDC2', padding: 3, alignItems: 'flex-start' },
  togOn: { backgroundColor: C.green, alignItems: 'flex-end' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  result: { backgroundColor: C.greenSoft, borderRadius: 18, padding: 20, gap: 6 },
  resultSmall: { fontSize: 13, color: C.greenDark },
  resultLabel: { fontSize: 14, fontWeight: '700', color: C.greenDark },
  resultBig: { fontSize: 34, fontWeight: '900', color: C.greenDark },
});
