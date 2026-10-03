import { StyleSheet, Text, View } from 'react-native';

import { color, font } from '@/theme/theme';

export default function LogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Log</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: color.text1,
    fontFamily: font.ui,
    fontSize: 17,
  },
});
