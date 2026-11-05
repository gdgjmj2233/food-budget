// 여러 화면에서 같이 쓰는 기본 UI 조각

import React from 'react';
import type { IconType } from 'react-icons';

import styles from './ui.module.css';

export function Screen({ children }: { children: React.ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}

export function Sub({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p className={styles.sub} style={style}>
      {children}
    </p>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={styles.card} style={style}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  color = 'var(--primary)',
}: {
  label: string;
  onPress: () => void;
  icon?: IconType;
  color?: string;
}) {
  return (
    <button type="button" onClick={onPress} className={styles.primary} style={{ backgroundColor: color }}>
      {Icon && <Icon size={20} aria-hidden />}
      {label}
    </button>
  );
}

/** 화면에서 가장 중요한 버튼 하나에 쓰는 노란 버튼 */
export function AccentButton({ label, onPress, icon: Icon }: { label: string; onPress: () => void; icon?: IconType }) {
  return (
    <button type="button" onClick={onPress} className={styles.accent}>
      {Icon && <Icon size={24} aria-hidden />}
      {label}
    </button>
  );
}

export function SecondaryButton({ label, onPress, icon: Icon }: { label: string; onPress: () => void; icon?: IconType }) {
  return (
    <button type="button" onClick={onPress} className={`${styles.primary} ${styles.secondary}`}>
      {Icon && <Icon size={20} aria-hidden />}
      {label}
    </button>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} className={styles.ghost}>
      {label}
    </button>
  );
}
