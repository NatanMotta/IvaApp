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
} from 'react-native';
import { supabase } from '../lib/supabase';

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
    if (!email || !password || !nome) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }

    setLoading(true);

    // Crea l'utente in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }, // dati extra salvati nel profilo
      },
    });

    if (error) {
      Alert.alert('Errore registrazione', error.message);
      setLoading(false);
      return;
    }

    // Crea il profilo nella tabella profiles
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        nome,
      });
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
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
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
    // KeyboardAvoidingView sposta il contenuto verso l'alto
    // quando appare la tastiera, evitando che copra i campi
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo / Titolo */}
      <View style={styles.header}>
        <Text style={styles.logo}>IvaApp</Text>
        <Text style={styles.sottotitolo}>
          {modalita === 'login' ? 'Accedi al tuo account' : 'Crea il tuo account'}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>

        {/* Campo nome — visibile solo in registrazione */}
        {modalita === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Nome"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry  // nasconde il testo
        />

        {/* Bottone principale */}
        <TouchableOpacity
          style={styles.bottone}
          onPress={modalita === 'login' ? handleLogin : handleRegistrazione}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bottoneText}>
              {modalita === 'login' ? 'Accedi' : 'Registrati'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Switch login/registrazione */}
        <TouchableOpacity
          onPress={() => setModalita(modalita === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switchText}>
            {modalita === 'login'
              ? 'Non hai un account? Registrati'
              : 'Hai già un account? Accedi'}
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A3A5C',
    marginBottom: 8,
  },
  sottotitolo: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 12, // spazio tra i campi
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  bottone: {
    backgroundColor: '#2E86AB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  bottoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    textAlign: 'center',
    color: '#2E86AB',
    fontSize: 14,
    marginTop: 8,
  },
});