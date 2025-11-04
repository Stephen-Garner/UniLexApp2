import React, { useEffect } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  DefaultTheme as NavigationLightTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Image,
  type TextStyle,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type {
  RootStackParamList,
  MainTabsParamList,
} from './src/navigation/types';
import OfflineBanner from './src/ui/components/OfflineBanner';
import HomeScreen from './src/ui/screens/HomeScreen';
import ChatScreen from './src/ui/screens/ChatScreen';
import WordBankScreen from './src/ui/screens/WordBankScreen';
import ActivitiesScreen from './src/ui/screens/ActivitiesScreen';
import NativeNotesScreen from './src/ui/screens/NativeNotesScreen';
import ProgressDashboardScreen from './src/ui/screens/ProgressDashboardScreen';
import WordDetailScreen from './src/ui/screens/WordDetailScreen';
import FolderDetailScreen from './src/ui/screens/FolderDetailScreen';
import NoteDetailScreen from './src/ui/screens/NoteDetailScreen';
import CreateNoteScreen from './src/ui/screens/CreateNoteScreen';
import SettingsScreen from './src/ui/screens/SettingsScreen';
import { offlineController } from './src/services/container';
import { setOfflineState } from './src/state/offline.store';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { ThemeProvider, useTheme } from './src/ui/theme/theme';
import { fontFamilies } from './src/ui/theme/tokens';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type TabIconConfig = {
  default: ImageSourcePropType;
  active: ImageSourcePropType;
};

const tabIcons: Record<keyof MainTabsParamList, TabIconConfig> = {
  Home: {
    default: require('./assets/icons/home-line.png'),
    active: require('./assets/icons/home-fill.png'),
  },
  Chat: {
    default: require('./assets/icons/chat-ai-4-line.png'),
    active: require('./assets/icons/chat-ai-4-fill.png'),
  },
  WordBank: {
    default: require('./assets/icons/archive-drawer-line.png'),
    active: require('./assets/icons/archive-drawer-fill.png'),
  },
  Activities: {
    default: require('./assets/icons/brain-2-line.png'),
    active: require('./assets/icons/brain-2-fill.png'),
  },
  NativeNotes: {
    default: require('./assets/icons/booklet-line.png'),
    active: require('./assets/icons/booklet-fill.png'),
  },
};

const defaultTextStyle: TextStyle = { fontFamily: fontFamilies.sans.regular };
Text.defaultProps = Text.defaultProps ?? {};
Text.defaultProps.style = StyleSheet.compose(defaultTextStyle, Text.defaultProps.style);

const defaultTextInputStyle: TextStyle = { fontFamily: fontFamilies.sans.regular };
TextInput.defaultProps = TextInput.defaultProps ?? {};
TextInput.defaultProps.style = StyleSheet.compose(
  defaultTextInputStyle,
  TextInput.defaultProps.style,
);

const HeaderIconButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors, mode } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open profile and settings"
      style={[
        styles.headerIconButton,
        { backgroundColor: 'transparent' },
      ]}
      onPress={onPress}
    >
      <Image
        source={require('./assets/icons/settings-line.png')}
        style={[
          styles.headerIconGlyph,
          { tintColor: mode === 'dark' ? '#FFFFFF' : '#000000' },
        ]}
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

const MainTabs: React.FC = () => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === 'dark';

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
        tabBarIcon: ({ focused }) => (
          <Image
            source={focused ? icon.active : icon.default}
            style={[
              styles.tabIcon,
              { tintColor: focused ? colors.accent : colors.textSecondary },
            ]}
          />
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

function App() {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === 'dark';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initialise = async () => {
      const offline = await offlineController.isOffline();
      setOfflineState(offline);
      unsubscribe = offlineController.onConnectivityChange(setOfflineState);
    };

    initialise().catch(() => undefined);

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        ref={navigationRef}
        theme={isDarkMode ? NavigationDarkTheme : NavigationLightTheme}
      >
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
          </RootStack.Navigator>
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const ThemedApp: React.FC = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

export default ThemedApp;

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
});
