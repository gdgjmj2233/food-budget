'use client';

import React, { useState } from 'react';
import { IoCheckmarkCircle, IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import {
  INQUIRY_KINDS,
  MAX_BODY,
  MAX_CONTACT,
  MIN_BODY,
  sendInquiry,
  type InquiryKind,
  type InquiryResult,
} from '@/lib/inquiry';
import styles from './inquiry-dialog.module.css';
import ui from './ui.module.css';

const PROBLEM: Record<string, string> = {
  failed: '문의를 보내지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요',
  unavailable: '지금은 문의를 받을 수 없어요',
  invalid: `내용을 ${MIN_BODY}글자 이상 적어 주세요`,
};

const limitedMessage = (waitSec = 0) =>
  waitSec > 120 ? '오늘은 문의를 너무 많이 보냈어요. 내일 다시 보내 주세요' : `방금 보냈어요. ${waitSec}초 뒤에 다시 보낼 수 있어요`;

/** 이용자가 우리에게 문의를 보내는 창. 보낸 글은 우리 스프레드시트에 한 줄씩 쌓인다 */
export function InquiryDialog({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<InquiryKind>(INQUIRY_KINDS[0]);
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [sent, setSent] = useState(false);

  const canSend = !busy && body.trim().length >= MIN_BODY;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setProblem('');
    const result: InquiryResult = await sendInquiry({ kind, body, contact, website });
    setBusy(false);
    if (result.ok) setSent(true);
    else setProblem(result.reason === 'limited' ? limitedMessage(result.waitSec) : PROBLEM[result.reason]);
  };

  return (
    <Modal onClose={onClose}>
      {sent ? (
        <div className={styles.body}>
          <div className={styles.done}>
            <IoCheckmarkCircle size={44} color="var(--primary)" aria-hidden />
            <h2 className={styles.title}>문의를 보냈어요</h2>
            <p className={styles.sub}>
              소중한 의견 고마워요. 확인하고 앱을 고치는 데 쓸게요.
              {contact.trim() && ' 적어 주신 연락처로 답장이 갈 수도 있어요.'}
            </p>
          </div>
          <button type="button" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} onClick={onClose}>
            닫기
          </button>
        </div>
      ) : (
        <form className={styles.body} onSubmit={submit}>
          <div className={styles.head}>
            <div>
              <h2 className={styles.title}>문의하기</h2>
              <p className={styles.sub}>불편한 점이나 바라는 점을 알려 주세요</p>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
              <IoClose size={22} aria-hidden />
            </button>
          </div>

          <div className={styles.field}>
            <span className={styles.label} id="inquiry-kind">
              종류
            </span>
            <div className={styles.chips} role="radiogroup" aria-labelledby="inquiry-kind">
              {INQUIRY_KINDS.map((k) => (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={k === kind}
                  className={`${styles.chip} ${k === kind ? styles.chipOn : ''}`}
                  onClick={() => setKind(k)}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              내용 <span className={styles.required}>(필수)</span>
            </span>
            <textarea
              className={styles.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="예: 학식 메뉴가 어제 걸로 나와요 / 식당 가격이 달라요"
              maxLength={MAX_BODY}
              rows={5}
            />
            <span className={styles.count}>
              {body.length} / {MAX_BODY}
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>연락처 (답장이 필요할 때만)</span>
            <input
              className={styles.input}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="이메일 또는 카카오톡 아이디"
              maxLength={MAX_CONTACT}
              autoComplete="off"
            />
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
            보내는 내용: 종류, 내용, 연락처(적은 경우), 지금 보던 화면과 기기 종류. 비밀번호나 주민등록번호 같은 개인정보는 적지 마세요.
          </p>

          {problem && (
            <p className={styles.error} role="alert">
              {problem}
            </p>
          )}

          <button type="submit" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} disabled={!canSend}>
            {busy ? '보내는 중…' : '보내기'}
          </button>
        </form>
      )}
    </Modal>
  );
}
