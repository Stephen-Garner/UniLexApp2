import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OfflineBanner from './src/ui/components/OfflineBanner';
import TranslatorScreen from './src/ui/screens/TranslatorScreen';
import BankListScreen from './src/ui/screens/BankListScreen';
import BankDetailScreen from './src/ui/screens/BankDetailScreen';
import DrillModeScreen from './src/ui/screens/DrillModeScreen';
import RecallScreen from './src/ui/screens/RecallScreen';
import RecognitionScreen from './src/ui/screens/RecognitionScreen';
import ClozeScreen from './src/ui/screens/ClozeScreen';
import ListenTypeScreen from './src/ui/screens/ListenTypeScreen';
import NotesListScreen from './src/ui/screens/NotesListScreen';
import CreateNoteScreen from './src/ui/screens/CreateNoteScreen';
import NoteDetailScreen from './src/ui/screens/NoteDetailScreen';
import YouTubeSearchScreen from './src/ui/screens/YouTubeSearchScreen';
import SavedVideosScreen from './src/ui/screens/SavedVideosScreen';
import VideoDetailScreen from './src/ui/screens/VideoDetailScreen';
import AddTimestampScreen from './src/ui/screens/AddTimestampScreen';
import ProgressDashboardScreen from './src/ui/screens/ProgressDashboardScreen';
import { offlineController } from './src/services/container';
import { setOfflineState } from './src/state/offline.store';
import SettingsScreen from './src/ui/screens/SettingsScreen';

export type TranslatorStackParamList = {
  Translator: undefined;
  BankList: undefined;
  BankDetail: { itemId: string };
  NotesList: undefined;
  CreateNote: undefined;
  NoteDetail: { noteId: string };
};

export type DrillsStackParamList = {
  DrillModes: undefined;
  Recall: undefined;
  Recognition: undefined;
  Cloze: undefined;
  ListenType: undefined;
};

export type VideosStackParamList = {
  YouTubeSearch: undefined;
  SavedVideos: undefined;
  VideoDetail: { videoId: string };
  AddTimestamp: { videoId: string };
};

export type ProgressStackParamList = {
  ProgressDashboard: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};

const TranslatorStack = createNativeStackNavigator<TranslatorStackParamList>();
const DrillsStack = createNativeStackNavigator<DrillsStackParamList>();
const VideosStack = createNativeStackNavigator<VideosStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator();

const TranslatorStackScreen = () => (
  <TranslatorStack.Navigator>
    <TranslatorStack.Screen
      name="Translator"
      component={TranslatorScreen}
      options={{ title: 'Translator' }}
    />
    <TranslatorStack.Screen
      name="BankList"
      component={BankListScreen}
      options={{ title: 'Vocabulary Bank' }}
    />
    <TranslatorStack.Screen
      name="BankDetail"
      component={BankDetailScreen}
      options={{ title: 'Vocabulary Detail' }}
    />
    <TranslatorStack.Screen
      name="NotesList"
      component={NotesListScreen}
      options={{ title: 'Notes' }}
    />
    <TranslatorStack.Screen
      name="CreateNote"
      component={CreateNoteScreen}
      options={{ title: 'Create Note' }}
    />
    <TranslatorStack.Screen
      name="NoteDetail"
      component={NoteDetailScreen}
      options={{ title: 'Note Detail' }}
    />
  </TranslatorStack.Navigator>
);

const DrillsStackScreen = () => (
  <DrillsStack.Navigator>
    <DrillsStack.Screen
      name="DrillModes"
      component={DrillModeScreen}
      options={{ title: 'Drills' }}
    />
    <DrillsStack.Screen
      name="Recall"
      component={RecallScreen}
      options={{ title: 'Recall' }}
    />
    <DrillsStack.Screen
      name="Recognition"
      component={RecognitionScreen}
      options={{ title: 'Recognition' }}
    />
    <DrillsStack.Screen
      name="Cloze"
      component={ClozeScreen}
      options={{ title: 'Cloze' }}
    />
    <DrillsStack.Screen
      name="ListenType"
      component={ListenTypeScreen}
      options={{ title: 'Listen & Type' }}
    />
  </DrillsStack.Navigator>
);

const VideosStackScreen = () => (
  <VideosStack.Navigator>
    <VideosStack.Screen
      name="YouTubeSearch"
      component={YouTubeSearchScreen}
      options={{ title: 'Search Videos' }}
    />
    <VideosStack.Screen
      name="SavedVideos"
      component={SavedVideosScreen}
      options={{ title: 'Saved Videos' }}
    />
    <VideosStack.Screen
      name="VideoDetail"
      component={VideoDetailScreen}
      options={{ title: 'Video Detail' }}
    />
    <VideosStack.Screen
      name="AddTimestamp"
      component={AddTimestampScreen}
      options={{ title: 'Add Timestamp' }}
    />
  </VideosStack.Navigator>
);

const ProgressStackScreen = () => (
  <ProgressStack.Navigator>
    <ProgressStack.Screen
      name="ProgressDashboard"
      component={ProgressDashboardScreen}
      options={{ title: 'Progress' }}
    />
  </ProgressStack.Navigator>
);

const SettingsStackScreen = () => (
  <SettingsStack.Navigator>
    <SettingsStack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </SettingsStack.Navigator>
);

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initialise = async () => {
      const offline = await offlineController.isOffline();
      setOfflineState(offline);
      unsubscribe = offlineController.onConnectivityChange(setOfflineState);
    };

    void initialise();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Translate" component={TranslatorStackScreen} />
            <Tab.Screen name="Drills" component={DrillsStackScreen} />
            <Tab.Screen name="Videos" component={VideosStackScreen} />
            <Tab.Screen name="Progress" component={ProgressStackScreen} />
            <Tab.Screen name="Settings" component={SettingsStackScreen} />
          </Tab.Navigator>
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
