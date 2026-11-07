'use client';

import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/toast';
import { loadCloud, readMark, saveCloud, writeMark } from '@/lib/cloud';
import { reconcile, type CloudData } from '@/lib/cloud-merge';
import { useAccount } from '@/store/account-store';
import { useBudget } from '@/store/budget-store';
import { saveProfile, useProfile, type Profile } from '@/store/profile-store';
import { replaceRatings, useRatings } from '@/store/rating-store';

/** 바뀐 뒤 이만큼 잠잠하면 저장한다 */
const SAVE_DELAY_MS = 1500;

/** 지금 데이터를 계정에 저장할 글자로 만든다 */
export function useCloudData(): CloudData {
  const { settings, meals, dismissedDate } = useBudget();
  return { settings, meals, dismissedDate, profile: useProfile(), ratings: useRatings() };
}

/** 로그인하면 계정의 데이터를 불러오고, 그 뒤로 바뀔 때마다 계정에 저장한다. 화면에는 아무것도 그리지 않는다. */
export function CloudSync() {
  const uid = useAccount()?.uid ?? null;
  const { replaceData } = useBudget();
  const toast = useToast();
  const data = useCloudData();
  const json = JSON.stringify(data);

  const [readyUid, setReadyUid] = useState<string | null>(null);
  const saved = useRef('');
  const latest = useRef({ data, replaceData, toast });
  useEffect(() => {
    latest.current = { data, replaceData, toast };
  });

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    loadCloud(uid)
      .then((remote) => {
        if (!alive) return;
        const { data: next, apply } = reconcile(latest.current.data, remote, readMark(), uid);
        if (apply) {
          latest.current.replaceData(next);
          saveProfile(next.profile as Profile | null);
          replaceRatings(next.ratings);
        }
        if (remote) writeMark({ uid, at: remote.updatedAt });
        saved.current = remote ? JSON.stringify(remote.data) : '';
        setReadyUid(uid);
      })
      .catch(() => alive && latest.current.toast('계정의 기록을 불러오지 못했어요'));
    return () => {
      alive = false;
      setReadyUid(null);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || readyUid !== uid || json === saved.current) return;
    const timer = setTimeout(() => {
      saveCloud(uid, json)
        .then(() => {
          saved.current = json;
        })
        .catch(() => latest.current.toast('자동 저장에 실패했어요. 인터넷 연결을 확인해 주세요'));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [uid, readyUid, json]);

  return null;
}
