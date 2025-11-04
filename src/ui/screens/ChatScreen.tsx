import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenHeader from '../components/ScreenHeader';
import ScreenContainer from '../components/ScreenContainer';
import { spacing, radii, typography, shadows, fontFamilies } from '../theme/tokens';
import type { MainTabsParamList, RootStackParamList } from '../../navigation/types';
import { aiTutorService } from '../../services/container';
import { useOfflineStore } from '../../state/offline.store';
import { useBankStore } from '../../state/bank.store';
import { useNotesStore } from '../../state/notes.store';
import { useMemoryStore } from '../../state/memory.store';
import { useFolderStore } from '../../state/folder.store';
import { useTheme, type ThemeColors } from '../theme/theme';
import { useThemeStyles } from '../theme/useThemeStyles';

type ChatNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Chat'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ChatMode = 'dictionary' | 'tutor';

interface UserMessage {
  id: string;
  role: 'user';
  mode: ChatMode;
  content: string;
}

interface DictionaryMessage {
  id: string;
  role: 'assistant';
  mode: 'dictionary';
  headword: string;
  translation: string;
  definitions: string[];
  examples: string[];
  bankItemId?: string;
  savedToNotes?: boolean;
  folders: string[];
}

interface TutorMessage {
  id: string;
  role: 'assistant';
  mode: 'tutor';
  content: string;
  understood: boolean;
}

type ChatMessage = UserMessage | DictionaryMessage | TutorMessage;

const generateId = () => `chat-${Math.random().toString(36).slice(2, 10)}`;

const normaliseTerm = (value: string): string => value.trim().toLowerCase();

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatNavigation>();
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const [mode, setMode] = useState<ChatMode>('dictionary');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingBankIds, setPendingBankIds] = useState<Record<string, boolean>>({});
  const [pendingNoteIds, setPendingNoteIds] = useState<Record<string, boolean>>({});
  const [folderPicker, setFolderPicker] = useState<
    | { visible: true; messageId: string; selected: string[] }
    | { visible: false }
  >({ visible: false });
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);

  const isOffline = useOfflineStore(state => state.isOffline);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);
  const addBankItem = useBankStore(state => state.addBankItem);
  const removeBankItem = useBankStore(state => state.removeBankItem);
  const updateFolders = useBankStore(state => state.updateFolders);
  const createNote = useNotesStore(state => state.createNote);
  const logUnderstanding = useMemoryStore(state => state.logUnderstanding);
  const folders = useFolderStore(state => state.folders);
  const loadFolders = useFolderStore(state => state.loadFolders);
  const addFolder = useFolderStore(state => state.addFolder);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const composerInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadBank().catch(() => undefined);
  }, [loadBank]);

  useEffect(() => {
    loadFolders().catch(() => undefined);
  }, [loadFolders]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    setMessages(prev =>
      prev.map(message => {
        if (message.role !== 'assistant' || message.mode !== 'dictionary') {
          return message;
        }

        const existing = bankItems.find(
          item => normaliseTerm(item.term) === normaliseTerm(message.headword),
        );

        if (!existing) {
          if (!message.bankItemId) {
            return message;
          }
          return { ...message, bankItemId: undefined, folders: [] };
        }

        if (
          message.bankItemId === existing.id &&
          existing.folders.length === message.folders.length &&
          existing.folders.every(folder => message.folders.includes(folder))
        ) {
          return message;
        }

        return {
          ...message,
          bankItemId: existing.id,
          folders: existing.folders,
        };
      }),
    );
  }, [bankItems]);

  const hamburgerButton = (
    <Pressable
      onPress={() => setIsMenuOpen(true)}
      style={({ pressed }) => [
        styles.hamburgerButton,
        pressed && styles.hamburgerButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open quick shortcuts"
    >
      <View style={styles.hamburgerLine} />
      <View style={styles.hamburgerLine} />
      <View style={styles.hamburgerLine} />
    </Pressable>
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) {
      return;
    }

    const userMessage: UserMessage = {
      id: generateId(),
      role: 'user',
      mode,
      content: trimmed,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      if (mode === 'dictionary') {
        const translation = await aiTutorService.translate({
          text: trimmed,
          sourceLanguage: 'en',
          targetLanguage: 'ja',
        });
        const definitions = [`Literal: ${translation}`, `Usage: ${trimmed} → ${translation}`];
        const examples = [
          `Ex. 1: ${trimmed} (en)`,
          `Ex. 2: ${translation} (ja)`,
        ];

        const existing = bankItems.find(item =>
          item.term.toLowerCase() === trimmed.toLowerCase());

        const dictionaryMessage: DictionaryMessage = {
          id: generateId(),
          role: 'assistant',
          mode: 'dictionary',
          headword: trimmed,
          translation,
          definitions,
          examples,
          bankItemId: existing?.id,
          folders: existing?.folders ?? [],
        };

        setMessages(prev => [...prev, dictionaryMessage]);
      } else {
        const tutorResponse = [
          `Let's explore "${trimmed}".`,
          '• Form: highlight tense and grammar usage.',
          '• Compare with a related structure.',
          '• Try saying it in a different context.',
        ].join('\n');

        const tutorMessage: TutorMessage = {
          id: generateId(),
          role: 'assistant',
          mode: 'tutor',
          content: tutorResponse,
          understood: false,
        };

        setMessages(prev => [...prev, tutorMessage]);
      }
    } catch (error) {
      const tutorMessage: TutorMessage = {
        id: generateId(),
        role: 'assistant',
        mode: 'tutor',
        content: error instanceof Error ? error.message : 'Unable to process request.',
        understood: false,
      };
      setMessages(prev => [...prev, tutorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateDictionaryMessage = (
    id: string,
    updater: (message: DictionaryMessage) => DictionaryMessage,
  ) => {
    setMessages(prev =>
      prev.map(message => {
        if (
          message.id === id &&
          message.mode === 'dictionary' &&
          message.role === 'assistant'
        ) {
          return updater(message);
        }
        return message;
      }),
    );
  };

  const setBankPendingState = (messageId: string, pending: boolean) => {
    setPendingBankIds(prev => {
      const next = { ...prev };
      if (pending) {
        next[messageId] = true;
      } else {
        delete next[messageId];
      }
      return next;
    });
  };

  const setNotePendingState = (messageId: string, pending: boolean) => {
    setPendingNoteIds(prev => {
      const next = { ...prev };
      if (pending) {
        next[messageId] = true;
      } else {
        delete next[messageId];
      }
      return next;
    });
  };

  const addMessageToBank = async (message: DictionaryMessage) => {
    const entry = await addBankItem({
      term: message.headword,
      meaning: message.translation,
      examples: message.examples,
      folders: message.folders,
      level: 'A1',
    });

    let updatedMessage: DictionaryMessage | undefined;
    updateDictionaryMessage(message.id, prev => {
      updatedMessage = {
        ...prev,
        bankItemId: entry.id,
        folders: entry.folders,
      };
      return updatedMessage;
    });

    return updatedMessage ?? { ...message, bankItemId: entry.id, folders: entry.folders };
  };

  const removeMessageFromBank = async (message: DictionaryMessage) => {
    if (!message.bankItemId) {
      return message;
    }

    await removeBankItem(message.bankItemId);

    let updatedMessage: DictionaryMessage | undefined;
    updateDictionaryMessage(message.id, prev => {
      updatedMessage = {
        ...prev,
        bankItemId: undefined,
        folders: [],
        savedToNotes: prev.savedToNotes ? false : prev.savedToNotes,
      };
      return updatedMessage;
    });

    return updatedMessage ?? { ...message, bankItemId: undefined, folders: [] };
  };

  const ensureMessageInBank = async (
    message: DictionaryMessage,
    { suppressAlerts = false }: { suppressAlerts?: boolean } = {},
  ): Promise<DictionaryMessage | undefined> => {
    if (message.bankItemId) {
      return message;
    }

    if (isOffline) {
      if (!suppressAlerts) {
        Alert.alert('Offline', 'Reconnect to add words to your bank.');
      }
      return undefined;
    }

    setBankPendingState(message.id, true);
    try {
      return await addMessageToBank(message);
    } catch (error) {
      if (!suppressAlerts) {
        Alert.alert(
          'Unable to add',
          'We could not add this word to your bank. Please try again.',
        );
      }
      return undefined;
    } finally {
      setBankPendingState(message.id, false);
    }
  };

  const handleToggleBank = async (message: DictionaryMessage) => {
    if (message.bankItemId) {
      setBankPendingState(message.id, true);
      try {
        await removeMessageFromBank(message);
      } catch (error) {
        Alert.alert(
          'Unable to remove',
          'We could not remove this word from your bank. Please try again.',
        );
      } finally {
        setBankPendingState(message.id, false);
      }
      return;
    }

    await ensureMessageInBank(message);
  };

  const handleSaveToNotes = async (message: DictionaryMessage) => {
    if (message.savedToNotes) {
      return;
    }

    setNotePendingState(message.id, true);

    const ensured = await ensureMessageInBank(message);
    if (!ensured?.bankItemId) {
      setNotePendingState(message.id, false);
      return;
    }

    try {
      await createNote({
        title: ensured.headword ?? 'Clarification needed',
        content: `Native clarification needed for "${ensured.headword}" · ${ensured.translation}`,
        vocabItemId: ensured.bankItemId,
        sourceLanguage: 'en',
        answer: null,
      });
      updateDictionaryMessage(ensured.id, prev => ({
        ...prev,
        savedToNotes: true,
      }));
    } catch {
      Alert.alert('Unable to save note', 'Please try again in a moment.');
    } finally {
      setNotePendingState(message.id, false);
    }
  };

  const handleFolderPress = async (message: DictionaryMessage) => {
    setFolderError(null);
    setNewFolderName('');

    const ensured = await ensureMessageInBank(message);
    if (!ensured?.bankItemId) {
      return;
    }

    setFolderPicker({
      visible: true,
      messageId: ensured.id,
      selected: ensured.folders,
    });
  };

  const toggleFolderSelection = (folder: string) => {
    if (!folderPicker.visible) {
      return;
    }

    const nextSelected = folderPicker.selected.includes(folder)
      ? folderPicker.selected.filter(candidate => candidate !== folder)
      : [...folderPicker.selected, folder];

    setFolderPicker({
      visible: true,
      messageId: folderPicker.messageId,
      selected: nextSelected,
    });
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setFolderError('Enter a folder name to continue.');
      return;
    }

    try {
      const createdName = await addFolder(trimmed);
      setFolderError(null);
      setNewFolderName('');
      if (folderPicker.visible) {
        const nextSelected = folderPicker.selected.includes(createdName)
          ? folderPicker.selected
          : [...folderPicker.selected, createdName];
        setFolderPicker({
          visible: true,
          messageId: folderPicker.messageId,
          selected: nextSelected,
        });
      }
    } catch (error) {
      setFolderError(
        error instanceof Error ? error.message : 'Unable to create folder.',
      );
    }
  };

  const confirmFolderSelection = async () => {
    if (!folderPicker.visible) {
      return;
    }

    const message = messages.find(
      m =>
        m.id === folderPicker.messageId &&
        m.mode === 'dictionary' &&
        m.role === 'assistant',
    ) as DictionaryMessage | undefined;

    if (!message || !message.bankItemId) {
      setFolderPicker({ visible: false });
      return;
    }

    try {
      await updateFolders(message.bankItemId, folderPicker.selected);
      updateDictionaryMessage(message.id, prev => ({
        ...prev,
        folders: folderPicker.selected,
      }));
    } catch {
      Alert.alert('Unable to update folders', 'Please try again.');
    } finally {
      setFolderPicker({ visible: false });
      setFolderError(null);
      setNewFolderName('');
    }
  };

  const markUnderstood = (message: TutorMessage) => {
    if (message.understood) {
      return;
    }
    const recentUserPrompt = [...messages]
      .reverse()
      .find(entry => entry.role === 'user') as UserMessage | undefined;
    logUnderstanding({
      prompt: recentUserPrompt?.content ?? 'Tutor reflection',
      response: message.content,
      summary: `Understood ${new Date().toLocaleTimeString()}`,
    });

    setMessages(prev =>
      prev.map(item =>
        item.id === message.id && item.mode === 'tutor'
          ? { ...item, understood: true }
          : item,
      ),
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      );
    }

    if (item.mode === 'tutor') {
      return (
        <View style={styles.tutorBubble}>
          <Text style={styles.tutorText}>{item.content}</Text>
          <Pressable
            onPress={() => markUnderstood(item)}
            style={[
              styles.understoodChip,
              item.understood && styles.understoodChipActive,
            ]}
          >
            <Text
              style={[
                styles.understoodLabel,
                item.understood && styles.understoodLabelActive,
              ]}
            >
              {item.understood ? 'Logged to memory graph' : 'Understood · Log'}
            </Text>
          </Pressable>
        </View>
      );
    }

    const isBankPending = pendingBankIds[item.id] ?? false;
    const isNotePending = pendingNoteIds[item.id] ?? false;
    const isFolderDisabled = isBankPending || isNotePending;

    return (
      <View style={styles.dictionaryCard}>
        <View style={styles.dictionaryHeader}>
          <View>
            <Text style={styles.dictionaryHeadword}>{item.headword}</Text>
            <Text style={styles.dictionaryMeta}>noun · neutral · global</Text>
          </View>
          <Text style={styles.dictionaryTranslation}>{item.translation}</Text>
        </View>
        <View style={styles.dictionaryBody}>
          {item.definitions.map((definition, index) => (
            <Text key={definition} style={styles.dictionaryDefinition}>
              {index + 1}. {definition}
            </Text>
          ))}
          <Text style={styles.dictionaryExamplesLabel}>Usage examples</Text>
          {item.examples.map(example => (
            <Text key={example} style={styles.dictionaryExample}>
              • {example}
            </Text>
          ))}
        </View>
        <View style={styles.dictionaryActions}>
          <Pressable
            onPress={() => handleToggleBank(item)}
            style={({ pressed }) => [
              styles.dictionaryActionButton,
              item.bankItemId && styles.dictionaryActionButtonActive,
              pressed && styles.dictionaryActionButtonPressed,
              isBankPending && styles.dictionaryActionButtonDisabled,
            ]}
            disabled={isBankPending}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.dictionaryActionLabel,
                item.bankItemId && styles.dictionaryActionLabelActive,
                isBankPending && styles.dictionaryActionLabelDisabled,
              ]}
            >
              {isBankPending ? 'Working...' : item.bankItemId ? 'Remove' : 'Add'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleFolderPress(item)}
            style={({ pressed }) => [
              styles.dictionaryActionButton,
              pressed && styles.dictionaryActionButtonPressed,
              isFolderDisabled && styles.dictionaryActionButtonDisabled,
            ]}
            disabled={isFolderDisabled}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.dictionaryActionLabel,
                isFolderDisabled && styles.dictionaryActionLabelDisabled,
              ]}
            >
              Folder
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleSaveToNotes(item)}
            style={({ pressed }) => [
              styles.dictionaryActionButton,
              item.savedToNotes && styles.dictionaryActionButtonActive,
              pressed && styles.dictionaryActionButtonPressed,
              (isNotePending || isBankPending) && styles.dictionaryActionButtonDisabled,
            ]}
            disabled={item.savedToNotes || isNotePending || isBankPending}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.dictionaryActionLabel,
                item.savedToNotes && styles.dictionaryActionLabelActive,
                (item.savedToNotes || isNotePending || isBankPending) &&
                  styles.dictionaryActionLabelDisabled,
              ]}
            >
              {item.savedToNotes
                ? 'Saved'
                : isNotePending
                ? 'Saving...'
                : 'NN'}
            </Text>
          </Pressable>
        </View>
        {item.folders.length > 0 ? (
          <View style={styles.folderRow}>
            {item.folders.map(folder => (
              <View key={folder} style={styles.folderChip}>
                <Text style={styles.folderLabel}>{folder}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const shortcutItems = useMemo(
    () => [
      {
        id: 'translation',
        label: 'Translation Practice',
        action: () => navigation.navigate('Activities'),
      },
      {
        id: 'flashcards',
        label: 'Flashcards',
        action: () => navigation.navigate('Activities'),
      },
      {
        id: 'writing',
        label: 'Writing Prompts',
        action: () => navigation.navigate('Activities'),
      },
      {
        id: 'games',
        label: 'Games',
        action: () => navigation.navigate('Activities'),
      },
      {
        id: 'home',
        label: 'Home',
        action: () => navigation.navigate('Home'),
      },
    ],
    [navigation],
  );

  const canCreateFolder = newFolderName.trim().length > 0;

  useFocusEffect(
    React.useCallback(() => {
      const timeout = setTimeout(() => {
        composerInputRef.current?.focus();
      }, 75);
      return () => clearTimeout(timeout);
    }, []),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScreenHeader
        title="Dictionary + Tutor"
        onProfilePress={() => navigation.navigate('Settings')}
        leftAccessory={hamburgerButton}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            isProcessing ? (
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            ) : null
          }
        />

        <View style={styles.composer}>
          <View style={styles.modeToggleRow}>
            <Pressable
              onPress={() => setMode('dictionary')}
              style={[
                styles.modeToggleButton,
                mode === 'dictionary' && styles.modeToggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modeToggleLabel,
                  mode === 'dictionary' && styles.modeToggleLabelActive,
                ]}
              >
                Dictionary
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('tutor')}
              style={[
                styles.modeToggleButton,
                mode === 'tutor' && styles.modeToggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modeToggleLabel,
                  mode === 'tutor' && styles.modeToggleLabelActive,
                ]}
              >
                Tutor
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              ref={composerInputRef}
              style={styles.input}
              placeholder={
                mode === 'dictionary'
                  ? 'Enter word or phrase to look up…'
                  : 'Ask your tutor…'
              }
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              multiline
            />
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.sendButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Text style={styles.sendLabel}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        transparent
        animationType="fade"
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setIsMenuOpen(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Quick Shortcuts</Text>
            {shortcutItems.map(item => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setIsMenuOpen(false);
                  item.action();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={folderPicker.visible}
        onRequestClose={() => {
          setFolderPicker({ visible: false });
          setFolderError(null);
          setNewFolderName('');
        }}
      >
        <View style={styles.folderOverlay}>
          <View style={styles.folderSheet}>
            <Text style={styles.folderTitle}>Add to folder</Text>
            <Text style={styles.folderSubtitle}>
              Tap a folder to assign this word or create a new one below.
            </Text>
            <View style={styles.folderChipRow}>
              {folders.length === 0 ? (
                <Text style={styles.folderEmptyLabel}>
                  No folders yet. Create one to get started.
                </Text>
              ) : (
                folders.map(option => (
                  <Pressable
                    key={option}
                  onPress={() => toggleFolderSelection(option)}
                    style={[
                      styles.folderChip,
                      folderPicker.visible &&
                        folderPicker.selected.includes(option) &&
                        styles.folderChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.folderChipLabel,
                        folderPicker.visible &&
                          folderPicker.selected.includes(option) &&
                          styles.folderChipLabelActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
            <View style={styles.folderCreateRow}>
              <TextInput
                value={newFolderName}
                onChangeText={text => {
                  setFolderError(null);
                  setNewFolderName(text);
                }}
                placeholder="New folder name"
                placeholderTextColor={colors.textSecondary}
                style={styles.folderCreateInput}
                autoCapitalize="words"
              />
              <Pressable
                onPress={handleCreateFolder}
                style={[
                  styles.folderCreateButton,
                  !canCreateFolder && styles.folderCreateButtonDisabled,
                ]}
                disabled={!canCreateFolder}
              >
                <Text
                  style={[
                    styles.folderCreateButtonLabel,
                    !canCreateFolder && styles.folderCreateButtonLabelDisabled,
                  ]}
                >
                  Create
                </Text>
              </Pressable>
            </View>
            {folderError ? <Text style={styles.folderError}>{folderError}</Text> : null}
            <View style={styles.folderActions}>
              <Pressable
                onPress={() => {
                  setFolderPicker({ visible: false });
                  setFolderError(null);
                  setNewFolderName('');
                }}
                style={styles.folderCancel}
              >
                <Text style={styles.folderCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmFolderSelection} style={styles.folderConfirm}>
                <Text style={styles.folderConfirmLabel}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

export default ChatScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    listContent: {
      paddingBottom: spacing.block,
      paddingHorizontal: spacing.screenHorizontal,
      gap: 16,
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
      borderRadius: radii.surface,
      padding: 12,
      maxWidth: '80%',
    },
    userText: {
      ...typography.body,
      color: colors.textOnAccent,
    },
    tutorBubble: {
      alignSelf: 'flex-start',
      maxWidth: '88%',
      backgroundColor: colors.surface,
      borderRadius: radii.surface,
      padding: 16,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    tutorText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    understoodChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    understoodChipActive: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    understoodLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    understoodLabelActive: {
      color: colors.textOnAccent,
    },
    dictionaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.surface,
      padding: 16,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    dictionaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    dictionaryHeadword: {
      fontSize: 24,
      lineHeight: 32,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    dictionaryMeta: {
      ...typography.caption,
      fontStyle: 'italic',
      color: colors.textSecondary,
      marginTop: 4,
    },
    dictionaryTranslation: {
      ...typography.subhead,
      color: colors.accent,
    },
    dictionaryBody: {
      gap: 8,
    },
    dictionaryDefinition: {
      ...typography.body,
      color: colors.textPrimary,
    },
    dictionaryExamplesLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    dictionaryExample: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    dictionaryActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    dictionaryActionButton: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 8,
      alignItems: 'center',
    },
    dictionaryActionButtonPressed: {
      opacity: 0.85,
    },
    dictionaryActionButtonDisabled: {
      opacity: 0.5,
    },
    dictionaryActionButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dictionaryActionLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    dictionaryActionLabelActive: {
      color: colors.textOnAccent,
    },
    dictionaryActionLabelDisabled: {
      opacity: 0.6,
    },
    folderRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    folderChip: {
      borderRadius: radii.control,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    folderLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    typingIndicator: {
      flexDirection: 'row',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radii.control,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textSecondary,
    },
    composer: {
      paddingTop: 12,
      paddingHorizontal: spacing.screenHorizontal,
      paddingBottom: spacing.block / 2,
      gap: 12,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    modeToggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.surface,
      padding: 6,
      gap: 6,
    },
    modeToggleButton: {
      flex: 1,
      borderRadius: radii.control,
      alignItems: 'center',
      paddingVertical: 10,
    },
    modeToggleButtonActive: {
      backgroundColor: colors.accent,
    },
    modeToggleLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    modeToggleLabelActive: {
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    sendButton: {
      borderRadius: radii.surface,
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    sendButtonPressed: {
      opacity: 0.85,
    },
    sendLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    hamburgerButton: {
      width: 36,
      height: 36,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: colors.surface,
    },
    hamburgerButtonPressed: {
      opacity: 0.85,
    },
    hamburgerLine: {
      width: 18,
      height: 2,
      backgroundColor: colors.textPrimary,
      borderRadius: 1,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.screenHorizontal,
    },
    menuCard: {
      width: '100%',
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      padding: 24,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    menuTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    menuItem: {
      paddingVertical: 14,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    menuItemPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    menuItemLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    folderOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    folderSheet: {
      backgroundColor: colors.surface,
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    folderTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    folderSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    folderEmptyLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
      textAlign: 'center',
    },
    folderChip: {
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    folderChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    folderChipLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderChipLabelActive: {
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
    folderCreateRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    folderCreateInput: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...typography.caption,
      color: colors.textPrimary,
      backgroundColor: colors.surfaceMuted,
    },
    folderCreateButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.control,
      backgroundColor: colors.accent,
    },
    folderCreateButtonDisabled: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    folderCreateButtonLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    folderCreateButtonLabelDisabled: {
      color: colors.textSecondary,
    },
    folderError: {
      ...typography.caption,
      color: colors.error,
    },
    folderActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    folderCancel: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    folderCancelLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    folderConfirm: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: radii.control,
      backgroundColor: colors.accent,
    },
    folderConfirmLabel: {
      ...typography.bodyStrong,
      color: colors.textOnAccent,
    },
  });
