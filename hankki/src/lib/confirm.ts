import { Alert, Platform } from 'react-native';

/** 확인 창. 웹에서는 Alert 버튼이 동작하지 않아 브라우저 confirm을 쓴다. */
export function confirm(title: string, message: string, okText: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: okText, style: okText === '지우기' ? 'destructive' : 'default', onPress: onOk },
  ]);
}
