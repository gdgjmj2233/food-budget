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
import { accountError, logIn, logOut, resetPassword, signUp, useAccount } from '@/store/account-store';
import { useBudget } from '@/store/budget-store';
import { saveProfile, useProfile, type Profile } from '@/store/profile-store';
import { replaceRatings } from '@/store/rating-store';
import styles from './profile-dialog.module.css';
import ui from './ui.module.css';

const EMPTY: Profile = { nickname: '', major: '', studentId: '', email: '', character: CHARACTERS[0].id };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD = 6;

/**
 * 로그인 전에는 "로그인"·"회원가입", 로그인 후에는 "내 정보" 창.
 * 가입 없이 이 기기에만 저장할 수도 있다. 그 사람은 내 정보가 있어도 회원가입 창을 보고, 가입하면 쓰던 기록이 계정으로 옮겨진다.
 */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const account = useAccount();
  const { resetData } = useBudget();
  const cloudData = useCloudData();
  const toast = useToast();
  const [form, setForm] = useState<Profile>({ ...(profile ?? EMPTY), email: account?.email ?? profile?.email ?? '' });
  const [mode, setMode] = useState<'login' | 'signup'>(profile ? 'signup' : 'login');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const view = account ? 'info' : mode;
  const set = (patch: Partial<Profile>) => setForm({ ...form, ...patch });

  const nickname = form.nickname.trim();
  const email = form.email.trim();
  const emailBad = email !== '' && !EMAIL.test(email);
  const hasProfile = nickname !== '' && !emailBad;
  const hasLogin = email !== '' && !emailBad && password.length >= (view === 'signup' ? MIN_PASSWORD : 1);
  const canSave = !busy && (view === 'info' ? hasProfile : view === 'signup' ? hasProfile && hasLogin : hasLogin);
  const cleaned = { ...form, nickname, major: form.major.trim(), email };

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
    if (!canSave) return;
    if (view === 'info') {
      saveProfile(cleaned);
      toast('내 정보를 저장했어요');
      onClose();
      return;
    }
    run(async () => {
      if (view === 'signup') {
        await signUp(email, password);
        saveProfile(cleaned);
        toast(`${nickname}님, 반가워요!`);
      } else {
        await logIn(email, password);
        toast('로그인했어요');
      }
      onClose();
    });
  };

  /** 가입하지 않고 이 기기에만 내 정보를 저장한다 */
  const saveLocal = () => {
    saveProfile(cleaned);
    toast(`${nickname}님, 반가워요!`);
    onClose();
  };

  const onForgot = () => {
    if (!email || emailBad) {
      setProblem('이메일을 먼저 입력해 주세요');
      return;
    }
    run(async () => {
      await resetPassword(email);
      toast('비밀번호를 바꾸는 메일을 보냈어요');
    });
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

  const emailField = (
    <label className={styles.field}>
      <span className={styles.label}>
        이메일 {view !== 'info' && <span className={styles.required}>(필수)</span>}
      </span>
      <input
        className={styles.input}
        value={form.email}
        onChange={(e) => set({ email: e.target.value })}
        placeholder="예: hankki@inha.edu"
        type="email"
        autoComplete="email"
        maxLength={60}
        disabled={view === 'info'}
        aria-invalid={emailBad}
      />
      {emailBad && <span className={styles.error}>이메일 형식을 확인해 주세요</span>}
    </label>
  );

  return (
    <Modal onClose={onClose}>
      <form className={styles.body} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>{view === 'info' ? '내 정보' : view === 'signup' ? '회원가입' : '로그인'}</h2>
            <p className={styles.sub}>
              {view === 'info' ? '기록과 내 정보가 이 계정에 자동으로 저장돼요' : '로그인하면 다른 기기에서도 기록을 이어서 볼 수 있어요'}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <IoClose size={22} aria-hidden />
          </button>
        </div>

        {view !== 'login' && (
          <>
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
          </>
        )}

        {emailField}

        {view !== 'info' && (
          <label className={styles.field}>
            <span className={styles.label}>
              비밀번호 <span className={styles.required}>(필수{view === 'signup' && `, ${MIN_PASSWORD}자 이상`})</span>
            </span>
            <input
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
              maxLength={60}
            />
          </label>
        )}

        {problem && <p className={styles.error}>{problem}</p>}

        <button type="submit" className={ui.primary} style={{ backgroundColor: 'var(--ink)' }} disabled={!canSave}>
          {view === 'info' ? '저장' : view === 'signup' ? '회원가입' : '로그인'}
        </button>

        {view === 'login' && (
          <>
            <button type="button" className={styles.link} onClick={onForgot} disabled={busy}>
              비밀번호를 잊었어요
            </button>
            <button type="button" className={styles.link} onClick={() => setMode('signup')}>
              처음이에요, 회원가입
            </button>
          </>
        )}
        {view === 'signup' && (
          <>
            <button type="button" className={styles.link} onClick={() => setMode('login')}>
              이미 계정이 있어요
            </button>
            <button type="button" className={styles.link} onClick={saveLocal} disabled={!hasProfile}>
              가입 없이 이 기기에만 저장
            </button>
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
