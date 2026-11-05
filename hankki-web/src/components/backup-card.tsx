'use client';

import React, { useRef, useState } from 'react';
import { IoCloudDownloadOutline, IoCloudUploadOutline } from 'react-icons/io5';

import { useToast } from '@/components/toast';
import { Card, GhostButton, PrimaryButton, SecondaryButton, Sub } from '@/components/ui';
import { lastBackupAt, MAX_FILE_BYTES, parseBackup, restoreBackup, saveBackup, saveMealsCsv } from '@/lib/backup';
import { formatDate } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import styles from './backup-card.module.css';

const NOT_BACKUP = '한끼예산 백업 파일이 아니에요';

/** 기록은 이 브라우저에만 있어서, 파일로 저장해 두고 다른 기기나 브라우저에서 불러온다 */
export function BackupCard() {
  const { settings, meals } = useBudget();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState(lastBackupAt);

  const onSave = () => {
    try {
      setLast(saveBackup(settings, meals));
      toast('백업 파일을 저장했어요');
    } catch {
      toast('백업 파일을 만들지 못했어요');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const backup = file.size <= MAX_FILE_BYTES ? parseBackup(await file.text()) : null;
    if (!backup) {
      toast(NOT_BACKUP);
      return;
    }
    confirm(
      '백업 불러오기',
      `기록 ${backup.budget.meals.length}개가 든 백업이에요. 지금 기록은 그대로 두고 합치고, 예산 설정과 내 정보는 백업으로 바뀝니다.`,
      () => {
        try {
          const added = restoreBackup(backup);
          window.alert(`새 기록 ${added}개를 불러왔어요`);
          window.location.reload();
        } catch {
          toast('이 브라우저에는 저장할 수 없어요');
        }
      },
    );
  };

  return (
    <Card>
      <div className={styles.body}>
        <h2 className={styles.title}>기록 백업</h2>
        <Sub>
          로그인하지 않으면 기록은 이 브라우저에만 저장돼요. 파일로 저장해 두면 휴대폰을 바꿔도 불러올 수 있어요. 파일에는 내 정보도 들어 있으니 다른 사람에게 보내지 마세요.
        </Sub>
        <p className={styles.last}>{last ? `마지막 백업 ${formatDate(new Date(last))}` : '아직 백업한 적이 없어요'}</p>
        <div className={styles.actions}>
          <PrimaryButton label="백업 저장" icon={IoCloudDownloadOutline} onPress={onSave} />
          <SecondaryButton label="불러오기" icon={IoCloudUploadOutline} onPress={() => fileRef.current?.click()} />
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} aria-label="백업 파일 고르기" />
        <div className={styles.center}>
          <GhostButton label="엑셀용 표로 저장" onPress={() => saveMealsCsv(meals)} />
        </div>
      </div>
    </Card>
  );
}
