import * as Haptics from 'expo-haptics';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface TimerModuleProps {
  label: string;
  terminology?: string;
  onLog: (durationSeconds: number) => void;
}

type TimerMode = 'timer' | 'manual';
type TimerStatus = 'idle' | 'running' | 'stopped';

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'timer', label: 'TIMER' },
  { value: 'manual', label: 'MANUAL' },
];

const SEGMENT_HEIGHT = 30;
const ACTION_BUTTON_HEIGHT = 40;
const LOG_BUTTON_HEIGHT = 40;
const MANUAL_INPUT_WIDTH = 56;
const MANUAL_INPUT_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const DEFAULT_TERMINOLOGY = 'SESSION';

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clampDigits(text: string, maxLength: number): string {
  return text.replace(/\D/g, '').slice(0, maxLength);
}

function parseManualSeconds(minutes: string, seconds: string): number {
  const mins = Number.parseInt(minutes || '0', 10);
  const secs = Number.parseInt(seconds || '0', 10);

  if (Number.isNaN(mins) || Number.isNaN(secs)) {
    return 0;
  }

  return mins * 60 + secs;
}

export default function TimerModule({
  label,
  terminology,
  onLog,
}: TimerModuleProps) {
  const logTerminology = (terminology ?? DEFAULT_TERMINOLOGY).toUpperCase();
  const [mode, setMode] = useState<TimerMode>('timer');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsInputRef = useRef<TextInput>(null);
  const startTimestamp = useRef<number | null>(null);
  const elapsedAtPause = useRef(0);
  const timerStatusRef = useRef<TimerStatus>('idle');

  const manualTotalSeconds = parseManualSeconds(manualMinutes, manualSeconds);
  const canLogManual = manualTotalSeconds > 0;
  const canLogTimer = timerStatus === 'stopped' && elapsedSeconds > 0;

  const getElapsedSeconds = () => {
    if (startTimestamp.current !== null) {
      return (
        elapsedAtPause.current +
        (Date.now() - startTimestamp.current) / 1000
      );
    }

    return elapsedAtPause.current;
  };

  const clearTimerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const updateDisplay = () => {
    setElapsedSeconds(Math.floor(getElapsedSeconds()));
  };

  const startTimerInterval = () => {
    clearTimerInterval();
    updateDisplay();
    intervalRef.current = setInterval(() => {
      updateDisplay();
    }, 1000);
  };

  useEffect(() => {
    timerStatusRef.current = timerStatus;
  }, [timerStatus]);

  useEffect(() => {
    if (timerStatus === 'running') {
      startTimerInterval();
    } else {
      clearTimerInterval();
    }

    return () => {
      clearTimerInterval();
    };
  }, [timerStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && timerStatusRef.current === 'running') {
        clearTimerInterval();
        return;
      }

      if (nextState === 'active' && timerStatusRef.current === 'running') {
        startTimerInterval();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const resetTimer = () => {
    elapsedAtPause.current = 0;
    startTimestamp.current = null;
    clearTimerInterval();
    setTimerStatus('idle');
    setElapsedSeconds(0);
  };

  const resetManual = () => {
    setManualMinutes('');
    setManualSeconds('');
  };

  const handleModeSelect = (nextMode: TimerMode) => {
    if (nextMode === mode) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(nextMode);
    resetTimer();
    resetManual();
    setLoggedConfirm(false);
  };

  const handleStart = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    elapsedAtPause.current = 0;
    startTimestamp.current = Date.now();
    setElapsedSeconds(0);
    setTimerStatus('running');
  };

  const handleStop = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const totalElapsed = getElapsedSeconds();
    elapsedAtPause.current = totalElapsed;
    startTimestamp.current = null;
    clearTimerInterval();
    setElapsedSeconds(Math.floor(totalElapsed));
    setTimerStatus('stopped');
  };

  const handleReset = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetTimer();
  };

  const handleMinutesChange = (text: string) => {
    const digits = clampDigits(text, 2);
    setManualMinutes(digits);

    if (digits.length === 2) {
      secondsInputRef.current?.focus();
    }
  };

  const handleSecondsChange = (text: string) => {
    setManualSeconds(clampDigits(text, 2));
  };

  const handleLog = () => {
    const durationSeconds =
      mode === 'timer' ? elapsedSeconds : manualTotalSeconds;

    if (durationSeconds <= 0 || loggedConfirm) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(durationSeconds);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);

      if (mode === 'timer') {
        resetTimer();
      } else {
        resetManual();
      }

      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    const duration =
      mode === 'timer' ? elapsedSeconds : manualTotalSeconds;

    return `LOG · ${formatDuration(duration)} · ${logTerminology}`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      <View style={styles.modeContainer}>
        {MODES.map((modeOption, index) => (
          <Fragment key={modeOption.value}>
            {index > 0 ? <View style={styles.modeDivider} /> : null}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleModeSelect(modeOption.value)}
              style={[
                styles.modeSegment,
                mode === modeOption.value && styles.modeSegmentActive,
              ]}>
              <Text
                style={[
                  styles.modeSegmentLabel,
                  mode === modeOption.value && styles.modeSegmentLabelActive,
                ]}>
                {modeOption.label}
              </Text>
            </TouchableOpacity>
          </Fragment>
        ))}
      </View>

      {mode === 'timer' ? (
        <View style={styles.timerBody}>
          <Text style={styles.timeDisplay}>
            {formatDuration(elapsedSeconds)}
          </Text>

          {timerStatus === 'running' ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStop}
              style={styles.stopButton}>
              <Text style={styles.stopButtonLabel}>STOP</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStart}
              style={styles.startButton}>
              <Text style={styles.startButtonLabel}>START</Text>
            </TouchableOpacity>
          )}

          {timerStatus === 'stopped' && elapsedSeconds > 0 ? (
            <View style={styles.stoppedActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLog}
                disabled={loggedConfirm}
                style={[
                  styles.logButton,
                  loggedConfirm
                    ? styles.logButtonInactive
                    : styles.logButtonActive,
                ]}>
                <Text
                  style={[
                    styles.logButtonLabel,
                    loggedConfirm
                      ? styles.logButtonLabelInactive
                      : styles.logButtonLabelActive,
                  ]}>
                  {getLogLabel()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReset}
                style={styles.resetButton}>
                <Text style={styles.resetButtonLabel}>RESET</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.manualBody}>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              value={manualMinutes}
              onChangeText={handleMinutesChange}
              keyboardType="decimal-pad"
              placeholder="00"
              placeholderTextColor={color.text3}
              maxLength={2}
              textAlign="center"
            />
            <Text style={styles.manualSeparator}>:</Text>
            <TextInput
              ref={secondsInputRef}
              style={styles.manualInput}
              value={manualSeconds}
              onChangeText={handleSecondsChange}
              keyboardType="decimal-pad"
              placeholder="00"
              placeholderTextColor={color.text3}
              maxLength={2}
              textAlign="center"
            />
          </View>

          {canLogManual || loggedConfirm ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLog}
              disabled={loggedConfirm}
              style={[
                styles.logButton,
                styles.logButtonFull,
                loggedConfirm
                  ? styles.logButtonInactive
                  : styles.logButtonActive,
              ]}>
              <Text
                style={[
                  styles.logButtonLabel,
                  loggedConfirm
                    ? styles.logButtonLabelInactive
                    : styles.logButtonLabelActive,
                ]}>
                {getLogLabel()}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    marginBottom: space.sm,
  },
  modeContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: color.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
    alignItems: 'stretch',
    marginBottom: space.md,
  },
  modeSegment: {
    paddingHorizontal: space.lg,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegmentActive: {
    backgroundColor: color.accent,
    borderWidth: 1,
    borderColor: color.accent,
  },
  modeSegmentLabel: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text2,
  },
  modeSegmentLabelActive: {
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
  },
  modeDivider: {
    width: 1,
    backgroundColor: color.border,
    alignSelf: 'stretch',
  },
  timerBody: {
    alignItems: 'center',
  },
  timeDisplay: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    marginBottom: space.md,
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
    height: ACTION_BUTTON_HEIGHT,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
  stopButton: {
    width: '100%',
    height: ACTION_BUTTON_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.danger,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
  stoppedActions: {
    width: '100%',
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  manualBody: {
    alignItems: 'center',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  manualInput: {
    width: MANUAL_INPUT_WIDTH,
    height: MANUAL_INPUT_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    padding: 0,
  },
  manualSeparator: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text2,
    fontWeight: fontWeight.semibold,
  },
  logButton: {
    flex: 1,
    height: LOG_BUTTON_HEIGHT,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonFull: {
    width: '100%',
    flex: undefined,
    marginTop: space.sm,
  },
  logButtonActive: {
    backgroundColor: color.accent,
  },
  logButtonInactive: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
  logButtonLabelActive: {
    color: color.accentInk,
  },
  logButtonLabelInactive: {
    color: color.text3,
  },
  resetButton: {
    flex: 1,
    height: LOG_BUTTON_HEIGHT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
});
