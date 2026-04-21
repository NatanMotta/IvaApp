// screens/AuthScreen.tsx
// Schermata di login e registrazione.
// L'utente può passare tra le due modalità con un bottone.

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthScreen() {
  // 'login' | 'register' — quale form mostrare
  const [modalita, setModalita] = useState<'login' | 'register'>('login');

  // Valori dei campi di testo
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');

  // Stato di caricamento — mostra uno spinner durante la richiesta
  const [loading, setLoading] = useState(false);

  // ── REGISTRAZIONE ──────────────────────────────────────────
  async function handleRegistrazione() {
    const emailPulita = email.trim().toLowerCase();
    const nomePulito = nome.trim();

    if (!emailPulita || !password || !nomePulito) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }

    if (!isValidEmail(emailPulita)) {
      Alert.alert('Errore', 'Email non valida. Controlla il formato (es: nome@dominio.com).');
      return;
    }

    setLoading(true);

    // Crea l'utente in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: emailPulita,
      password,
      options: {
        data: { nome: nomePulito }, // dati extra salvati nel profilo
      },
    });

    if (error) {
      Alert.alert('Errore registrazione', error.message);
      setLoading(false);
      return;
    }

    // Crea il profilo nella tabella profiles
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: emailPulita,
        nome: nomePulito,
      });

      if (profileError) {
        Alert.alert(
          'Registrazione incompleta',
          'Account creato, ma il profilo non è stato inizializzato. Contatta il supporto o riprova.'
        );
        setLoading(false);
        return;
      }
    }

    Alert.alert(
      'Registrazione completata',
      'Controlla la tua email per confermare il tuo account.',
      [
        {
          text: 'OK',
          onPress: () => setModalita('login'),
        },
      ]
    );
    setLoading(false);
  }

  // ── LOGIN ──────────────────────────────────────────────────
  async function handleLogin() {
    const emailPulita = email.trim().toLowerCase();

    if (!emailPulita || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }

    if (!isValidEmail(emailPulita)) {
      Alert.alert('Errore', 'Email non valida. Controlla il formato (es: nome@dominio.com).');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailPulita,
      password,
    });

    if (error) {
      Alert.alert('Errore login', error.message);
    }

    // Se il login va a buon fine, non dobbiamo fare nulla qui —
    // App.tsx rileva automaticamente il cambio di sessione e
    // mostra le tab (lo vediamo nel prossimo step)

    setLoading(false);
  }

  // ── INTERFACCIA ────────────────────────────────────────────
  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradientWrap}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={theme.gradients.authHero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.header, theme.shadows.mild]}
            >
              <Text style={styles.logo}>IvaApp</Text>
              <Text style={styles.sottotitolo}>
                {modalita === 'login' ? 'Accedi al tuo account premium' : 'Crea il tuo account premium'}
              </Text>
            </LinearGradient>

            <View style={[styles.formCard, theme.shadows.premium]}>
              <Text style={styles.formTitle}>{modalita === 'login' ? 'Bentornato' : 'Nuovo account'}</Text>

              {modalita === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  placeholderTextColor={theme.colors.textMuted}
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.bottone}
                onPress={modalita === 'login' ? handleLogin : handleRegistrazione}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.bottoneText}>
                    {modalita === 'login' ? 'Accedi' : 'Registrati'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalita(modalita === 'login' ? 'register' : 'login')}
                activeOpacity={0.8}
              >
                <Text style={styles.switchText}>
                  {modalita === 'login'
                    ? 'Non hai un account? Registrati'
                    : 'Hai già un account? Accedi'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientWrap: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  header: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  logo: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sottotitolo: {
    fontSize: 15,
    color: '#D2DFED',
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#F9FBFF',
    borderWidth: 1,
    borderColor: '#DCE7F2',
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  bottone: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 2,
  },
  bottoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    textAlign: 'center',
    color: theme.colors.accent,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
  },
});
