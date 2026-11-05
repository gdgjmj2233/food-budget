'use client';

import React, { useEffect, useRef } from 'react';

import styles from './modal.module.css';

/**
 * 화면 가운데 뜨는 창. sheet 를 주면 아래에서 올라오는 큰 창이 된다.
 * 그려질 때 열리고, Esc나 바깥 어두운 부분을 누르면 onClose를 부른다.
 */
export function Modal({ onClose, sheet, children }: { onClose: () => void; sheet?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${sheet ? styles.sheet : ''}`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      {sheet && <span className={styles.handle} aria-hidden />}
      {children}
    </dialog>
  );
}
