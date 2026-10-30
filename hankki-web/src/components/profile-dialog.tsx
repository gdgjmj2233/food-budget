'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';
import { CHARACTERS } from '@/data/characters';
import { confirm } from '@/lib/confirm';
import { saveProfile, useProfile, type Profile } from '@/store/profile-store';
import styles from './profile-dialog.module.css';
import ui from './ui.module.css';

const EMPTY: Profile = { nickname: '', major: '', studentId: '', email: '', character: CHARACTERS[0].id };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 로그인 전에는 "로그인", 로그인 후에는 "내 정보" 창. 개인정보 입력과 캐릭터 선택, 로그아웃. */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const toast = useToast();
  const [form, setForm] = useState<Profile>(profile ?? EMPTY);
  const set = (patch: Partial<Profile>) => setForm({ ...form, ...patch });

  const nickname = form.nickname.trim();
  const email = form.email.trim();
  const emailBad = email !== '' && !EMAIL.test(email);
  const canSave = nickname !== '' && !emailBad;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    saveProfile({ ...form, nickname, major: form.major.trim(), email });
    toast(profile ? '내 정보를 저장했어요' : `${nickname}님, 반가워요!`);
    onClose();
  };

  const logout = () => {
    confirm('로그아웃', '이 기기에 저장된 내 정보를 지울까요?\n먹은 기록과 예산은 그대로 남아요.', () => {
      saveProfile(null);
      toast('로그아웃했어요');
      onClose();
    });
  };

  return (
    <Modal onClose={onClose}>
      <form className={styles.body} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>{profile ? '내 정보' : '로그인'}</h2>
            <p className={styles.sub}>이 기기에만 저장되고 어디에도 보내지 않아요</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <IoClose size={22} aria-hidden />
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.label} id="character-label">
            캐릭터
          </span>
          <div className={styles.characters} role="radiogroup" aria-labelledby="character-label">
            {CHARACTERS.map((c) => {
              const on = form.character === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.name}
                  onClick={() => set({ character: c.id })}
                  className={`${styles.character} ${on ? styles.characterOn : ''}`}>
                  <Image src={c.img} alt="" unoptimized className={styles.characterImg} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>
            닉네임 <span className={styles.required}>(필수)</span>
          </span>
          <input
            className={styles.input}
            value={form.nickname}
            onChange={(e) => set({ nickname: e.target.value })}
            placeholder="예: 한끼"
            maxLength={12}
            autoComplete="nickname"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>학과</span>
          <input
            className={styles.input}
            value={form.major}
            onChange={(e) => set({ major: e.target.value })}
            placeholder="예: 컴퓨터공학과"
            maxLength={30}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>학번</span>
          <input
            className={styles.input}
            value={form.studentId}
            onChange={(e) => set({ studentId: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="예: 12241234"
            inputMode="numeric"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>이메일</span>
          <input
            className={styles.input}
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="예: hankki@inha.edu"
            type="email"
            autoComplete="email"
            maxLength={60}
            aria-invalid={emailBad}
          />
          {emailBad && <span className={styles.error}>이메일 형식을 확인해 주세요</span>}
        </label>

        <button type="submit" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} disabled={!canSave}>
          {profile ? '저장' : '시작하기'}
        </button>
        {profile && (
          <button type="button" className={styles.logout} onClick={logout}>
            로그아웃
          </button>
        )}
      </form>
    </Modal>
  );
}
