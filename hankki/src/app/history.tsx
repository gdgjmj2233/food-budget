import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, styles as ui } from '@/components/ui';
import { PLACES } from '@/data/places';
import { formatDate, fromDateKey, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C, CAT_COLORS } from '@/theme';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const SUN = '#E5484D';
const SAT = '#3182F6';
/** 한 칸에 보여줄 최대 칩 수. 넘치면 +n 으로 줄인다 */
const MAX_CHIPS = 3;

const CAT_OF = new Map(PLACES.map((p) => [p.id, p.cat]));
const chipColor = (m: Meal) => {
  const cat = m.placeId ? CAT_OF.get(m.placeId) : undefined;
  return cat ? CAT_COLORS[cat] : { bg: C.primarySoft, fg: C.primaryDark };
};

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 달력 한 장: 앞뒤 달 날짜까지 채워 7일 단위 주로 나눈다 */
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDate) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
  );
}

export default function HistoryScreen() {
  const { summary: s, meals, undo, clearPeriod } = useBudget();
  const toast = useToast();

  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);

  // 날짜별로 먹은 기록 묶기 (시간순)
  const byDay = new Map<string, Meal[]>();
  [...meals]
    .sort((a, b) => a.at - b.at)
    .forEach((m) => byDay.set(m.date, [...(byDay.get(m.date) ?? []), m]));
  const sumOf = (list: Meal[] = []) => list.reduce((sum, m) => sum + m.price, 0);

  const monthPrefix = `${cursor.y}-${pad(cursor.m + 1)}`;
  const monthMeals = meals.filter((m) => m.date.startsWith(monthPrefix));
  const weeks = monthGrid(cursor.y, cursor.m);
  const selMeals = byDay.get(selected) ?? [];

  const move = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

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

  return (
    <Screen>
      <View style={ui.row}>
        <View style={styles.monthNav}>
          <Text style={styles.month}>
            {cursor.y !== today.getFullYear() && `${cursor.y}년 `}
            {cursor.m + 1}월
          </Text>
          <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="이전 달" style={styles.arrow}>
            <Ionicons name="chevron-back" size={20} color={C.muted} />
          </Pressable>
          <Pressable onPress={() => move(1)} hitSlop={10} accessibilityLabel="다음 달" style={styles.arrow}>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </Pressable>
        </View>
        <GhostButton label="되돌리기" onPress={onUndo} />
      </View>

      <View style={styles.summary}>
        <View style={{ flex: 1, gap: 2 }}>
          <Sub>이번 달 식비</Sub>
          <Text style={styles.sumValue}>
            {won(sumOf(monthMeals))}원 · {monthMeals.length}끼
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Sub>예산 남음</Sub>
          <Text style={[styles.sumValue, s.remain < 0 && { color: C.over }]}>{won(s.remain)}원</Text>
        </View>
      </View>

      {/* 달력 */}
      <View>
        <View style={styles.week}>
          {DAY_NAMES.map((n) => (
            <Text key={n} style={styles.dow}>
              {n}
            </Text>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={toDateKey(week[0])} style={styles.week}>
            {week.map((d) => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === cursor.m;
              const isToday = key === todayKey;
              const list = byDay.get(key) ?? [];
              const total = sumOf(list);
              const dayColor = d.getDay() === 0 ? SUN : d.getDay() === 6 ? SAT : C.ink;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelected(key)}
                  style={[styles.cell, !inMonth && styles.faded, key === selected && styles.cellSelected]}>
                  <View style={[styles.dateWrap, isToday && styles.todayCircle]}>
                    <Text style={[styles.date, { color: isToday ? '#fff' : dayColor }]}>{d.getDate()}</Text>
                  </View>

                  {list.slice(0, MAX_CHIPS).map((m) => {
                    const c = chipColor(m);
                    return (
                      <View key={m.id} style={[styles.chip, { backgroundColor: c.bg, borderLeftColor: c.fg }]}>
                        <Text style={[styles.chipText, { color: c.fg }]} numberOfLines={1}>
                          {m.name}
                        </Text>
                      </View>
                    );
                  })}
                  {list.length > MAX_CHIPS && <Text style={styles.more}>+{list.length - MAX_CHIPS}</Text>}
                  {total > 0 && <Text style={styles.dayTotal}>{won(total)}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* 고른 날 상세 */}
      <Card style={{ paddingVertical: 4 }}>
        <View style={[ui.row, styles.detailHead]}>
          <Text style={styles.detailDate}>{formatDate(fromDateKey(selected))}</Text>
          <Text style={styles.detailSum}>{won(sumOf(selMeals))}원</Text>
        </View>
        {selMeals.length === 0 ? (
          <Text style={styles.empty}>이 날은 기록이 없어요</Text>
        ) : (
          selMeals.map((m) => {
            const c = chipColor(m);
            return (
              <View key={m.id} style={styles.row}>
                <View style={[styles.bar, { backgroundColor: c.fg }]} />
                <Text style={styles.time}>{timeOf(m.at)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.menu}>{m.menu}</Text>
                </View>
                <Text style={styles.price}>−{won(m.price)}원</Text>
              </View>
            );
          })
        )}
      </Card>

      {s.periodMeals.length > 0 && (
        <View style={{ alignItems: 'center' }}>
          <GhostButton label="이번 기간 기록 초기화" onPress={onReset} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  month: { fontSize: 30, fontWeight: '900', color: C.ink, marginRight: 6 },
  arrow: { padding: 4 },

  summary: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, padding: 18, gap: 12 },
  sumValue: { fontSize: 18, fontWeight: '800', color: C.ink },

  week: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontSize: 13, color: C.muted, paddingVertical: 8 },
  cell: { flex: 1, minHeight: 96, alignItems: 'center', paddingTop: 4, paddingHorizontal: 2, gap: 3, borderRadius: 10 },
  cellSelected: { backgroundColor: C.card },
  faded: { opacity: 0.35 },
  dateWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: C.primary },
  date: { fontSize: 15, fontWeight: '600' },
  chip: { alignSelf: 'stretch', borderRadius: 4, borderLeftWidth: 3, paddingVertical: 3, paddingHorizontal: 3 },
  chipText: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  more: { fontSize: 10, color: C.muted },
  dayTotal: { fontSize: 10, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },

  detailHead: { paddingVertical: 12 },
  detailDate: { fontSize: 15, fontWeight: '700', color: C.ink },
  detailSum: { fontSize: 15, fontWeight: '700', color: C.ink },
  empty: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: C.divider },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  time: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'] },
  name: { fontSize: 15, fontWeight: '500', color: C.ink },
  menu: { fontSize: 12, color: C.muted },
  price: { fontSize: 15, fontWeight: '700', color: C.ink },
});
