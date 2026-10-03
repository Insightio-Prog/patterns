import { IconChevronLeft } from '@tabler/icons-react-native';
import { type Href, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

type Cadence = 'daily' | 'every3days' | 'weekly' | 'off';

const TOTAL_STEPS = 3;
const CTA_HEIGHT = 52;
const INPUT_FONT_SIZE = 16;
const HEADLINE_FONT_SIZE = 22;
const HEADLINE_LINE_HEIGHT = 30;
const CHIP_ADVANCE_MS = 120;

const QUICK_PICKS = ['me', 'my partner', 'my dog', 'my cat', 'my plant'] as const;

const CADENCE_OPTIONS: {
  label: string;
  sublabel: string;
  value: Cadence;
}[] = [
  {
    label: 'Daily',
    sublabel: 'Best for symptoms, mood or anything that shifts day to day.',
    value: 'daily',
  },
  {
    label: 'Every 3 days',
    sublabel: 'Good for habits or metrics that change gradually.',
    value: 'every3days',
  },
  {
    label: 'Weekly',
    sublabel: 'Suits slower-moving trackers — fitness, weight, plants.',
    value: 'weekly',
  },
  {
    label: 'Off',
    sublabel: 'Log and chart only — no AI insights. Free tier friendly.',
    value: 'off',
  },
];

function formatStepLabel(step: number): string {
  return `STEP ${String(step).padStart(2, '0')} OF 03`;
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export default function BuilderScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [trackerName, setTrackerName] = useState('');
  const [subject, setSubject] = useState('');
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [nameHasTyped, setNameHasTyped] = useState(false);
  const [subjectHasTyped, setSubjectHasTyped] = useState(false);
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBack = () => {
    if (currentStep === 1) {
      router.replace('/launch-fork' as Href);
      return;
    }

    setCurrentStep((step) => step - 1);
  };

  const advanceFromStep1 = useCallback(() => {
    if (!isNonEmpty(trackerName)) {
      return;
    }

    setCurrentStep(2);
  }, [trackerName]);

  const advanceFromStep2 = useCallback(() => {
    if (!isNonEmpty(subject)) {
      return;
    }

    setCurrentStep(3);
  }, [subject]);

  const handleQuickPick = (value: string) => {
    setSubject(value);
    setSubjectHasTyped(true);

    if (chipTimerRef.current) {
      clearTimeout(chipTimerRef.current);
    }

    chipTimerRef.current = setTimeout(() => {
      setCurrentStep(3);
      chipTimerRef.current = null;
    }, CHIP_ADVANCE_MS);
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      advanceFromStep1();
      return;
    }

    if (currentStep === 2) {
      advanceFromStep2();
      return;
    }

    if (!cadence || !isNonEmpty(trackerName) || !isNonEmpty(subject)) {
      return;
    }

    router.push({
      pathname: '/builder-canvas',
      params: {
        name: trackerName.trim(),
        subject: subject.trim(),
        cadence,
      },
    } as Href);
  };

  const step1Valid = isNonEmpty(trackerName);
  const step2Valid = isNonEmpty(subject);
  const step3Valid = cadence !== null;
  const canContinue =
    (currentStep === 1 && step1Valid) ||
    (currentStep === 2 && step2Valid) ||
    (currentStep === 3 && step3Valid);

  const ctaLabel =
    currentStep === 1
      ? 'SET NAME →'
      : currentStep === 2
        ? 'SET SUBJECT →'
        : 'BUILD TRACKER →';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={space.sm} style={styles.backButton}>
            <IconChevronLeft size={22} color={color.text2} strokeWidth={1.5} />
          </Pressable>
        </View>

        <Text style={styles.stepCounter}>{formatStepLabel(currentStep)}</Text>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {currentStep === 1 ? (
            <View>
              <Text style={styles.headline}>What are you calling this tracker?</Text>
              <Text style={styles.subtext}>You can rename it any time.</Text>

              <TextInput
                key="builder-name-input"
                style={[
                  styles.input,
                  nameFocused && styles.inputFocused,
                ]}
                value={trackerName}
                onChangeText={(text) => {
                  if (!nameHasTyped && text.length > 0) {
                    setNameHasTyped(true);
                  }

                  setTrackerName(text);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="e.g. My GERD tracker, Brian's digestion..."
                placeholderTextColor={color.text3}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={advanceFromStep1}
              />

              {nameHasTyped ? (
                <Text style={styles.charCount}>{trackerName.length} / 40</Text>
              ) : null}
            </View>
          ) : null}

          {currentStep === 2 ? (
            <View>
              <Text style={styles.headline}>Who or what are you tracking?</Text>
              <Text style={styles.subtext}>
                This is how Patterns will refer to the subject in insights and reports.
              </Text>

              <TextInput
                key="builder-subject-input"
                style={[
                  styles.input,
                  subjectFocused && styles.inputFocused,
                ]}
                value={subject}
                onChangeText={(text) => {
                  if (!subjectHasTyped && text.length > 0) {
                    setSubjectHasTyped(true);
                  }

                  setSubject(text);
                }}
                onFocus={() => setSubjectFocused(true)}
                onBlur={() => setSubjectFocused(false)}
                placeholder="e.g. me, Brian, my plant, left knee..."
                placeholderTextColor={color.text3}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={advanceFromStep2}
              />

              {subjectHasTyped ? (
                <Text style={styles.charCount}>{subject.length} / 30</Text>
              ) : null}

              <Text style={styles.quickPickLabel}>QUICK PICKS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {QUICK_PICKS.map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => handleQuickPick(chip)}
                    style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {currentStep === 3 ? (
            <View>
              <Text style={styles.headline}>How often should Patterns review your data?</Text>
              <Text style={styles.subtext}>
                Patterns will generate AI insights on this schedule. You can change it any time.
              </Text>

              <View style={styles.cadenceList}>
                {CADENCE_OPTIONS.map((option) => {
                  const selected = cadence === option.value;
                  const isOff = option.value === 'off';

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCadence(option.value)}
                      style={[
                        styles.cadenceCard,
                        selected && styles.cadenceCardSelected,
                        selected && isOff && styles.cadenceCardSelectedOff,
                      ]}>
                      <View
                        style={[
                          styles.radio,
                          isOff && !selected && styles.radioOffUnselected,
                          selected && !isOff && styles.radioSelected,
                          selected && isOff && styles.radioSelectedOff,
                        ]}
                      />
                      <View style={styles.cadenceTextWrap}>
                        <Text
                          style={[
                            styles.cadenceLabel,
                            isOff && !selected && styles.cadenceLabelOff,
                          ]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.cadenceSublabel,
                            isOff && !selected && styles.cadenceSublabelOff,
                          ]}>
                          {option.sublabel}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            disabled={!canContinue}
            onPress={handleContinue}
            style={[styles.cta, !canContinue && styles.ctaDisabled]}>
            <Text style={[styles.ctaLabel, !canContinue && styles.ctaLabelDisabled]}>
              {ctaLabel}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    minHeight: 44,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: space.xl,
  },
  content: {
    paddingHorizontal: space.xxl,
    paddingBottom: space.lg,
    flexGrow: 1,
  },
  headline: {
    fontFamily: font.uiMedium,
    fontSize: HEADLINE_FONT_SIZE,
    fontWeight: fontWeight.medium,
    lineHeight: HEADLINE_LINE_HEIGHT,
    color: color.text1,
    marginBottom: space.sm,
  },
  subtext: {
    fontFamily: font.ui,
    fontSize: fontSize.body,
    color: color.text2,
    marginBottom: 28,
  },
  input: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.lg,
    fontFamily: font.ui,
    fontSize: INPUT_FONT_SIZE,
    color: color.text1,
  },
  inputFocused: {
    borderColor: color.accent,
  },
  charCount: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text3,
    textAlign: 'right',
    marginTop: space.sm,
  },
  quickPickLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  chipRow: {
    paddingRight: space.lg,
  },
  chip: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border2,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: space.sm,
    marginRight: space.sm,
  },
  chipText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
  },
  cadenceList: {
    gap: 10,
  },
  cadenceCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cadenceCardSelected: {
    backgroundColor: color.surface2,
    borderColor: color.accent,
  },
  cadenceCardSelectedOff: {
    borderColor: color.border2,
  },
  radio: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: color.border2,
  },
  radioOffUnselected: {
    borderColor: color.text3,
  },
  radioSelected: {
    borderWidth: 0,
    backgroundColor: color.accent,
  },
  radioSelectedOff: {
    borderWidth: 0,
    backgroundColor: color.text3,
  },
  cadenceTextWrap: {
    flex: 1,
    gap: space.xs,
  },
  cadenceLabel: {
    fontFamily: font.uiMedium,
    fontSize: 15,
    fontWeight: fontWeight.medium,
    color: color.text1,
  },
  cadenceLabelOff: {
    color: color.text2,
  },
  cadenceSublabel: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text2,
  },
  cadenceSublabelOff: {
    color: color.text3,
  },
  bottomBar: {
    paddingHorizontal: space.xxl,
    paddingBottom: space.lg,
    paddingTop: space.sm,
  },
  cta: {
    width: '100%',
    height: CTA_HEIGHT,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: color.surface2,
  },
  ctaLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: color.accentInk,
  },
  ctaLabelDisabled: {
    color: color.text3,
  },
});
