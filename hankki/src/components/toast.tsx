import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { C } from '@/theme';

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      anim.stopAnimation();
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(2300),
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    },
    [anim],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
    backgroundColor: C.ink,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  text: { color: '#fff', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
