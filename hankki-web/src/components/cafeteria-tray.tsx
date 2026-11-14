'use client';

import React from 'react';

import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { C } from '@/theme';
import { menuText, TrayList, type Tray } from './eat-here';
import trayStyles from './eat-here.module.css';
import styles from './cafeteria-tray.module.css';
import ui from './ui.module.css';

/**
 * 학식 탭의 "추가한 메뉴" 칸. 메뉴를 눌러 담으면 화면 아래에 붙어서 나타나고, 한 번에 (오늘 날짜로) 기록한다.
 * 식당 카드의 "여기서 밥먹기"와 같은 모양이고, 학식은 메뉴·가격이 정해져 있어서 직접 입력은 없다.
 */
export function CafeteriaTray({ name, tray, limit }: { name: string; tray: Tray; limit: number }) {
  const { eatAt } = useEat();
  if (!tray.items.length) return null;

  const over = tray.total - limit;
  const submit = () => {
    if (eatAt(name, menuText(tray.items), tray.total)) tray.clear();
  };

  return (
    <section className={styles.bar} aria-label="추가한 학식 메뉴">
      <p className={trayStyles.label}>추가한 메뉴</p>
      <div className={styles.list}>
        <TrayList items={tray.items} onChange={tray.change} />
      </div>
      <div className={trayStyles.total}>
        <span>합계</span>
        <b>{won(tray.total)}원</b>
      </div>
      {over > 0 && (
        <p className={trayStyles.hint} style={{ color: C.warn }}>
          오늘 남은 금액보다 {won(over)}원 많아요
        </p>
      )}
      <div className={trayStyles.actions}>
        <button type="button" className={`${ui.primary} ${ui.secondary} ${trayStyles.actionBtn}`} onClick={tray.clear}>
          취소
        </button>
        <button type="button" className={`${ui.primary} ${trayStyles.actionBtn}`} style={{ backgroundColor: C.primary }} onClick={submit}>
          {won(tray.total)}원 기록하기
        </button>
      </div>
    </section>
  );
}
