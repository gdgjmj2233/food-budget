'use client';

import { useState } from 'react';
import { PLACES } from '@/data/places';
import { addDays, calcBudget, formatDate, fromDateKey, toDateKey, won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { useToast } from './toast';
import ui from './ui.module.css';
import styles from './budget-tools.module.css';

export function BudgetPreview({ price }: { price: number }) {
  const { settings, meals, summary } = useBudget();
  if (summary.ended || !Number.isSafeInteger(price) || price <= 0) return null;
  const now = new Date();
  const after = calcBudget(settings, [...meals, { id: 'preview', name: '', menu: '', price, date: toDateKey(now), at: now.getTime() }], now);
  return <span className={styles.preview}>먹으면 잔액 {won(after.remain)}원 · 다음 끼니 {won(after.perMeal)}원</span>;
}

export function PlaceNote({ id, name }: { id: string; name: string }) {
  const { notes, saveNote } = useBudget();
  return <label className={styles.field}>나만의 식당 메모
    <textarea aria-label={`${name} 메모`} maxLength={500} rows={2} placeholder="혼밥하기 편해요, 점심에는 줄이 길어요…" value={notes[id] ?? ''} onChange={e => saveNote(id, e.target.value)} />
    <small>자동 저장 · {(notes[id] ?? '').length}/500</small>
  </label>;
}

export function BudgetTools() {
  return <div className={styles.stack}><DirectRecord /><SpendingPatterns /><WeeklyPlan /></div>;
}

function DirectRecord() {
  const { record, summary } = useBudget();
  const toast = useToast();
  const [name, setName] = useState('');
  const [menu, setMenu] = useState('');
  const [amount, setAmount] = useState('');
  const price = Number(amount);
  return <section className={ui.card}>
    <h2 className={ui.sec}>식비 직접 기록</h2>
    <p className={styles.hint}>편의점·배달·학식도 기록하고, 결제 전 남은 예산을 확인하세요.</p>
    <form className={styles.stack} onSubmit={e => {
      e.preventDefault();
      if (!name.trim() || !Number.isSafeInteger(price) || price <= 0) return;
      const delta = record(name.trim(), menu.trim() || '직접 입력', price);
      if (!delta) { toast('예산 기간이 끝났어요. 새 기간을 시작하세요.'); return; }
      toast(`${name.trim()} ${won(price)}원 기록했어요`);
      setName(''); setMenu(''); setAmount('');
    }}>
      <label className={styles.field}>식당 또는 구입처<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="예: 학교 앞 편의점" /></label>
      <label className={styles.field}>메뉴<input maxLength={60} value={menu} onChange={e => setMenu(e.target.value)} placeholder="예: 도시락" /></label>
      <label className={styles.field}>금액 (원)<input required type="number" min="1" max="9999999" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <BudgetPreview price={price} />
      <button className={ui.primary} disabled={summary.ended || !name.trim() || !Number.isSafeInteger(price) || price <= 0}>기록하기</button>
    </form>
  </section>;
}

function SpendingPatterns() {
  const { summary } = useBudget();
  const paid = summary.periodMeals.filter(m => m.price > 0);
  const groups = new Map<string, number>();
  for (const meal of paid) {
    const category = PLACES.find(p => p.id === meal.placeId)?.cat ?? '직접 기록';
    groups.set(category, (groups.get(category) ?? 0) + meal.price);
  }
  const days = new Set(paid.map(m => m.date)).size;
  return <section className={ui.card}>
    <h2 className={ui.sec}>이번 기간 소비 패턴</h2>
    {!paid.length ? <p className={styles.hint}>식비를 기록하면 평균 지출과 음식 종류별 비중을 보여드려요.</p> : <>
      <p className={styles.hint}>{paid.length}끼 · 한 끼 평균 {won(summary.spent / paid.length)}원 · 기록한 날 하루 평균 {won(summary.spent / days)}원</p>
      {[...groups].sort((a,b) => b[1]-a[1]).map(([name, total]) => <div key={name} className={styles.category}>
        <div className={styles.row}><span>{name}</span><span>{won(total)}원 · {Math.round(total / summary.spent * 100)}%</span></div>
        <div className={styles.track}><div style={{ width: `${total / summary.spent * 100}%` }} /></div>
      </div>)}
      <small>0원 스킵은 평균과 비중에서 제외해요. 직접 입력은 별도로 집계해요.</small>
    </>}
  </section>;
}

function WeeklyPlan() {
  const { plans, addPlan, removePlan, record, summary, settings, meals } = useBudget();
  const toast = useToast();
  const today = toDateKey(new Date());
  const [weekStart, setWeekStart] = useState(today);
  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const dates = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(fromDateKey(weekStart), i)));
  const visible = plans.filter(p => dates.includes(p.date));
  const total = visible.reduce((n,p) => n+p.price, 0);
  const actual = meals.filter(m => dates.includes(m.date)).reduce((n,m) => n+m.price, 0);
  const reserved = plans.filter(p => p.date >= today && p.date >= settings.startDate && p.date < toDateKey(summary.end)).reduce((n,p) => n+p.price, 0);
  const available = summary.remain-reserved;
  return <section className={ui.card}>
    <h2 className={ui.sec}>일주일 소비 계획</h2>
    <p className={styles.hint}>날짜별로 먹을 메뉴와 금액을 정해요. 계획은 실제 지출에 포함되지 않아요.</p>
    <label className={styles.field}>7일 계획 시작일<input type="date" required value={weekStart} onChange={e => { if (e.target.value) { setWeekStart(e.target.value); setDate(e.target.value); } }} /></label>
    <p className={styles.summary}>이 7일의 예정 {won(total)}원 · 실제 {won(actual)}원<br />현재 예산 기간의 남은 계획 {won(reserved)}원<br /><strong>계획 금액을 남겨두면 {won(available)}원 여유</strong></p>
    {available < 0 && <p role="status" className={styles.warning}>남은 예산보다 계획이 {won(-available)}원 많아요.</p>}
    <form className={styles.stack} onSubmit={e => {
      e.preventDefault();
      if (!dates.includes(date) || !name.trim() || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) return;
      addPlan({ date, name: name.trim(), price: Number(amount) }); setName(''); setAmount(''); toast('소비 계획을 저장했어요');
    }}>
      <label className={styles.field}>계획 날짜<select value={date} onChange={e => setDate(e.target.value)}>{dates.map(d => <option key={d} value={d}>{formatDate(fromDateKey(d))}</option>)}</select></label>
      <label className={styles.field}>먹을 메뉴 또는 약속<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="금요일 친구와 치킨" /></label>
      <label className={styles.field}>예상 금액 (원)<input required type="number" min="1" max="9999999" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <button className={ui.primary}>계획 추가</button>
    </form>
    <div className={styles.stack}>{dates.map(d => <div className={styles.day} key={d}>
      <h3>{formatDate(fromDateKey(d))}</h3>
      {!visible.some(p => p.date === d) && <p className={styles.hint}>등록한 계획이 없어요</p>}
      {visible.filter(p => p.date === d).map(p => <div key={p.id} className={styles.plan}>
        <span>{p.name} · {won(p.price)}원</span>
        <div className={styles.row}>
          <button type="button" className={styles.textButton} disabled={p.date !== today || summary.ended} onClick={() => {
            const delta = record(p.name, '소비 계획에서 기록', p.price);
            if (delta) { removePlan(p.id); toast('실제 지출로 기록하고 계획에서 옮겼어요'); }
          }}>오늘 먹음</button>
          <button type="button" className={styles.textButton} aria-label={`${p.name} 계획 삭제`} onClick={() => removePlan(p.id)}>삭제</button>
        </div>
      </div>)}
    </div>)}</div>
    <small>‘오늘 먹음’은 오늘 계획만 실제 지출로 옮겨요. 실제 금액이 다르면 계획을 삭제하고 직접 기록하세요. 주말 제외 설정과 관계없이 약속을 계획할 수 있어요.</small>
  </section>;
}
