// App.tsx
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import ProfiloScreen from './screens/ProfiloScreen';
import SezioniScreen from './screens/SezioniScreen';
import DettaglioSezioneScreen from './screens/DettaglioSezioneScreen';
import QuizSessioneScreen from './screens/QuizSessioneScreen';
import RipassoScreen from './screens/RipassoScreen';
import AllenamentoOggiScreen from './screens/AllenamentoOggiScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti
    },
  },
});

const COLORS = {
  primary: '#1A3A5C',
  accent: '#2E86AB',
  inactive: '#9BA3AF',
};

import { theme } from './lib/theme';

function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0, elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="Sezioni"
        component={SezioniScreen}
        options={({ route }: any) => ({ title: (route.params as any)?.moduloTitolo })}
      />
      <Stack.Screen
        name="DettaglioSezione"
        component={DettaglioSezioneScreen}
        options={({ route }: any) => ({ title: (route.params as any)?.sezioneTitolo })}
      />
      <Stack.Screen
        name="QuizSessione"
        component={QuizSessioneScreen}
        options={({ route }: any) => ({ title: (route.params as any)?.sezioneTitolo })}
      />
      <Stack.Screen
        name="AllenamentoOggi"
        component={AllenamentoOggiScreen}
        options={{ title: 'Allenamento di oggi' }}
      />
    </Stack.Navigator>
  );
}

function RipassoStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0, elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="RipassoMain"
        component={RipassoScreen}
        options={{ title: 'Ripasso Errori' }}
      />
      <Stack.Screen
        name="QuizSessioneRipasso"
        component={QuizSessioneScreen}
        options={{ title: 'Sprint Ripasso' }}
      />
    </Stack.Navigator>
  );
}

function QuizStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0, elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="QuizMain"
        component={QuizScreen}
        options={{ title: 'Quiz' }}
      />
      <Stack.Screen
        name="QuizSessione"
        component={QuizSessioneScreen}
        options={({ route }: any) => ({ title: (route.params as any)?.sezioneTitolo ?? 'Quiz' })}
      />
    </Stack.Navigator>
  );
}

function MainApp() {
  // null = stiamo ancora controllando, Session = loggato, false = non loggato
  const [session, setSession] = useState<Session | null | false>(null);

  useEffect(() => {
    // Controlla se esiste già una sessione salvata sul dispositivo
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? false);
    });

    // Si mette in ascolto dei cambiamenti di sessione
    // (login, logout, token scaduto, ecc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session ?? false);
      }
    );

    // Cleanup — rimuove il listener quando il componente viene smontato
    return () => subscription.unsubscribe();
  }, []); // [] = esegui solo al primo avvio

  // Schermata di caricamento mentre verifichiamo la sessione
  if (session === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Non loggato → mostra AuthScreen
  if (!session) {
    return <AuthScreen />;
  }

  // Loggato → mostra le tab
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Home: focused ? 'home' : 'home-outline',
              Quiz: focused ? 'checkbox' : 'checkbox-outline',
              Chatbot: focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline',
              Ripasso: focused ? 'refresh-circle' : 'refresh-circle-outline',
              Profilo: focused ? 'person' : 'person-outline',
            };
            // Ingrandiamo leggermente l'icona selezionata
            return <Ionicons name={icons[route.name]} size={focused ? size + 2 : size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            paddingTop: 8,
            ...theme.shadows.premium,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0, elevation: 0 },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '800' },
        })}

      >
        <Tab.Screen
          name="Home"
          options={{ headerShown: false }}
          component={HomeStackNavigator}
        />
        <Tab.Screen
          name="Quiz"
          options={{ headerShown: false, title: 'Quiz' }}
          component={QuizStackNavigator}
        />
        <Tab.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Assistente IVA' }} />
        <Tab.Screen
          name="Ripasso"
          options={{ headerShown: false, title: 'Ripasso Errori' }}
          component={RipassoStackNavigator}
        />
        <Tab.Screen name="Profilo" component={ProfiloScreen} options={{ title: 'Il mio profilo' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}