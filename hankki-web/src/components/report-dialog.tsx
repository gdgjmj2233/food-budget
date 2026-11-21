'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { IoCheckmarkCircle, IoClose, IoFlagOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { CHARACTERS, characterOf } from '@/data/characters';
import { inquiryReady, sendInquiry, type InquiryResult, type ReportKind } from '@/lib/inquiry';
import { useProfile } from '@/store/profile-store';
import styles from './inquiry-dialog.module.css';
import buttonStyles from './report-dialog.module.css';
import ui from './ui.module.css';

/**
 * menu: 메뉴가 있는 식당 카드에서 여는 메뉴 정보 수정 제보
 * menuless: 메뉴 정보가 없는 주변 음식점 카드에서 여는 메뉴 정보 수정 제보 (아는 메뉴·가격을 받는다)
 * place: 주변 식당 화면에서 여는 식당 미등록 제보
 */
export type ReportMode = 'menu' | 'menuless' | 'place';

const COPY: Record<
  ReportMode,
  {
    kind: ReportKind;
    title: string;
    sub: string;
    topics: string[];
    /** 고르는 칸(topics)이 없을 때 머리말에 붙이는 말 */
    tag?: string;
    textLabel: string;
    placeholder: string;
  }
> = {
  menu: {
    kind: '메뉴 정보 수정',
    title: '메뉴 정보 수정 제보',
    sub: '메뉴나 가격이 실제와 다르면 알려 주세요. 확인하고 고칠게요!',
    topics: ['가격이 달라요', '없어진 메뉴', '새 메뉴', '기타'],
    textLabel: '내용',
    placeholder: '예) 김치찌개가 8,000원에서 9,000원으로 올랐어요',
  },
  // 메뉴 정보가 아직 없는 곳. 시트에서는 같은 "메뉴 정보 수정"으로 쌓이고 머리말의 "메뉴 없음"으로 구분한다
  menuless: {
    kind: '메뉴 정보 수정',
    title: '메뉴 정보 수정 제보',
    sub: '아직 메뉴 정보가 없는 곳이에요. 아는 메뉴와 가격을 알려 주세요!',
    topics: [],
    tag: '메뉴 없음',
    textLabel: '메뉴·가격',
    placeholder: '아는 메뉴만 적어도 괜찮아요.',
  },
  // 앱에 없는 식당을 알려 주는 제보. 식당 이름과 위치(대략이어도 됨)를 둘 다 받는다
  place: {
    kind: '식당 미등록 제보',
    title: '식당 미등록 제보',
    sub: '앱에 없는 식당을 알려 주세요. 확인하고 추가할게요!',
    topics: [],
    textLabel: '위치',
    placeholder: '대략적인 위치도 괜찮아요.',
  },
};

/** 제보 내용 칸 최대 글자 수. 앞에 붙는 [종류 · 주제 · 식당] 머리말까지 합쳐도 문의 최대 길이(500자)를 넘지 않게 */
const MAX_TEXT = 400;
const MAX_NAME = 40;

const PROBLEM: Record<string, string> = {
  failed: '제보를 보내지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요',
  unavailable: '지금은 제보를 받을 수 없어요',
  invalid: '내용을 적어 주세요',
};

const limitedMessage = (waitSec = 0) =>
  waitSec > 120 ? '오늘은 너무 많이 보냈어요. 내일 다시 보내 주세요' : `방금 보냈어요. ${waitSec}초 뒤에 다시 보낼 수 있어요`;

/**
 * 식당 정보를 우리에게 알려 주는 창. 문의와 같은 스프레드시트에 종류만 다르게 쌓인다.
 * placeName 을 주면(식당 카드에서 연 경우) 그 식당 이름이 함께 가고, 없으면 식당 이름을 직접 적는 칸이 나온다.
 * 메뉴 정보 수정은 내용이 필수, 식당 미등록 제보는 식당 이름과 위치가 둘 다 필수다.
 * 스프레드시트의 받는 코드가 아직 새 종류를 모르면 "기타"로 쌓이므로, 내용 맨 앞 [ ] 머리말에도 종류를 적어 둔다.
 */
export function ReportDialog({
  mode,
  placeName,
  placeAddress,
  onClose,
}: {
  mode: ReportMode;
  placeName?: string;
  /** 이름이 같은 지점이 많은 주변 음식점을 구분하려고 머리말에 함께 적는 주소 */
  placeAddress?: string;
  onClose: () => void;
}) {
  const copy = COPY[mode];
  const nameRequired = mode === 'place';
  const profile = useProfile();
  const mascot = profile ? characterOf(profile.character) : CHARACTERS[0];
  const [topic, setTopic] = useState(copy.topics[0] ?? copy.tag ?? '');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [sent, setSent] = useState(false);

  // 필수 칸은 한 글자 이상이면 된다 (보낼 때 앞에 [종류 · 식당] 머리말이 붙어서 문의 최소 길이도 늘 넘는다)
  const canSend = !busy && text.trim().length > 0 && (!nameRequired || name.trim().length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setProblem('');
    const place = (placeName ?? name).trim().slice(0, MAX_NAME);
    const address = placeAddress?.slice(0, 60);
    const written = text.trim().slice(0, MAX_TEXT);
    const head = [copy.kind, topic, place, address].filter(Boolean).join(' · ');
    const result: InquiryResult = await sendInquiry({
      kind: copy.kind,
      body: `[${head}] ${written}`.trim(),
      contact: '',
      website,
      // 스프레드시트의 "메뉴 정보 수정"·"식당 미등록 제보" 시트에 칸별로 쌓이는 값
      fields: { topic, place, address, text: written },
    });
    setBusy(false);
    if (result.ok) setSent(true);
    else setProblem(result.reason === 'limited' ? limitedMessage(result.waitSec) : PROBLEM[result.reason]);
  };

  return (
    <Modal onClose={onClose}>
      {sent ? (
        <div className={styles.body}>
          <div className={styles.done}>
            <Image src={mascot.img} alt="" unoptimized className={styles.mascotBig} />
            <h2 className={styles.title}>
              <IoCheckmarkCircle size={20} color="var(--primary)" aria-hidden className={styles.check} /> 제보 고마워요!
            </h2>
            <p className={styles.sub}>확인한 뒤 앱에 반영할게요.</p>
          </div>
          <button type="button" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} onClick={onClose}>
            닫기
          </button>
        </div>
      ) : (
        <form className={styles.body} onSubmit={submit}>
          <div className={styles.head}>
            <div className={styles.hello}>
              <Image src={mascot.img} alt="" unoptimized className={styles.mascot} />
              <div className={styles.bubble}>
                <h2 className={styles.title}>{copy.title}</h2>
                {placeName && <p className={styles.place}>{placeName}</p>}
                <p className={styles.sub}>{copy.sub}</p>
              </div>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
              <IoClose size={22} aria-hidden />
            </button>
          </div>

          {copy.topics.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label} id={`report-topic-${mode}`}>
                어떤 내용인가요?
              </span>
              <div className={styles.chips} role="radiogroup" aria-labelledby={`report-topic-${mode}`}>
                {copy.topics.map((t) => (
                  <button
                    type="button"
                    key={t}
                    role="radio"
                    aria-checked={t === topic}
                    className={`${styles.chip} ${t === topic ? styles.chipOn : ''}`}
                    onClick={() => setTopic(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!placeName && (
            <label className={styles.field}>
              <span className={styles.label}>
                식당 이름 {nameRequired && <span className={styles.required}>(필수)</span>}
              </span>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME}
                autoComplete="off"
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>
              {copy.textLabel} <span className={styles.required}>(필수)</span>
            </span>
            {nameRequired ? (
              // 미등록 제보의 위치는 짧아서 한 줄 칸으로 받는다
              <input
                className={styles.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                maxLength={MAX_TEXT}
                autoComplete="off"
              />
            ) : (
              <>
                <textarea
                  className={styles.textarea}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={copy.placeholder}
                  maxLength={MAX_TEXT}
                  rows={4}
                />
                <span className={styles.count}>
                  {text.length} / {MAX_TEXT}
                </span>
              </>
            )}
          </label>

          {/* 사람은 못 보는 칸. 자동 프로그램이 채우면 보내지 않는다 */}
          <input
            className={styles.trap}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          <p className={styles.note}>
            보내는 내용: 제보 종류, 식당 이름, {copy.textLabel}, 지금 보던 화면과 기기 종류. 개인정보는 적지 마세요.
          </p>

          {problem && (
            <p className={styles.error} role="alert">
              {problem}
            </p>
          )}

          <button type="submit" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} disabled={!canSend}>
            {busy ? '보내는 중…' : '제보 보내기'}
          </button>
        </form>
      )}
    </Modal>
  );
}

/**
 * 식당 카드 오른쪽 위에 붙는 작은 "메뉴 정보 수정 제보" 버튼. 누르면 제보 창이 열린다.
 * noMenu 를 주면 메뉴 정보가 없는 곳용 창(아는 메뉴·가격 받기)이 열린다. className 으로 카드 안 자리를 잡는다
 */
export function MenuReportButton({
  placeName,
  placeAddress,
  noMenu = false,
  className = '',
}: {
  placeName: string;
  placeAddress?: string;
  noMenu?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!inquiryReady()) return null;
  return (
    <>
      <button type="button" className={`${buttonStyles.button} ${className}`} onClick={() => setOpen(true)}>
        <IoFlagOutline size={12} aria-hidden />
        메뉴 정보 수정 제보
      </button>
      {open && (
        <ReportDialog
          mode={noMenu ? 'menuless' : 'menu'}
          placeName={placeName}
          placeAddress={placeAddress}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
