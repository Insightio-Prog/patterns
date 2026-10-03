import { StatusBar } from 'expo-status-bar';

import { StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';



import { color, font, fontSize, space } from '@/theme/theme';



export default function SettingsScreen() {

  return (

    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <StatusBar style="light" />

      <View style={styles.content}>

        <Text style={styles.title}>Settings</Text>

        <Text style={styles.subtitle}>Coming soon.</Text>

      </View>

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  safeArea: {

    flex: 1,

    backgroundColor: color.bg,

  },

  content: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    padding: space.lg,

  },

  title: {

    fontFamily: font.uiSemiBold,

    fontSize: fontSize.headline,

    color: color.text1,

    marginBottom: space.sm,

  },

  subtitle: {

    fontFamily: font.ui,

    fontSize: fontSize.secondary,

    color: color.text2,

  },

});


