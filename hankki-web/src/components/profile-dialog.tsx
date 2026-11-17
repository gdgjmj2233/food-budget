'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { useCloudData } from '@/components/cloud-sync';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';
import { CHARACTERS } from '@/data/characters';
import { readMark, saveCloud, writeMark } from '@/lib/cloud';
import { confirm } from '@/lib/confirm';
import { supabaseReady } from '@/lib/supabase';
import { accountError, logInWithGoogle, logOut, useAccount } from '@/store/account-store';
import { useBudget } from '@/store/budget-store';
import { saveProfile, useProfile, type Profile } from '@/store/profile-store';
import { replaceRatings } from '@/store/rating-store';
import styles from './profile-dialog.module.css';
import ui from './ui.module.css';

const EMPTY: Profile = { nickname: '', major: '', studentId: '', email: '', character: CHARACTERS[0].id };

/** Google 로고(네 가지 색 G) */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * 로그인 전에는 "Google로 로그인", 로그인 후에는 "내 정보" 창. 로그인은 Google 계정으로만 한다.
 * 로그인하지 않고 이 기기에만 내 정보를 저장할 수도 있다("local").
 */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const account = useAccount();
  const { resetData } = useBudget();
  const cloudData = useCloudData();
  const toast = useToast();
  const [form, setForm] = useState<Profile>({ ...(profile ?? EMPTY), email: account?.email ?? profile?.email ?? '' });
  // 이 기기에만 저장해 둔 내 정보가 있거나 로그인을 쓸 수 없으면 바로 내 정보 입력 화면을 보여 준다
  const [mode, setMode] = useState<'login' | 'local'>(profile || !supabaseReady ? 'local' : 'login');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const view = account ? 'info' : mode;
  const set = (patch: Partial<Profile>) => setForm({ ...form, ...patch });

  const nickname = form.nickname.trim();
  const canSave = !busy && nickname !== '';
  const cleaned = { ...form, nickname, major: form.major.trim() };

  /** 계정 요청을 보내고, 실패하면 이유를 창에 보여 준다 */
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setProblem('');
    try {
      await work();
    } catch (e) {
      setProblem(accountError(e));
    }
    setBusy(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || view === 'login') return;
    saveProfile(cleaned);
    toast(view === 'info' ? '내 정보를 저장했어요' : `${nickname}님, 반가워요!`);
    onClose();
  };

  const logout = () => {
    if (!account) {
      confirm('로그아웃', '이 기기에 저장된 내 정보를 지울까요?\n먹은 기록과 예산은 그대로 남아요.', () => {
        saveProfile(null);
        toast('로그아웃했어요');
        onClose();
      });
      return;
    }
    // 기기를 같이 쓰는 사람에게 기록이 보이지 않게, 계정에 저장한 뒤 이 브라우저에서는 지운다
    confirm('로그아웃', '계정에 저장하고 이 기기의 기록을 지울까요?\n다시 로그인하면 그대로 불러와요.', () => {
      run(async () => {
        // 계정을 아직 못 불러왔으면 빈 기록으로 덮어쓰지 않게 저장하지 않는다
        if (readMark()?.uid === account.uid) await saveCloud(account.uid, JSON.stringify(cloudData));
        await logOut();
        writeMark(null);
        resetData();
        saveProfile(null);
        replaceRatings({});
        toast('로그아웃했어요');
        onClose();
      });
    });
  };

  const googleButton = supabaseReady && (
    <button type="button" className={styles.google} onClick={() => run(logInWithGoogle)} disabled={busy}>
      <GoogleMark />
      Google로 계속하기
    </button>
  );

  return (
    <Modal onClose={onClose}>
      <form className={styles.body} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>{view === 'info' ? '내 정보' : view === 'local' ? '내 정보 (이 기기에만)' : '로그인'}</h2>
            <p className={styles.sub}>
              {view === 'info'
                ? '기록과 내 정보가 이 계정에 자동으로 저장돼요'
                : view === 'local'
                  ? '로그인하지 않으면 기록이 이 기기에만 남고, 다른 기기에서는 볼 수 없어요'
                  : 'Google 계정으로 로그인하면 다른 기기에서도 기록을 이어서 볼 수 있어요'}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <IoClose size={22} aria-hidden />
          </button>
        </div>

        {view === 'login' && (
          <>
            {googleButton}
            {problem && <p className={styles.error}>{problem}</p>}
            <button type="button" className={styles.link} onClick={() => setMode('local')}>
              로그인 없이 이 기기에만 저장
            </button>
          </>
        )}

        {view !== 'login' && (
          <>
            {view === 'local' && googleButton}

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

            {view === 'info' && (
              <label className={styles.field}>
                <span className={styles.label}>로그인한 Google 계정</span>
                <input className={styles.input} value={form.email} disabled readOnly />
              </label>
            )}

            {problem && <p className={styles.error}>{problem}</p>}

            <button type="submit" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} disabled={!canSave}>
              {view === 'info' ? '저장' : '이 기기에 저장'}
            </button>

            {view === 'local' && supabaseReady && (
              <button type="button" className={styles.link} onClick={() => setMode('login')}>
                로그인 화면으로 돌아가기
              </button>
            )}
          </>
        )}

        {(account || profile) && (
          <button type="button" className={styles.logout} onClick={logout} disabled={busy}>
            로그아웃
          </button>
        )}
      </form>
    </Modal>
  );
}
