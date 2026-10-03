import { usePathname } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  DEMO_NOTE,
  REPO_URL,
  SCREEN_NOTES,
  WRITEUP,
  WRITEUP_TAGLINE,
  WRITEUP_TITLE,
} from '@/data/writeup';

const INK = '#ECE7DD';
const BODY = '#948C80';
const MUTED = '#635C52';
const LINE = '#2C2823';
const ACCENT = '#FF6B35';

export function LeftPanel({ height }: { height: number }) {
  const pathname = usePathname();
  const match = SCREEN_NOTES.find((entry) => entry.match(pathname ?? ''));
  const note = match?.note;

  return (
    <View style={[styles.panel, { height }]}>
      <Text style={styles.kicker}>THIS SCREEN</Text>
      {note ? (
        <>
          <Text style={styles.screenTitle}>{note.title}</Text>
          <Text style={styles.body}>{note.body}</Text>
          {note.tips?.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.dot} />
              <Text style={[styles.body, styles.tipText]}>{tip}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

export function RightPanel({ height }: { height: number }) {
  return (
    <View style={[styles.panel, styles.rightPanel, { height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{DEMO_NOTE}</Text>
        </View>

        <Text style={styles.kicker}>ABOUT THIS PROJECT</Text>
        <Text style={styles.title}>{WRITEUP_TITLE}</Text>
        <Text style={styles.tagline}>{WRITEUP_TAGLINE}</Text>

        {WRITEUP.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} style={[styles.body, styles.paragraph]}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.tipRow}>
                <View style={styles.dot} />
                <Text style={[styles.body, styles.tipText]}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

        {REPO_URL ? (
          <Pressable onPress={() => void Linking.openURL(REPO_URL)}>
            <Text style={styles.link}>View the code on GitHub →</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 300, justifyContent: 'flex-start', paddingTop: 36 },
  rightPanel: { width: 360, paddingTop: 0 },
  scroll: { paddingTop: 36, paddingBottom: 48, paddingRight: 8 },
  kicker: {
    fontFamily: 'GeistMono-Regular',
    fontSize: 11,
    letterSpacing: 1.2,
    color: MUTED,
    marginBottom: 10,
  },
  screenTitle: { fontFamily: 'Geist-Medium', fontSize: 20, color: INK, marginBottom: 8 },
  title: { fontFamily: 'Geist-Medium', fontSize: 28, color: INK },
  tagline: { fontFamily: 'Geist-Regular', fontSize: 15, color: BODY, lineHeight: 22, marginTop: 6 },
  section: { marginTop: 26, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 16 },
  heading: { fontFamily: 'Geist-Medium', fontSize: 15, color: INK, marginBottom: 8 },
  body: { fontFamily: 'Geist-Regular', fontSize: 14, color: BODY, lineHeight: 21 },
  paragraph: { marginBottom: 10 },
  tipRow: { flexDirection: 'row', gap: 10, marginTop: 8, paddingRight: 8 },
  tipText: { flex: 1 },
  dot: { width: 5, height: 5, borderRadius: 1, backgroundColor: ACCENT, marginTop: 8 },
  noteBox: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 12,
    marginBottom: 28,
  },
  noteText: { fontFamily: 'Geist-Regular', fontSize: 12.5, color: MUTED, lineHeight: 18 },
  link: { fontFamily: 'GeistMono-Regular', fontSize: 13, color: ACCENT, marginTop: 28 },
});
