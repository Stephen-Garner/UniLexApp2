import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Image, StyleSheet, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { fontFamilies } from '@/shared/theme/tokens';
import type { RootStackParamList, MainTabsParamList } from '@/navigation/types';
import OfflineBanner from '@/shared/components/OfflineBanner';
import HomeScreen from '@/features/home/screens/HomeScreen';
import ChatScreen from '@/features/chat/screens/ChatScreen';
import WordBankScreen from '@/features/word-bank/screens/WordBankScreen';
import ActivitiesScreen from '@/features/activities/screens/ActivitiesScreen';
import NativeNotesScreen from '@/features/native-notes/screens/NativeNotesScreen';
import ProgressDashboardScreen from '@/features/progress/screens/ProgressDashboardScreen';
import WordDetailScreen from '@/features/word-bank/screens/WordDetailScreen';
import FolderDetailScreen from '@/features/word-bank/screens/FolderDetailScreen';
import NoteDetailScreen from '@/features/native-notes/screens/NoteDetailScreen';
import CreateNoteScreen from '@/features/native-notes/screens/CreateNoteScreen';
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import TranslationPracticeScreen from '@/features/translation/screens/TranslationPracticeScreen';
import FlashcardTrainingScreen from '@/features/flashcards/screens/FlashcardTrainingScreen';
import { navigationRef } from './navigationRef';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

type TabIconConfig = {
  default: ImageSourcePropType;
  active: ImageSourcePropType;
};

const tabIcons: Record<keyof MainTabsParamList, TabIconConfig> = {
  Home: {
    default: require('../../../assets/icons/home-line.png'),
    active: require('../../../assets/icons/home-fill.png'),
  },
  Chat: {
    default: require('../../../assets/icons/chat-ai-4-line.png'),
    active: require('../../../assets/icons/chat-ai-4-fill.png'),
  },
  WordBank: {
    default: require('../../../assets/icons/archive-drawer-line.png'),
    active: require('../../../assets/icons/archive-drawer-fill.png'),
  },
  Activities: {
    default: require('../../../assets/icons/brain-2-line.png'),
    active: require('../../../assets/icons/brain-2-fill.png'),
  },
  NativeNotes: {
    default: require('../../../assets/icons/booklet-line.png'),
    active: require('../../../assets/icons/booklet-fill.png'),
  },
};

const HeaderIconButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { mode } = useTheme();
  const tintStyle = mode === 'dark' ? styles.headerIconGlyphDark : styles.headerIconGlyphLight;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open profile and settings"
      style={styles.headerIconButton}
      onPress={onPress}
    >
      <Image
        source={require('../../../assets/icons/settings-line.png')}
        style={[styles.headerIconGlyph, tintStyle]}
      />
    </TouchableOpacity>
  );
};

const handleProfilePress = () => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Settings');
  }
};

const headerRight: NativeStackNavigationOptions['headerRight'] = () => (
  <HeaderIconButton onPress={handleProfilePress} />
);

const createDetailOptions = (title: string): NativeStackNavigationOptions => ({
  headerShown: true,
  title,
  headerRight,
  headerTitleStyle: {
    fontFamily: fontFamilies.serif.semibold,
  },
});

const TabBarIcon: React.FC<{ focused: boolean; icon: TabIconConfig; tint: { active: string; inactive: string } }> = ({
  focused,
  icon,
  tint,
}) => (
  <Image
    source={focused ? icon.active : icon.default}
    style={[styles.tabIcon, focused ? { tintColor: tint.active } : { tintColor: tint.inactive }]}
  />
);

const MainTabs: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const icon = tabIcons[route.name as keyof MainTabsParamList];

        return {
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.background,
            borderTopColor: 'transparent',
          },
        ],
        headerTitleStyle: {
          fontFamily: fontFamilies.serif.semibold,
        },
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused }) => (
          <TabBarIcon focused={focused} icon={icon} tint={{ active: colors.accent, inactive: colors.textSecondary }} />
        ),
      };
    }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="WordBank" component={WordBankScreen} options={{ title: 'Word Bank' }} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="NativeNotes" component={NativeNotesScreen} options={{ title: 'Native Notes' }} />
    </Tab.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.appContainer, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen
          name="ProgressDashboard"
          component={ProgressDashboardScreen}
          options={createDetailOptions('Progress Dashboard')}
        />
        <RootStack.Screen
          name="WordDetail"
          component={WordDetailScreen}
          options={createDetailOptions('Word Detail')}
        />
        <RootStack.Screen
          name="FolderDetail"
          component={FolderDetailScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="NoteDetail"
          component={NoteDetailScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="CreateNote"
          component={CreateNoteScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: 'Profile & Settings',
          }}
        />
        <RootStack.Screen
          name="TranslationPractice"
          component={TranslationPracticeScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="FlashcardTraining"
          component={FlashcardTrainingScreen}
          options={{ headerShown: false }}
        />
      </RootStack.Navigator>
    </View>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  tabBar: {
    height: 72,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  tabIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerIconGlyph: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  headerIconGlyphLight: {
    tintColor: '#000000',
  },
  headerIconGlyphDark: {
    tintColor: '#FFFFFF',
  },
});
