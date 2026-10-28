'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

import styles from './toast.module.css';

const ToastContext = createContext<(message: string) => void>(() => {});

/** 나타나는 시간 + 보여주는 시간 (ms) */
const SHOW_MS = 180 + 2300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((msg: string) => {
    clearTimeout(timer.current);
    setMessage(msg);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), SHOW_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className={`${styles.toast} ${visible ? styles.on : ''}`}>
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
