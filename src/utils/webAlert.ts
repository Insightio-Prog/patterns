import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * react-native-web's Alert.alert is a no-op, so every confirmation (Remove row,
 * Discard changes...) silently does nothing in the browser demo. Route it to
 * window.confirm / window.alert instead. Native platforms are untouched.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const cancel = buttons.find((button) => button.style === 'cancel');
    const action = buttons.find((button) => button !== cancel) ?? buttons[0];

    if (window.confirm(text)) {
      action.onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}

export {};
