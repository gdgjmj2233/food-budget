'use client';

import React, { useEffect, useRef } from 'react';

import styles from './modal.module.css';

/** 화면 가운데 뜨는 창. 그려질 때 열리고, Esc나 바깥 어두운 부분을 누르면 onClose를 부른다. */
export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </dialog>
  );
}
