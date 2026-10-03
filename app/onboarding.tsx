import { IconArrowUp, IconChevronLeft } from '@tabler/icons-react-native';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BuildingScreen from '@/components/BuildingScreen';
import PatternsMark from '@/components/PatternsMark';
import {
  FALLBACK_CONFIG,
  isOnboardingComplete,
  saveTrackerConfig,
  setOnboardingComplete,
} from '@/storage/storage';
import {
  color,
  font,
  fontSize,
  letterSpacing,
  lineHeight,
  radius,
  space,
} from '@/theme/theme';
import { normalizeCustomModuleProps } from '@/components/modules/CustomModule';
import type {
  ConversationStage,
  Message,
  ModuleType,
  TrackerConfig,
  TrackerModule,
} from '@/types';
import { colorWithOpacity } from '@/utils/colorWithOpacity';
import { generateId } from '@/utils/generateId';
import { stripMarkdown } from '@/utils/stripMarkdown';

// The system prompt, model and token limits live on the server (worker/worker.js),
// so the browser only sends the conversation. This keeps the endpoint locked down.

const MAX_ONBOARDING_EXCHANGES = 6;
const MAX_MESSAGE_LENGTH = 500;

const INITIAL_AI_MESSAGE =
  'Hey — what do you want to keep an eye on? It can be anything: a symptom, a habit, a pet, a plant.';

const INITIAL_QUICK_REPLIES = [
  'A symptom',
  'A habit',
  'A pet or animal',
  'Something else',
];

const BUBBLE_RADIUS = 14;

function formatTimestamp(date: Date): string {
  return date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toUpperCase();
}

function buildConversationText(
  messages: Message[],
  latestResponse?: string,
): string {
  const parts = messages
    .filter((message) => message.role === 'ai' && message.text)
    .map((message) => message.text!);

  if (latestResponse) {
    parts.push(latestResponse);
  }

  return parts.join('\n');
}

function extractConfigBlockContent(text: string): string | null {
  const closedMatch = text.match(/<config>([\s\S]*?)<\/config>/i);
  if (closedMatch) {
    return closedMatch[1].trim();
  }

  const openMatch = text.match(/<config>([\s\S]*)$/i);
  if (openMatch) {
    return openMatch[1].trim();
  }

  return null;
}

function hasRequiredConfigFields(value: unknown): value is TrackerConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const terminology = record.terminology;

  return (
    typeof record.profile === 'string' &&
    record.profile.length > 0 &&
    Array.isArray(record.modules) &&
    terminology !== null &&
    typeof terminology === 'object'
  );
}

const MODULE_TYPE_ALIASES: Record<string, ModuleType | null> = {
  MedicalModule: 'medical',
  MetricsModule: 'metrics',
  FoodModule: 'food',
  EnvironmentModuleExtended: 'environmentExtended',
  SleepModule: 'sleep',
  FitnessModule: 'fitness',
  PetModule: 'pet',
  MentalWellbeingModule: 'mentalWellbeing',
  HobbiesModule: 'hobbies',
  AcademicModule: 'academic',
  PlantModule: 'plant',
  BabyModule: 'baby',
  SocialModule: 'social',
  ScaleSelector: 'scale',
  YesNoToggle: 'toggle',
  LevelSelector: 'level',
  QuickLogChips: 'chips',
  NoteInput: 'note',
  TimeBlockPicker: 'timeInput',
  CorrelationChart: 'correlationChart',
  CounterInput: 'counter',
  MultiSelectChips: 'multiselect',
  PhotoLog: 'photo',
  DiaryModule: 'diary',
  MealDraftModule: 'mealdraft',
  ChecklistModule: 'checklist',
  WeightModule: 'weight',
  TimerModule: 'timer',
  EnvironmentModule: 'environment',
  CustomModule: 'custom',
  WeeklyBarChart: null,
  StatusCard: null,
};

function normalizeModuleType(type: string): ModuleType | null {
  const alias = MODULE_TYPE_ALIASES[type];
  if (alias !== undefined) {
    return alias;
  }

  return type as ModuleType;
}

function normalizePartialConfig(partial: TrackerConfig): TrackerConfig {
  const validModules = (partial.modules ?? [])
    .filter(
      (module) =>
        module &&
        typeof module === 'object' &&
        typeof module.type === 'string',
    )
    .map((module) => {
      const normalizedType = normalizeModuleType(module.type);
      if (!normalizedType) {
        return null;
      }

      if (normalizedType === 'custom') {
        const normalizedProps = normalizeCustomModuleProps(
          (module.props ?? {}) as Record<string, unknown>,
        );

        if (!normalizedProps) {
          return null;
        }

        return {
          ...module,
          type: normalizedType,
          props: normalizedProps,
        } as TrackerModule;
      }

      return {
        ...module,
        type: normalizedType,
      } as TrackerModule;
    })
    .filter((module): module is TrackerModule => module !== null);

  // Notes and Diary are standard on every tracker. Enforce it here so a long or
  // truncated reply can never drop them (the Diary is last, so it is lost first).
  const diaryModule = validModules.find((module) => module.type === 'diary');
  const withoutDiary = validModules.filter((module) => module.type !== 'diary');

  if (!withoutDiary.some((module) => module.type === 'note')) {
    withoutDiary.push({ type: 'note', props: {} } as TrackerModule);
  }

  const orderedModules: TrackerModule[] = [
    ...withoutDiary,
    (diaryModule ?? { type: 'diary', props: {} }) as TrackerModule,
  ];

  const eventRows = Array.isArray(partial.eventRows)
    ? partial.eventRows.filter((row): row is string => typeof row === 'string')
    : [];

  return {
    profile: partial.profile,
    ...(typeof partial.name === 'string' && partial.name.trim()
      ? { name: partial.name.trim().slice(0, 30) }
      : {}),
    subject: partial.subject ?? partial.terminology?.subject ?? 'you',
    trackingGoal: partial.trackingGoal ?? 'Track daily patterns',
    modules: orderedModules,
    terminology: {
      subject: partial.terminology?.subject ?? 'you',
      event: partial.terminology?.event ?? 'entry',
      mealDraft: partial.terminology?.mealDraft ?? 'MEAL',
      timerSession: partial.terminology?.timerSession ?? 'SESSION',
      pdfRecipient: partial.terminology?.pdfRecipient ?? 'GP',
    },
    aiContext: partial.aiContext ?? '',
    ...(eventRows.length > 0 ? { eventRows } : {}),
  };
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function repairTruncatedJson(text: string, depth = 0): unknown | null {
  if (depth > 4) {
    return null;
  }

  let attempt = text.trim().replace(/,\s*$/, '');

  const openBraces = (attempt.match(/\{/g) || []).length;
  const closeBraces = (attempt.match(/\}/g) || []).length;
  const openBrackets = (attempt.match(/\[/g) || []).length;
  const closeBrackets = (attempt.match(/\]/g) || []).length;

  let repair = attempt;
  for (let i = 0; i < openBrackets - closeBrackets; i += 1) {
    repair += ']';
  }
  for (let i = 0; i < openBraces - closeBraces; i += 1) {
    repair += '}';
  }

  const parsed = tryParseJson(repair);
  if (parsed) {
    return parsed;
  }

  const stripped = attempt.replace(/,?\s*"[^"]*"?\s*:?\s*"?[^"}\]]*$/, '');
  if (stripped !== attempt) {
    return repairTruncatedJson(stripped, depth + 1);
  }

  return null;
}

function extractConfigFromText(text: string): TrackerConfig | null {
  const blockContent = extractConfigBlockContent(text);
  if (!blockContent) {
    return null;
  }

  const cleaned = stripMarkdown(blockContent);
  const parsed = tryParseJson(cleaned) ?? repairTruncatedJson(cleaned);

  if (hasRequiredConfigFields(parsed)) {
    return normalizePartialConfig(parsed);
  }

  return null;
}

function stripConfigBlockFromDisplay(text: string): string {
  return text
    .replace(/<config>[\s\S]*?<\/config>/gi, '')
    .replace(/<config>[\s\S]*$/i, '')
    .trim();
}

function extractResponseText(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return '';
  }

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.content)) {
    return obj.content
      .map((block) => {
        if (block && typeof block === 'object' && 'text' in block) {
          return String((block as { text: string }).text);
        }
        return '';
      })
      .join('');
  }

  if (obj.payload && typeof obj.payload === 'object') {
    return extractResponseText(obj.payload);
  }

  if (typeof obj.text === 'string') {
    return obj.text;
  }
  if (typeof obj.message === 'string') {
    return obj.message;
  }
  if (typeof obj.content === 'string') {
    return obj.content;
  }

  return '';
}

function buildConversationHistory(
  messages: Message[],
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((message) => message.text && !message.isConfig)
    .map((message) => ({
      role: message.role === 'ai' ? 'assistant' : 'user',
      content: message.text!,
    }));
}

class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`API error: ${status}`);
    this.status = status;
  }
}

const BUDGET_MESSAGE =
  "The demo's AI budget looks to be used up for now, so chat is paused. You can still build a tracker yourself with the solo builder. Tap the gear to start again.";

async function callOnboardingAPI(
  history: { role: 'user' | 'assistant'; content: string }[],
  kind: 'chat' | 'config' = 'chat',
): Promise<string> {
  const url =
    process.env.EXPO_PUBLIC_AI_PROXY_URL ?? 'https://patterns-api.insightio.co.uk';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, messages: history }),
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  const data = await response.json();
  return extractResponseText(data);
}

// Config generation: try once more if the call fails or the reply has no usable config.
async function requestConfigText(
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  let lastText = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      lastText = await callOnboardingAPI(history, 'config');
      if (extractConfigFromText(lastText)) {
        return lastText;
      }
    } catch (error) {
      if (attempt === 1 || (error instanceof ApiError && error.status < 500 && error.status !== 429)) {
        throw error;
      }
    }
  }
  return lastText;
}

function AiAvatar() {
  return (
    <View style={styles.avatar}>
      <View style={styles.avatarDot} />
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      );

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);

    animation.start();
    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.messageRowAi}>
      <AiAvatar />
      <View style={styles.aiBubble}>
        <View style={styles.typingDots}>
          {[dot1, dot2, dot3].map((dot, index) => (
            <Animated.Text
              key={index}
              style={[styles.typingDot, { opacity: dot }]}>
              •
            </Animated.Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function ConfigPill({
  label,
  primary = false,
}: {
  label: string;
  primary?: boolean;
}) {
  return (
    <View style={styles.configPill}>
      <Text style={[styles.configPillText, primary && styles.configPillPrimary]}>
        {label}
      </Text>
    </View>
  );
}

function TrackerConfigCard({ config }: { config: TrackerConfig }) {
  const chipsModule = config.modules.find((module) => module.type === 'chips');
  const chipItems = Array.isArray(chipsModule?.props.items)
    ? (chipsModule.props.items as string[])
    : [];
  const watchingValues = chipItems.length > 0 ? chipItems : ['None yet'];

  return (
    <View style={styles.configCard}>
      <View style={styles.configHeader}>
        <View style={styles.configHeaderLeft}>
          <View style={styles.configHeaderDot} />
          <Text style={styles.configHeaderLabel}>TRACKER</Text>
        </View>
        <View style={styles.draftPill}>
          <Text style={styles.draftPillText}>DRAFT</Text>
        </View>
      </View>

      <View style={styles.configDivider} />

      <View style={styles.configRow}>
        <Text style={styles.configRowLabel}>SUBJECT</Text>
        <View style={styles.configRowValues}>
          <ConfigPill label={config.terminology.subject} />
        </View>
      </View>

      <View style={styles.configRow}>
        <Text style={styles.configRowLabel}>TRACKING</Text>
        <View style={styles.configRowValues}>
          <ConfigPill label={config.trackingGoal} primary />
        </View>
      </View>

      <View style={styles.configRow}>
        <Text style={styles.configRowLabel}>WATCHING</Text>
        <View style={styles.configRowValues}>
          {watchingValues.map((item, index) => (
            <ConfigPill key={`${item}-${index}`} label={item} />
          ))}
        </View>
      </View>

      <View style={styles.configRow}>
        <Text style={styles.configRowLabel}>MODULES</Text>
        <View style={styles.configRowValues}>
          {config.modules.map((module, index) => (
            <ConfigPill key={`${module.type}-${index}`} label={module.type} />
          ))}
        </View>
      </View>
    </View>
  );
}

function MessageItem({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <View style={styles.messageRowUser}>
        <View style={styles.userBubble}>
          <Text style={styles.bubbleText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.messageRowAi}>
      <AiAvatar />
      <View style={styles.aiContent}>
        {message.isConfig && message.config ? (
          <TrackerConfigCard config={message.config} />
        ) : message.isSetupConfirmation ? (
          <Text style={styles.setupConfirmationText}>{message.text}</Text>
        ) : (
          <View style={styles.aiBubble}>
            <Text style={styles.bubbleText}>{message.text}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [conversationStage, setConversationStage] =
    useState<ConversationStage>('opening');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildReady, setBuildReady] = useState(false);
  const [showBackToFork, setShowBackToFork] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: generateId(),
          role: 'ai',
          text: INITIAL_AI_MESSAGE,
        },
      ]);
      setQuickReplies(INITIAL_QUICK_REPLIES);
      setConversationStage('opening');
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void isOnboardingComplete().then((complete) => {
      setShowBackToFork(!complete);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const showBuildingScreen = useCallback(() => {
    setConversationStage('complete');
    setQuickReplies([]);
    setBuildReady(false);
    setIsBuilding(true);
  }, []);

  // Shows the building screen straight away, saves the tracker, then lets the
  // screen move on to the home tab as soon as the tracker is really ready.
  const beginBuilding = useCallback(
    async (trackerConfig: TrackerConfig, rawConfigText?: string | null) => {
      showBuildingScreen();
      try {
        await saveTrackerConfig(trackerConfig);
        if (rawConfigText) {
          console.log('[PATTERNS CONFIG — RAW]', rawConfigText);
        }
        console.log(
          '[PATTERNS CONFIG — NORMALISED]',
          JSON.stringify(trackerConfig, null, 2),
        );
        await setOnboardingComplete();
      } catch {
        try {
          await saveTrackerConfig(FALLBACK_CONFIG);
          await setOnboardingComplete();
        } catch {
          // fail silently
        }
      }
      setBuildReady(true);
    },
    [showBuildingScreen],
  );

  const finishWithFallback = useCallback(async () => {
    await beginBuilding(FALLBACK_CONFIG);
  }, [beginBuilding]);

  const handleAiResponse = useCallback(
    async (
      responseText: string,
      currentMessages: Message[],
      expectConfig = false,
    ) => {
      const fullConversationText = buildConversationText(
        currentMessages,
        responseText,
      );
      const rawConfigText = extractConfigBlockContent(fullConversationText);
      const config = extractConfigFromText(fullConversationText);
      const displayText = stripConfigBlockFromDisplay(responseText);
      const isReady = /<ready\s*\/?>/i.test(responseText);

      if (config) {
        await beginBuilding(config, rawConfigText);
      } else if (isReady && !expectConfig) {
        // Claude has enough: say so, then show the building screen immediately
        // while the (slow) config is generated in a second request.
        const confirmation = displayText.replace(/<ready\s*\/?>/gi, '').trim();
        const readyMessages: Message[] = confirmation
          ? [
              ...currentMessages,
              { id: generateId(), role: 'ai', text: confirmation },
            ]
          : currentMessages;

        if (confirmation) {
          setMessages(readyMessages);
        }

        const configRequest = requestConfigText([
          ...buildConversationHistory(readyMessages),
          {
            role: 'user' as const,
            content:
              'SYSTEM: Generate the config now based on everything discussed. Output only the <config> block.',
          },
        ]);

        // Give the user time to read the confirmation before the building screen.
        await new Promise((resolve) => setTimeout(resolve, 2800));
        showBuildingScreen();

        try {
          const configText = await configRequest;
          await handleAiResponse(configText, readyMessages, true);
        } catch {
          await finishWithFallback();
        }
      } else if (expectConfig) {
        await finishWithFallback();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'ai',
            text:
              displayText ||
              "Sorry — I didn't catch that. Could you try again?",
          },
        ]);
      }
      setTimeout(() => scrollToBottom(), 150);
    },
    [beginBuilding, finishWithFallback, scrollToBottom, showBuildingScreen],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) {
        return;
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        text: trimmed,
        timestamp: formatTimestamp(new Date()),
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInputText('');
      inputRef.current?.focus();
      setQuickReplies([]);

      const userTurnCount = nextMessages.filter((m) => m.role === 'user').length;
      if (userTurnCount === 1) {
        setConversationStage('goal');
      } else if (userTurnCount === 2) {
        setConversationStage('inputs');
      }

      if (userTurnCount >= MAX_ONBOARDING_EXCHANGES) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'ai',
            text: "Let me put together your tracker config based on what you've told me so far.",
          },
        ]);

        const forceConfigHistory = [
          ...buildConversationHistory(nextMessages),
          {
            role: 'user' as const,
            content:
              'SYSTEM: Generate the config now based on everything discussed.',
          },
        ];

        setIsTyping(true);
        const forcedRequest = requestConfigText(forceConfigHistory);
        forcedRequest.catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 2500));
        showBuildingScreen();
        try {
          const responseText = await forcedRequest;
          await handleAiResponse(responseText, nextMessages, true);
        } catch {
          await finishWithFallback();
        } finally {
          setIsTyping(false);
        }
        return;
      }

      const typingTimer = setTimeout(() => setIsTyping(true), 300);

      try {
        const responseText = await callOnboardingAPI(
          buildConversationHistory(nextMessages),
        );
        await handleAiResponse(responseText, nextMessages);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'ai',
            text:
              error instanceof ApiError &&
              [402, 403, 429, 529].includes(error.status)
                ? BUDGET_MESSAGE
                : "I'm having trouble connecting right now. Check your connection and try again.",
          },
        ]);
      } finally {
        clearTimeout(typingTimer);
        setIsTyping(false);
        scrollToBottom();
        inputRef.current?.focus();
      }
    },
    [
      finishWithFallback,
      handleAiResponse,
      isTyping,
      messages,
      scrollToBottom,
      showBuildingScreen,
    ],
  );

  const handleSkip = async () => {
    try {
      await saveTrackerConfig(FALLBACK_CONFIG);
      await setOnboardingComplete();
      router.replace('/(tabs)/home');
    } catch {
      // fail silently
    }
  };

  const canSend = inputText.trim().length > 0 && !isTyping;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={color.bg} />

      {isBuilding ? (
        <BuildingScreen ready={buildReady} />
      ) : (
        <>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        {showBackToFork ? (
          <Pressable
            onPress={() => router.replace('/launch-fork' as Href)}
            hitSlop={space.sm}
            style={styles.backButton}>
            <IconChevronLeft size={24} color={color.text2} strokeWidth={1.5} />
          </Pressable>
        ) : null}
        <View style={styles.headerRow}>
          <View style={styles.wordmarkRow}>
            <View style={styles.wordmarkDot} />
            <Text style={styles.wordmarkText}>Patterns</Text>
          </View>
          <Pressable onPress={handleSkip} hitSlop={8}>
            <Text style={styles.skipText}>SKIP</Text>
          </Pressable>
        </View>

        <View style={styles.markHeader}>
          <PatternsMark />
        </View>

        <View style={styles.setupBadge}>
          <Text style={styles.setupBadgeText}>● PATTERNS AI · SETUP</Text>
        </View>

        <Text style={styles.tagline}>
          Answer a couple of questions and I'll build you a tracker.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          <View style={styles.messagesArea}>
            {messages.map((message, index) => {
              const showTimestamp =
                message.timestamp &&
                (index === 0 || messages[index - 1]?.role !== message.role);

              return (
                <View key={message.id}>
                  {showTimestamp ? (
                    <Text style={styles.timestamp}>{message.timestamp}</Text>
                  ) : null}
                  <MessageItem message={message} />
                </View>
              );
            })}
            {isTyping ? <TypingIndicator /> : null}
          </View>
        </ScrollView>

        {quickReplies.length > 0 ? (
          <ScrollView
            horizontal
            style={styles.chipsScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled">
            {quickReplies.map((chip, index) => {
              const isPrimary = index === 0;
              return (
                <Pressable
                  key={chip}
                  onPress={() => sendMessage(chip)}
                  style={[
                    styles.chip,
                    isPrimary ? styles.chipPrimary : styles.chipSecondary,
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      isPrimary ? styles.chipTextPrimary : styles.chipTextSecondary,
                    ]}>
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, space.sm) },
          ]}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Message Patterns…"
            placeholderTextColor={color.text3}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!isTyping}
            multiline={false}
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Pressable
            onPress={() => sendMessage(inputText)}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
            <IconArrowUp size={20} color={color.accentInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  wordmarkDot: {
    width: 10,
    height: 10,
    backgroundColor: color.accent,
  },
  wordmarkText: {
    fontFamily: font.uiSemiBold,
    fontSize: fontSize.wordmark,
    color: color.text1,
  },
  skipText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    letterSpacing: letterSpacing.monoMicro,
  },
  markHeader: {
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  setupBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: space.md,
  },
  setupBadgeText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  tagline: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text2,
    textAlign: 'center',
  },
  messagesArea: {
    flex: 1,
    gap: space.sm,
    justifyContent: 'flex-end',
    minHeight: 200,
  },
  timestamp: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    letterSpacing: letterSpacing.monoMicro,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginVertical: space.sm,
  },
  messageRowAi: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    marginBottom: space.sm,
  },
  messageRowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: space.sm,
  },
  avatar: {
    width: 26,
    height: 26,
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDot: {
    width: 8,
    height: 8,
    backgroundColor: color.accent,
  },
  aiContent: {
    flex: 1,
  },
  aiBubble: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    flexShrink: 1,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: colorWithOpacity(color.accent, 0.15),
    borderWidth: 1,
    borderColor: colorWithOpacity(color.accent, 0.38),
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: BUBBLE_RADIUS,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
  },
  bubbleText: {
    fontFamily: font.mono,
    fontSize: fontSize.body,
    color: color.text1,
    lineHeight: fontSize.body * lineHeight.body,
  },
  setupConfirmationText: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text3,
    lineHeight: fontSize.secondary * lineHeight.body,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    color: color.text3,
    fontSize: 18,
    letterSpacing: 4,
  },
  configCard: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.md,
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: 4,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  configHeaderDot: {
    width: 8,
    height: 8,
    backgroundColor: color.accent,
  },
  configHeaderLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text2,
    letterSpacing: letterSpacing.monoLabel,
  },
  draftPill: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftPillText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.accent,
  },
  configDivider: {
    height: 1,
    backgroundColor: color.border,
    marginVertical: 10,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.sm,
  },
  configRowLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    letterSpacing: letterSpacing.monoMicro,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  configRowValues: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: space.xs,
  },
  configPill: {
    backgroundColor: color.surface3,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 1,
    maxWidth: '100%',
  },
  configPillText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text2,
  },
  configPillPrimary: {
    color: color.accent,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    gap: space.sm,
  },
  chipsScroll: {
    height: 44,
    flexGrow: 0,
    backgroundColor: color.bg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  chipPrimary: {
    borderColor: colorWithOpacity(color.accent, 0.45),
    backgroundColor: colorWithOpacity(color.accent, 0.1),
  },
  chipSecondary: {
    borderColor: color.border,
    backgroundColor: 'transparent',
  },
  chipText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
  },
  chipTextPrimary: {
    color: color.accent,
  },
  chipTextSecondary: {
    color: color.text2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    fontFamily: font.ui,
    fontSize: fontSize.body,
    color: color.text1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: color.accent,
    opacity: 0.4,
  },
});
