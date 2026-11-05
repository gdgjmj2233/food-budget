'use client';

import React, { useState } from 'react';
import { IoOpenOutline } from 'react-icons/io5';
import { LuSoup } from 'react-icons/lu';

import { MealInput } from '@/components/meal-dialog';
import { Modal } from '@/components/modal';
import { AccentButton, Screen, Sub, Title } from '@/components/ui';
import { CAFETERIA_SOURCE, CAFETERIAS, type CafeteriaItem } from '@/data/cafeteria';
import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const priceText = ({ price, maxPrice }: CafeteriaItem) => (maxPrice ? `${won(price)}~${won(maxPrice)}원` : `${won(price)}원`);

/** 교내 식당의 코너별 가격과 운영 시간. 오늘 메뉴는 학교 홈페이지에서 보고, 먹은 건 직접 입력한다. */
export default function CafeteriaPage() {
  const { summary: s } = useBudget();
  const { eatCustom } = useEat();
  const [eating, setEating] = useState(false);

  return (
    <Screen>
      <Title>인하대 학식</Title>

      <div className={styles.today}>
        <span className={styles.todayLabel}>오늘 남은 금액</span>
        <span className={styles.todayVal}>{won(s.todayLeft)}원</span>
      </div>

      {CAFETERIAS.map((c) => (
        <section key={c.id} className={styles.card} aria-labelledby={`cafeteria-${c.id}`}>
          <div className={styles.head}>
            <h2 id={`cafeteria-${c.id}`} className={styles.name}>
              {c.name}
            </h2>
            <a href={c.menuUrl} target="_blank" rel="noreferrer" className={styles.link}>
              오늘 메뉴
              <IoOpenOutline size={14} aria-hidden />
            </a>
          </div>

          {c.meals.map((meal) => (
            <div key={meal.title} className={styles.meal}>
              <div className={styles.mealHead}>
                <h3 className={styles.mealTitle}>{meal.title}</h3>
                <span className={styles.hours}>{meal.hours}</span>
              </div>
              <ul className={styles.items}>
                {meal.items.map((item) => {
                  const over = item.price - s.todayLeft;
                  return (
                    <li key={item.name} className={styles.item}>
                      <span>
                        {item.name}
                        {over > 0 && <b className={styles.tag}> +{won(over)}원 초과</b>}
                      </span>
                      <span className={`${styles.price} ${over > 0 ? styles.priceOver : ''}`}>{priceText(item)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <AccentButton label="먹은 것 기록하기" icon={LuSoup} onPress={() => setEating(true)} />
      <Sub style={{ textAlign: 'center' }}>가격 정보: {CAFETERIA_SOURCE} · 실제 가격은 메뉴에 따라 달라요</Sub>

      {eating && (
        <Modal onClose={() => setEating(false)}>
          <MealInput
            title="학식 직접 입력"
            limit={s.todayLeft}
            onBack={() => setEating(false)}
            onSubmit={(menu, price) => {
              eatCustom(menu, price);
              setEating(false);
            }}
          />
        </Modal>
      )}
    </Screen>
  );
}
