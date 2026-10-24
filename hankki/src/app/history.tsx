import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { GhostButton, Screen, Sub, Title, styles as ui } from '@/components/ui';
import { addDays, formatShort, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Day {
  date: Date;
  key: string;
  meals: Meal[];
  spent: number;
  /** 주말 제외 설정으로 예산에서 빠진 날 */
  off: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export default function HistoryScreen() {
  const { summary: s, settings, undo, clearPeriod } = useBudget();
  const toast = useToast();

  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  // 하루 계획 금액 = 처음 설정 기준 한 끼 금액 × 하루 끼니 수
  const dayTarget = s.base * Math.max(1, settings.mealsPerDay);

  // 기간의 모든 날을 플래너 한 장처럼 펼친다
  const days: Day[] = [];
  for (let d = s.start; d < s.end; d = addDays(d, 1)) {
    const key = toDateKey(d);
    const meals = s.periodMeals.filter((m) => m.date === key).sort((a, b) => a.at - b.at);
    days.push({
      date: d,
      key,
      meals,
      spent: meals.reduce((sum, m) => sum + m.price, 0),
      off: settings.skipWeekend && (d.getDay() === 0 || d.getDay() === 6),
      isToday: key === todayKey,
      isFuture: d > today,
    });
  }
  const maxSpent = Math.max(dayTarget, ...days.map((d) => d.spent), 1);

  const onUndo = () => {
    const last = undo();
    toast(last ? `${last.name} 기록을 취소했어요` : '되돌릴 기록이 없어요');
  };

  const onReset = () => {
    confirm('기록 초기화', '이번 기간의 먹은 기록을 모두 지울까요?', '지우기', () => {
      clearPeriod();
      toast('이번 기간 기록을 지웠어요');
    });
  };

  const endDay = addDays(s.end, -1);

  return (
    <Screen>
      <View style={ui.row}>
        <Title>먹은 기록</Title>
        <GhostButton label="되돌리기" onPress={onUndo} />
      </View>

      <View style={styles.head}>
        <Sub>
          이번 기간 {formatShort(s.start)} ~ {formatShort(endDay)}
        </Sub>
        <Text style={styles.total}>
          {won(s.spent)}원 · {s.periodMeals.length}끼
        </Text>
      </View>

      {/* 한눈에 보는 날짜별 지출 막대 */}
      <View style={styles.strip}>
        {days.map((d) => {
          const over = !d.off && d.spent > dayTarget;
          return (
            <View key={d.key} style={styles.stripDay}>
              <View style={styles.barTrack}>
                {!d.off && <View style={[styles.targetLine, { bottom: `${(dayTarget / maxSpent) * 100}%` }]} />}
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(d.spent / maxSpent) * 100}%`,
                      backgroundColor: d.spent === 0 ? C.line : over ? C.over : C.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.stripLabel, d.isToday && styles.todayText, d.off && styles.offText]}>
                {days.length > 7 ? d.date.getDate() : DAY_NAMES[d.date.getDay()]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 플래너: 날짜마다 그날 먹은 것과 지출이 자동으로 채워진다 */}
      <View>
        {days.map((d, i) => {
          const last = i === days.length - 1;
          const over = !d.off && d.spent > dayTarget;
          return (
            <View key={d.key} style={[styles.day, d.isFuture && styles.future]}>
              <View style={styles.dateCol}>
                <Text style={[styles.dateNum, d.isToday && styles.todayText, d.off && styles.offText]}>
                  {d.date.getDate()}
                </Text>
                <Text style={[styles.dateDow, d.isToday && styles.todayText, d.off && styles.offText]}>
                  {d.isToday ? '오늘' : DAY_NAMES[d.date.getDay()]}
                </Text>
              </View>

              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    d.meals.length > 0 && { backgroundColor: over ? C.over : C.primary, borderColor: 'transparent' },
                    d.isToday && styles.dotToday,
                  ]}
                />
                {!last && <View style={styles.railLine} />}
              </View>

              <View style={styles.body}>
                <View style={styles.dayHead}>
                  <Text style={[styles.daySpent, over && { color: C.over }, d.spent === 0 && styles.mutedText]}>
                    {d.spent > 0 ? `${won(d.spent)}원` : d.off ? '쉬는 날' : d.isFuture ? '예정' : '지출 없음'}
                  </Text>
                  {!d.off && <Text style={styles.dayTarget}>/ {won(dayTarget)}원</Text>}
                </View>

                {d.meals.map((m) => (
                  <View key={m.id} style={styles.meal}>
                    <Text style={styles.mealTime}>{timeOf(m.at)}</Text>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {m.name}
                      <Text style={styles.mealMenu}> · {m.menu}</Text>
                    </Text>
                    <Text style={styles.mealPrice}>−{won(m.price)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {s.periodMeals.length > 0 && (
        <View style={{ alignItems: 'center' }}>
          <GhostButton label="이번 기간 기록 초기화" onPress={onReset} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: 4 },
  total: { fontSize: 28, fontWeight: '900', color: C.ink },

  strip: { flexDirection: 'row', gap: 4, height: 84, alignItems: 'flex-end' },
  stripDay: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: '100%', maxWidth: 28, height: 60, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, minHeight: 2 },
  targetLine: { position: 'absolute', left: -2, right: -2, height: 1, backgroundColor: C.muted, opacity: 0.4 },
  stripLabel: { fontSize: 11, color: C.muted },

  day: { flexDirection: 'row', minHeight: 64 },
  future: { opacity: 0.5 },
  dateCol: { width: 40, alignItems: 'center', paddingTop: 2 },
  dateNum: { fontSize: 20, fontWeight: '800', color: C.ink, lineHeight: 24 },
  dateDow: { fontSize: 11, color: C.muted },
  rail: { width: 24, alignItems: 'center', paddingTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.line, backgroundColor: C.ground },
  dotToday: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: C.primarySoft },
  railLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 4 },
  body: { flex: 1, paddingBottom: 20, gap: 6 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingTop: 2 },
  daySpent: { fontSize: 16, fontWeight: '700', color: C.ink },
  dayTarget: { fontSize: 12, color: C.muted },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealTime: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'], width: 38 },
  mealName: { flex: 1, fontSize: 14, fontWeight: '500', color: C.ink },
  mealMenu: { fontWeight: '400', color: C.muted },
  mealPrice: { fontSize: 14, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] },

  todayText: { color: C.primary },
  offText: { color: '#B0B8C1' },
  mutedText: { color: C.muted, fontWeight: '500' },
});
