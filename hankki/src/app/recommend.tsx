import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PlaceItem } from '@/components/place-item';
import { PrimaryButton, Screen, Sub, Title, styles as ui } from '@/components/ui';
import { bestMenu, CATEGORIES, cheapestPrice, DATA_SOURCE, PLACES, type Area } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';

type SortKey = 'price' | 'walk';
const AREAS: ('전체' | Area)[] = ['전체', '후문', '정문', '인하대역'];

export default function RecommendScreen() {
  const { summary: s } = useBudget();
  const { pick, pickRandom } = useEat();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('전체');
  const [area, setArea] = useState<(typeof AREAS)[number]>('전체');
  const [sort, setSort] = useState<SortKey>('price');
  const [onlyFits, setOnlyFits] = useState(true);
  const [query, setQuery] = useState('');

  const q = query.trim();
  const base = PLACES.filter(
    (p) =>
      (cat === '전체' || p.cat === cat) &&
      (area === '전체' || p.area === area) &&
      (!q || p.name.includes(q) || p.menus.some((m) => m.name.includes(q))),
  );
  const inBudget = base.filter((p) => bestMenu(p, s.perMeal).fits);
  const list = (onlyFits ? inBudget : base).sort((a, b) =>
    sort === 'price' ? cheapestPrice(a) - cheapestPrice(b) || a.walk - b.walk : a.walk - b.walk || cheapestPrice(a) - cheapestPrice(b),
  );

  return (
    <Screen>
      <Title>예산 맞춤 맛집</Title>

      <View style={styles.loc}>
        <Ionicons name="location-outline" size={20} color={C.green} />
        <Text style={styles.locText}>인하대 주변 {PLACES.length}곳</Text>
        <Text style={styles.locLimit}>한 끼 {won(s.perMeal)}원 이하</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="식당이나 메뉴 검색 (예: 국밥, 라멘)"
          placeholderTextColor={C.muted}
          accessibilityLabel="식당이나 메뉴 검색"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="검색어 지우기" hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {CATEGORIES.map((k) => (
          <Chip key={k} label={k} on={k === cat} onPress={() => setCat(k)} />
        ))}
      </View>
      <View style={styles.chips}>
        {AREAS.map((k) => (
          <Chip key={k} label={k === '전체' ? '모든 위치' : k} on={k === area} onPress={() => setArea(k)} small />
        ))}
      </View>

      <View style={ui.row}>
        <Pressable
          onPress={() => setOnlyFits(!onlyFits)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: onlyFits }}
          hitSlop={8}
          style={styles.check}>
          <Ionicons name={onlyFits ? 'checkbox' : 'square-outline'} size={20} color={onlyFits ? C.green : C.muted} />
          <Sub>
            예산 안만 ({inBudget.length}/{base.length})
          </Sub>
        </Pressable>
        <Pressable
          onPress={() => setSort(sort === 'price' ? 'walk' : 'price')}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.check}>
          <Ionicons name="swap-vertical" size={16} color={C.ink} />
          <Text style={styles.sortText}>{sort === 'price' ? '가격 낮은 순' : '가까운 순'}</Text>
        </Pressable>
      </View>

      <Sub>식당을 누르면 메뉴가 펼쳐져요. 먹은 메뉴의 "먹기"를 누르면 예산에서 빠집니다.</Sub>

      <View style={{ gap: 10 }}>
        {list.length ? (
          list.map((p) => <PlaceItem key={p.id} place={p} perMeal={s.perMeal} onPick={(m) => pick(p, m)} />)
        ) : (
          <Text style={styles.empty}>
            {onlyFits ? '조건에 맞으면서 예산 안인 곳이 없어요.\n"예산 안만" 체크를 풀어 보세요.' : '조건에 맞는 곳이 없어요.'}
          </Text>
        )}
      </View>

      <PrimaryButton label="예산 안에서 자동 선택" icon="dice-outline" color={C.green} onPress={() => pickRandom(base)} />
      <Sub style={{ textAlign: 'center' }}>가격 정보: {DATA_SOURCE} · 실제 가격은 다를 수 있어요</Sub>
    </Screen>
  );
}

function Chip({ label, on, onPress, small }: { label: string; on: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, small && styles.chipSmall, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loc: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.ink },
  locLimit: { fontSize: 13, fontWeight: '700', color: C.green },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, height: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  chipSmall: { height: 32, paddingHorizontal: 12 },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '500', color: C.ink },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  sortText: { fontSize: 13, fontWeight: '500', color: C.ink },
  empty: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 24, lineHeight: 21 },
});
