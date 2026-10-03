import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PatternsMark from '@/components/PatternsMark';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

const BADGE_DOT_SIZE = 8;
const BADGE_DOT_RADIUS = 2;
const BODY_LINE_HEIGHT = 20;

interface OptionCardProps {
  recommended?: boolean;
  headline: string;
  body: string;
  actionLabel: string;
  actionAccent?: boolean;
  onPress: () => void;
}

function OptionCard({
  recommended = false,
  headline,
  body,
  actionLabel,
  actionAccent = false,
  onPress,
}: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: color.border2 }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {recommended ? (
        <View style={styles.badgeRow}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeLabel}>RECOMMENDED</Text>
        </View>
      ) : null}

      <Text style={styles.cardHeadline}>{headline}</Text>
      <Text style={styles.cardBody}>{body}</Text>

      <Text
        style={[
          styles.cardAction,
          actionAccent ? styles.cardActionAccent : styles.cardActionMuted,
        ]}>
        {actionLabel}
      </Text>
    </Pressable>
  );
}

export default function LaunchForkScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.wordmarkArea}>
          <PatternsMark size="large" />
          <Text style={styles.promptLabel}>HOW DO YOU WANT TO START?</Text>
        </View>

        <View style={styles.cards}>
          <OptionCard
            recommended
            headline="Let AI do it"
            body="Answer a few questions and Patterns builds your tracker automatically."
            actionLabel="START CHAT →"
            actionAccent
            onPress={() => router.push('/onboarding')}
          />
          <OptionCard
            headline="Start from a template"
            body="Pick a ready-made tracker, like heartburn, a dog or sleep and mood, and tweak it."
            actionLabel="BROWSE TEMPLATES →"
            onPress={() => router.push('/templates' as Href)}
          />
          <OptionCard
            headline="Build your own"
            body="Choose your inputs and set up your tracker manually."
            actionLabel="OPEN BUILDER →"
            onPress={() => router.push('/builder' as Href)}
          />
        </View>

        <Text style={styles.footerNote}>YOU CAN CHANGE THIS LATER IN SETTINGS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  wordmarkArea: {
    flex: 0.36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
  },
  promptLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cards: {
    flex: 1,
    justifyContent: 'center',
    gap: space.md,
  },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  badgeDot: {
    width: BADGE_DOT_SIZE,
    height: BADGE_DOT_SIZE,
    borderRadius: BADGE_DOT_RADIUS,
    backgroundColor: color.accent,
  },
  badgeLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  cardHeadline: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.headline,
    fontWeight: fontWeight.medium,
    color: color.text1,
  },
  cardBody: {
    fontFamily: font.ui,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: BODY_LINE_HEIGHT,
    color: color.text2,
  },
  cardAction: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textAlign: 'right',
    marginTop: space.sm,
  },
  cardActionAccent: {
    color: color.accent,
  },
  cardActionMuted: {
    color: color.text3,
  },
  footerNote: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: 0.5,
    color: color.text3,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingBottom: space.xl,
  },
});
