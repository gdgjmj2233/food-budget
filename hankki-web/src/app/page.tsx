'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { IoChevronDown, IoChevronForward, IoSearch, IoWalletOutline, IoReceiptOutline, IoClose, IoArrowForward, IoRestaurantOutline, IoPlaySkipForwardOutline } from 'react-icons/io5';
import { BudgetTools } from '@/components/budget-tools';
import { QuickMeals } from '@/components/quick-meals';
import { BudgetDetail } from '@/components/budget-detail';
import { MealDialog } from '@/components/meal-dialog';
import { ProfileDialog } from '@/components/profile-dialog';
import { PlaceItem } from '@/components/place-item';
import { RecentMeals } from '@/components/recent-meals';
import { WeekChart } from '@/components/week-chart';
import { useToast } from '@/components/toast';
import { CHARACTERS, characterOf } from '@/data/characters';
import { PLACES, bestMenu, mainMenuPrice, type Place } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import styles from './page.module.css';

const CATEGORIES = [
  { name: '한식', icon: '🍚', tone: '#f4f3ee' },
  { name: '돈까스·일식', icon: '🍣', tone: '#f4f3ee' },
  { name: '찌개·탕', icon: '🍲', tone: '#f4f3ee' },
  { name: '중식', icon: '🍜', tone: '#f4f3ee' },
  { name: '아시안', icon: '🍛', tone: '#f4f3ee' },
  { name: '양식', icon: '🍝', tone: '#f4f3ee' },
  { name: '분식', icon: '🍙', tone: '#f4f3ee' },
  { name: '7천원 이하', icon: '💸', tone: '#f4f3ee' },
  { name: '가까운 곳', icon: '👟', tone: '#f4f3ee' },
  { name: '자주 먹은', icon: '🥢', tone: '#f4f3ee' },
];
const DISH: Record<string, string> = { 한식: '🍲', 분식: '🍙', 중식: '🍜', 일식: '🍣', 양식: '🍝', 아시안: '🍛' };

export default function HomePage() {
  const { summary: s, settings, meals, removeMeal, record } = useBudget();
  const profile = useProfile();
  const { pick, eatCustom, skip } = useEat();
  const toast = useToast();
  const [eating, setEating] = useState(false);
  const [detail, setDetail] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [selected, setSelected] = useState<Place | null>(null);
  const [area, setArea] = useState('전체');
  const [managementOpen, setManagementOpen] = useState(false);
  const mascot = profile ? characterOf(profile.character) : CHARACTERS[0];
  const spentPct = settings.amount > 0 ? Math.min(100, Math.max(0, s.spent / settings.amount * 100)) : 0;
  const q = query.trim().toLowerCase();
  const filtered = PLACES.filter(p => {
    if (area !== '전체' && p.area !== area) return false;
    if (q && !`${p.name} ${p.menus.map(m => m.name).join(' ')}`.toLowerCase().includes(q)) return false;
    if (category === '돈까스·일식') return p.cat === '일식';
    if (category === '찌개·탕') return p.menus.some(m => /찌개|탕|국밥|순두부/.test(m.name));
    if (category === '7천원 이하') return mainMenuPrice(p) <= 7000;
    if (category === '가까운 곳') return p.walk <= 5;
    return category === '전체' || p.cat === category;
  }).sort((a, b) => Number(bestMenu(b, s.perMeal).fits) - Number(bestMenu(a, s.perMeal).fits) || mainMenuPrice(a) - mainMenuPrice(b) || a.walk - b.walk);
  const exploring = q.length > 0 || category !== '전체';
  const list = exploring ? filtered : filtered.slice(0, 8);
  const onRemove = (meal: Meal) => confirm('기록 지우기', `${meal.name} ${won(meal.price)}원 기록을 지울까요?`, () => {
    removeMeal(meal.id); toast(`${meal.name} 기록을 지웠어요`);
  });

  return <div className={styles.home}>
    <div className={styles.mint}>
      <header className={styles.top}>
        <label className={styles.location}>
          <span className={styles.srOnly}>식당 위치 선택</span>
          <select value={area} onChange={e => { setArea(e.target.value); setSelected(null); }}>
            <option value="전체">인하대 주변</option><option value="후문">인하대 후문</option><option value="정문·인하대역">정문 · 인하대역</option>
          </select><IoChevronDown size={15} aria-hidden />
        </label>
        <div className={styles.topActions}>
          <Link href="/budget" aria-label="예산 설정"><IoWalletOutline size={23} /></Link>
          <Link href="/history" aria-label="식사 기록"><IoReceiptOutline size={22} /></Link>
          <button type="button" className={styles.profile} onClick={() => setProfileOpen(true)} aria-label="내 프로필">
            <Image src={mascot.img} alt="" unoptimized width={32} height={32} />
          </button>
        </div>
      </header>
      <form className={styles.search} role="search" onSubmit={e => { e.preventDefault(); document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
        <input aria-label="식당 또는 메뉴 검색" placeholder="오늘 뭐 먹지? 식당이나 메뉴를 찾아보세요" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} />
        {query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}><IoClose size={19} /></button>}
        <button type="submit" aria-label="검색"><IoSearch size={25} /></button>
      </form>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>한끼예산 · 나의 식비 습관</span>
          <h1>잘 먹는 하루,<br /><span>가볍게 쓰는 식비.</span></h1>
          <p>지금 한 끼에 <strong>{won(s.perMeal)}원</strong> 쓸 수 있어요</p>
          <button type="button" className={styles.heroButton} onClick={() => setEating(true)}>오늘 메뉴 고르기 <IoChevronForward size={16} /></button>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><div className={styles.guideRing}><small>한 끼 가이드</small><strong>{won(s.perMeal)}<span>원</span></strong></div><span className={styles.guideCaption}>{s.mealsLeft}끼를 위한 나의 기준</span></div>
      </section>
    </div>

    <section className={styles.discovery}>
      <nav className={styles.services} aria-label="홈 바로가기">
        <a href="#restaurants" className={styles.serviceOn}>맛집 찾기</a><a href="#my-budget">내 식비</a><a href="#planning" onClick={() => setManagementOpen(true)}>소비 계획</a><Link href="/history">먹은 기록</Link>
      </nav>
      <div className={styles.categories}>
        {CATEGORIES.map(c => <button type="button" key={c.name} aria-pressed={category === c.name} className={`${styles.category} ${category === c.name ? styles.categoryOn : ''}`} onClick={() => {
          setSelected(null);
          if (c.name === '자주 먹은') { document.getElementById('frequent')?.scrollIntoView({ behavior: 'smooth' }); return; }
          setCategory(category === c.name ? '전체' : c.name);
          document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}><span className={styles.categoryIcon} style={{ background: c.tone }} aria-hidden="true">{c.icon}</span><span>{c.name}</span></button>)}
      </div>
      <Link href="/recommend" className={styles.allPlaces}>인하대 주변 맛집 전체보기 <IoChevronForward size={17} /></Link>
    </section>

    <section className={styles.budgetStrip} id="my-budget">
      <div><span className={styles.smallLabel}>이번 {settings.period === 'week' ? '주' : '달'} 남은 예산</span><strong className={s.remain < 0 ? styles.over : ''}>{won(s.remain)}<small>원</small></strong></div>
      <button type="button" onClick={() => setDetail(true)}>내 예산 보기 <IoChevronForward size={15} /></button>
      <div className={styles.progress}><span style={{ width: `${spentPct}%` }} /></div>
      <p>{won(s.spent)}원 사용 <span>{s.mealsLeft}끼 남았어요</span></p>
    </section>
    {s.ended && <Link href="/budget" className={styles.ended}>예산 기간이 끝났어요. 새 예산을 설정해 주세요 <IoArrowForward /></Link>}

    <section className={styles.restaurants} id="restaurants">
      <div className={styles.sectionHead}><div><span className={styles.kicker}>HANKKI TABLE</span><h2>{exploring ? `${category === '전체' ? '검색한' : category} 맛집` : '오늘, 이런 한 끼 어때요?'}</h2></div><Link href="/recommend" aria-label="맛집 전체 보기"><IoChevronForward size={22} /></Link></div>
      <p className={styles.sectionHint}>{exploring ? `${filtered.length}곳을 찾았어요` : '예산 안 대표 메뉴를 가격순으로 골랐어요'}</p>
      {exploring && <button type="button" className={styles.reset} onClick={() => { setCategory('전체'); setQuery(''); setSelected(null); }}>전체 보기 <IoClose size={13} /></button>}
      {list.length ? <div className={exploring ? styles.resultGrid : styles.carousel}>{list.map((p, index) => {
        const { menu, fits } = bestMenu(p, category === '7천원 이하' ? Math.min(7000, s.perMeal) : s.perMeal);
        return <button type="button" key={p.id} className={`${styles.place} ${selected?.id === p.id ? styles.placeSelected : ''}`} onClick={() => setSelected(selected?.id === p.id ? null : p)} aria-expanded={selected?.id === p.id}>
          <div className={`${styles.placeArt} ${styles[`art${index % 4}`]}`}><span className={styles.placeBadge}>{fits ? '예산 안 한 끼' : '메뉴 살펴보기'}</span><span aria-hidden="true">{DISH[p.cat]}</span><span className={styles.artCaption}>{p.cat} 한 그릇</span></div>
          <h3>{p.name}</h3><p className={styles.menuName}>대표 · {menu.name}</p><strong>{won(menu.price)}원</strong><p className={styles.placeMeta}>도보 {p.walk}분 <span>· {p.area}</span></p>
        </button>;
      })}</div> : <p className={styles.empty}>조건에 맞는 식당이 없어요. 다른 메뉴로 검색해 보세요.</p>}
      {selected && <div className={styles.selected}><div className={styles.sectionHead}><h3>메뉴와 나만의 메모</h3><button type="button" onClick={() => setSelected(null)} aria-label="식당 상세 닫기"><IoClose size={20} /></button></div><PlaceItem place={selected} perMeal={s.perMeal} onPick={m => pick(selected, m)} /><p className={styles.sectionHint}>식당을 펼쳐 메뉴와 가격을 확인하고 식사로 기록하세요.</p></div>}
      <p className={styles.source}>음식 그림은 카테고리 예시예요. 가격 비교는 앱에서 지정한 대표 메뉴 기준이며, 실제 매장 가격과 다를 수 있어요.</p>
    </section>

    <div className={styles.shortcuts}>
      <button type="button" onClick={() => setEating(true)}><span className={styles.shortcutIcon}><IoRestaurantOutline /></span><span><strong>맛있게 먹었나요?</strong><small>오늘의 한 끼 기록하기</small></span><IoChevronForward /></button>
      <button type="button" onClick={skip}><span className={styles.shortcutIcon}><IoPlaySkipForwardOutline /></span><span><strong>이번 끼니는 쉬어가기</strong><small>0원으로 스킵 기록</small></span><IoChevronForward /></button>
    </div>
    <section className={styles.personal} id="frequent"><QuickMeals meals={meals} perMeal={s.perMeal} onPick={f => {
      if (f.place && f.placeMenu) { pick(f.place, f.placeMenu); return; }
      const delta = record(f.name, f.menu, f.price); toast(delta ? `${f.name} ${won(f.price)}원 기록했어요` : '새 예산 기간을 시작하세요');
    }} /></section>
    <section className={styles.personal} id="planning"><details className={styles.management} open={managementOpen} onToggle={e => setManagementOpen(e.currentTarget.open)}><summary><span>📊 내 식비 관리와 소비 계획</span><IoChevronDown size={18} /></summary><div className={styles.managementBody}><BudgetTools /><WeekChart meals={meals} perDay={s.perDay} /></div></details></section>
    <div className={styles.personal}><RecentMeals meals={meals} onRemove={onRemove} /></div>
    <footer className={styles.footer}><strong>한끼예산</strong><p>맛있는 선택, 든든한 내일.</p></footer>

    {eating && <MealDialog perMeal={s.perMeal} onClose={() => setEating(false)} onPick={(p,m) => { pick(p,m); setEating(false); }} onSubmit={(m,price) => { eatCustom(m,price); setEating(false); }} />}
    {detail && <BudgetDetail onClose={() => setDetail(false)} />}
    {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
  </div>;
}
