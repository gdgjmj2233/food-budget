import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title, styles as ui } from '@/components/ui';
import { formatDate, formatShort, fromDateKey, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';

export default function HistoryScreen() {
  const { summary: s, undo, clearPeriod } = useBudget();
  const toast = useToast();

  // 날짜별로 묶고 최신 날짜가 위로
  const groups = new Map<string, Meal[]>();
  [...s.periodMeals]
    .sort((a, b) => b.at - a.at)
    .forEach((m) => groups.set(m.date, [...(groups.get(m.date) ?? []), m]));

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

  const endDay = new Date(s.end.getFullYear(), s.end.getMonth(), s.end.getDate() - 1);

  return (
    <Screen>
      <View style={ui.row}>
        <Title>먹은 기록</Title>
        <GhostButton label="되돌리기" onPress={onUndo} />
      </View>

      <Card style={{ gap: 4 }}>
        <Sub>
          이번 기간 {formatShort(s.start)} ~ {formatShort(endDay)}
        </Sub>
        <Text style={styles.total}>
          {won(s.spent)}원 · {s.periodMeals.length}끼
        </Text>
      </Card>

      {groups.size === 0 ? (
        <Card>
          <Text style={styles.empty}>
            아직 기록이 없어요.{'\n'}홈이나 추천 화면에서 식당을 눌러 보세요.
          </Text>
        </Card>
      ) : (
        [...groups.entries()].map(([date, meals]) => (
          <View key={date} style={{ gap: 8 }}>
            <View style={ui.row}>
              <Text style={styles.dateLabel}>{formatDate(fromDateKey(date))}</Text>
              <Sub>{won(meals.reduce((sum, m) => sum + m.price, 0))}원</Sub>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {meals.map((m, i) => (
                <View key={m.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{m.name}</Text>
                    <Text style={styles.menu}>{m.menu}</Text>
                  </View>
                  <Text style={styles.price}>−{won(m.price)}원</Text>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}

      {s.periodMeals.length > 0 && (
        <View style={{ alignItems: 'center' }}>
          <GhostButton label="이번 기간 기록 초기화" onPress={onReset} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 28, fontWeight: '900', color: C.ink },
  empty: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20, lineHeight: 21 },
  dateLabel: { fontSize: 14, fontWeight: '700', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  divider: { borderTopWidth: 1, borderTopColor: C.divider },
  name: { fontSize: 15, fontWeight: '500', color: C.ink },
  menu: { fontSize: 12, color: C.muted },
  price: { fontSize: 15, fontWeight: '700', color: C.ink },
});
