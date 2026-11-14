import React from 'react';
import type { IconBaseProps } from 'react-icons';

/**
 * 밥그릇 선 아이콘. 밥먹기 버튼에 쓴다.
 * 예전 국그릇 아이콘(lucide)과 같은 양식: 24칸 기준, 선 굵기 2, 둥근 끝, 채우지 않음.
 * 그릇·받침은 국그릇과 같고, 국 대신 소복이 담은 밥과 밥알을 그린다.
 */
export function RiceBowlIcon({ size = '1em', color = 'currentColor', title, ...rest }: IconBaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}>
      {title && <title>{title}</title>}
      {/* 그릇 */}
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      {/* 받침 */}
      <path d="M7 21h10" />
      {/* 소복이 담은 밥 */}
      <path d="M4.5 12a7.5 6.5 0 0 1 15 0" />
      {/* 밥알 */}
      <path d="M9 9.5h.01M12 8h.01M15 9.5h.01" />
    </svg>
  );
}
