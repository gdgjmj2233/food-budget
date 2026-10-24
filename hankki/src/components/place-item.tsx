import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bestMenu, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { C, CAT_COLORS } from '@/theme';

/**
 * 식당 카드. 예산 안에서 고를 수 있는 대표 메뉴를 보여주고,
 * 누르면 메뉴 전체가 펼쳐져서 먹은 메뉴를 골라 기록할 수 있다.
 */
export function PlaceItem({
  place,
  perMeal,
  onPick,
}: {
  place: Place;
  perMeal: number;
  onPick: (menu: Menu) => void;
}) {
  const [open, setOpen] = useState(false);
  const { menu, fits } = bestMenu(place, perMeal);
  const cat = CAT_COLORS[place.cat];
  const menus = [...place.menus].sort((a, b) => a.price - b.price);

  return (
    <View style={[styles.card, { borderColor: fits ? '#CFE0D4' : '#EBCFCB' }]}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${place.name}, ${menu.name} ${won(menu.price)}원, ${fits ? '예산 안' : '예산 초과'}. 눌러서 메뉴 보기`}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.85 }]}>
        <View style={[styles.icon, { backgroundColor: cat.bg }]}>
          <Text style={[styles.iconText, { color: cat.fg }]}>{place.cat}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {place.area} · 도보 약 {place.walk}분 · 메뉴 {place.menus.length}개
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.menuName} numberOfLines={1}>
            {menu.name}
          </Text>
          <Text style={styles.price}>{won(menu.price)}원</Text>
          <Text style={[styles.tag, { color: fits ? C.green : C.over }]}>
            {fits ? '예산 안' : `+${won(menu.price - perMeal)}원 초과`}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>

      {open && (
        <View style={styles.menus}>
          <Text style={styles.address}>{place.address}</Text>
          {menus.map((m) => {
            const ok = m.price <= perMeal;
            return (
              <Pressable
                key={m.name}
                onPress={() => onPick(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m.name} ${won(m.price)}원 먹은 걸로 기록`}
                style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: C.divider }]}>
                <Text style={styles.menuRowName} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={[styles.menuRowPrice, { color: ok ? C.ink : C.over }]}>{won(m.price)}원</Text>
                <View style={[styles.eatBtn, { backgroundColor: ok ? C.green : C.muted }]}>
                  <Text style={styles.eatText}>먹기</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, backgroundColor: C.card, overflow: 'hidden' },
  head: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 12, fontWeight: '700' },
  body: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.muted },
  right: { alignItems: 'flex-end', gap: 1, maxWidth: 130 },
  menuName: { fontSize: 11, color: C.muted },
  price: { fontSize: 15, fontWeight: '700', color: C.ink },
  tag: { fontSize: 11, fontWeight: '700' },
  menus: { borderTopWidth: 1, borderTopColor: C.divider, paddingHorizontal: 14, paddingVertical: 6 },
  address: { fontSize: 12, color: C.muted, paddingVertical: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: 10, paddingHorizontal: 4 },
  menuRowName: { flex: 1, fontSize: 14, color: C.ink },
  menuRowPrice: { fontSize: 14, fontWeight: '700' },
  eatBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  eatText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
