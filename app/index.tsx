import { type Href, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { isOnboardingComplete } from '@/storage/storage';
import { color } from '@/theme/theme';

export default function Index() {
  const [href, setHref] = useState<'/(tabs)/home' | '/launch-fork' | null>(null);

  useEffect(() => {
    void isOnboardingComplete().then((complete) => {
      setHref(complete ? '/(tabs)/home' : '/launch-fork');
    });
  }, []);

  if (!href) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return <Redirect href={href as Href} />;
}
