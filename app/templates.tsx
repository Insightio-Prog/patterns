import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TRACKER_TEMPLATES, type TrackerTemplate } from '@/data/templates';
import { loadSampleData } from '@/storage/sampleData';
import { saveTrackerConfig, setOnboardingComplete } from '@/storage/storage';
import { color, font, fontSize, fontWeight, radius, space } from '@/theme/theme';

export default function TemplatesScreen() {
  const [withSample, setWithSample] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const choose = async (template: TrackerTemplate) => {
    if (busy) return;
    setBusy(template.id);
    try {
      await saveTrackerConfig(template.config);
      await setOnboardingComplete();
      if (withSample) {
        await loadSampleData(template.config);
      }
    } catch {
      // fall through to home either way
    }
    router.replace('/(tabs)/home' as Href);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Pick a template</Text>
        <Text style={styles.subtitle}>
          Ready-made trackers. You can edit any of them afterwards in the builder.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.sampleRow} onPress={() => setWithSample((v) => !v)}>
          <View style={[styles.box, withSample && styles.boxOn]}>
            {withSample ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <View style={styles.sampleText}>
            <Text style={styles.sampleTitle}>Include a week of sample data</Text>
            <Text style={styles.sampleHint}>
              Fills the charts and diary so you can see it working. Remove it any time from the gear menu.
            </Text>
          </View>
        </Pressable>

        {TRACKER_TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => void choose(template)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{template.title}</Text>
              <Text style={styles.cardTag}>{template.tag}</Text>
            </View>
            <Text style={styles.cardBlurb}>{template.blurb}</Text>
            <Text style={styles.cardTracks}>{template.tracks.join(' · ')}</Text>
            <Text style={styles.cardAction}>
              {busy === template.id ? 'Setting up…' : 'Use this →'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xs },
  back: { fontFamily: font.mono, fontSize: fontSize.monoLabel, color: color.text3, marginBottom: space.sm },
  title: { fontFamily: font.uiMedium, fontSize: fontSize.headline + 4, fontWeight: fontWeight.medium, color: color.title },
  subtitle: { fontFamily: font.ui, fontSize: fontSize.body, color: color.text2, lineHeight: 20 },
  list: { padding: space.lg, gap: space.md },
  sampleRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
    paddingVertical: space.sm,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: color.border2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  tick: { color: color.bg, fontSize: 13, fontWeight: fontWeight.medium },
  sampleText: { flex: 1, gap: 2 },
  sampleTitle: { fontFamily: font.uiMedium, fontSize: fontSize.body, color: color.text1 },
  sampleHint: { fontFamily: font.ui, fontSize: fontSize.body - 1, color: color.text3, lineHeight: 18 },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: font.uiMedium, fontSize: fontSize.headline, fontWeight: fontWeight.medium, color: color.text1 },
  cardTag: { fontFamily: font.mono, fontSize: fontSize.monoLabel, color: color.text3 },
  cardBlurb: { fontFamily: font.ui, fontSize: fontSize.body, color: color.text2, lineHeight: 20 },
  cardTracks: { fontFamily: font.mono, fontSize: fontSize.monoLabel, color: color.text3, marginTop: space.xs },
  cardAction: { fontFamily: font.mono, fontSize: fontSize.monoLabel, color: color.accent, textAlign: 'right', marginTop: space.xs },
});
