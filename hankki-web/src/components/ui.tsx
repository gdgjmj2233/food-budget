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
  color = 'var(--ink)',
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

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} className={styles.ghost}>
      {label}
    </button>
  );
}
