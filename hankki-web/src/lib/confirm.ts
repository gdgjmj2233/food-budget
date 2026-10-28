/** 확인 창. 브라우저 기본 confirm을 쓴다. */
export function confirm(title: string, message: string, onOk: () => void) {
  if (window.confirm(`${title}\n\n${message}`)) onOk();
}
