import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import '@/utils/webAlert';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LeftPanel, RightPanel } from '@/components/SidePanels';

const FRAME_BREAKPOINT = 600;
const PHONE_WIDTH = 400;
const PHONE_MAX_HEIGHT = 860;
const PANELS_BREAKPOINT = 1200;

/**
 * On wide web screens, show the app inside a phone-shaped frame so the demo
 * looks like the mobile app. On phones / native it renders full screen.
 */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Same tree on server and client (no remount); only styles change after mount.
  const framed = Platform.OS === 'web' && mounted && width >= FRAME_BREAKPOINT;
  const frameHeight = Math.min(PHONE_MAX_HEIGHT, height - 48);
  const showPanels = framed && width >= PANELS_BREAKPOINT;

  return (
    <View
      style={
        framed
          ? {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 56,
              backgroundColor: '#0A0908',
            }
          : { flex: 1 }
      }>
      {showPanels ? <LeftPanel height={frameHeight + 32} /> : null}
      <View style={framed ? { alignItems: 'center' } : { flex: 1 }}>
      <Text
        style={{
          display: framed ? 'flex' : 'none',
          color: '#6F675E',
          fontSize: 12,
          letterSpacing: 1.2,
          marginBottom: 10,
          fontFamily: 'GeistMono-Regular',
        }}>
        PATTERNS · LIVE DEMO
      </Text>
      <View
        style={
          framed
            ? {
                width: PHONE_WIDTH,
                height: frameHeight,
                borderRadius: 44,
                borderWidth: 8,
                borderColor: '#3d372f',
                overflow: 'hidden',
                backgroundColor: '#141210',
                transform: 'translateZ(0)',
                boxShadow: '0 0 0 1px #6b6258, 0 0 70px rgba(255,240,220,0.08), 0 24px 80px rgba(0,0,0,0.6)',
              }
            : { flex: 1 }
        }>
        {children}
      </View>
      </View>
      {showPanels ? <RightPanel height={frameHeight + 32} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'Geist-Regular': require('../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('../assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../assets/fonts/Geist-SemiBold.ttf'),
    'GeistMono-Regular': require('../assets/fonts/GeistMono-Regular.ttf'),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#141210' }} />
    );
  }

  return (
    <PhoneFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </PhoneFrame>
  );
}
