// screens/QuizSessioneScreen.tsx
// Schermata di sessione quiz — mostra un quiz alla volta.
// L'utente risponde, vede il feedback immediato, poi passa al successivo.

import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useQuizSessione } from '../hooks/useQuiz';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';

export default function QuizSessioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId, isRipassoErrori } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: quiz = [], isLoading, isError, refetch } = useQuizSessione(
    isRipassoErrori ? 0 : sezioneId,
    isRipassoErrori,
    moduloId
  );

  const [indiceAttuale, setIndiceAttuale] = useState(0);
  const [rispostaScelta, setRispostaScelta] = useState<string | null>(null);
  const [punteggio, setPunteggio] = useState(0);
  const [sessioneFinita, setSessioneFinita] = useState(false);

  async function handleRisposta(opzione: string) {
    if (rispostaScelta) return; // evita doppio tap

    setRispostaScelta(opzione);

    const quizAttuale = quiz[indiceAttuale];
    const isCorretta = opzione === quizAttuale.risposta_corretta;

    if (isCorretta) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPunteggio(p => p + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Scrolla automaticamente verso il basso dopo che il componente renderizza la spiegazione
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);

    // Salva la risposta nel database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Salva in risposte_utente
      const { error: rispostaError } = await supabase.from('risposte_utente').insert({
        user_id: user.id,
        quiz_id: quizAttuale.id,
        risposta_data: opzione,
        is_corretta: isCorretta,
      });

      if (rispostaError) {
        Alert.alert(
          'Salvataggio non riuscito',
          'La risposta è valida ma non è stata registrata. Verifica la connessione e riprova.'
        );
        return;
      }

      // Se sbagliato → aggiunge a quiz_da_correggere
      if (!isCorretta) {
        const { error: correggereError } = await supabase.from('quiz_da_correggere').upsert({
          user_id: user.id,
          quiz_id: quizAttuale.id,
        });

        if (correggereError) {
          if (!isRipassoErrori) {
            Alert.alert(
              'Aggiornamento parziale',
              'Risposta salvata, ma la lista "da correggere" non è stata aggiornata.'
            );
          }
        }
      } else {
        // Se corretto → rimuove da quiz_da_correggere (se era presente)
        const { error: deleteError } = await supabase.from('quiz_da_correggere').delete()
          .eq('user_id', user.id)
          .eq('quiz_id', quizAttuale.id);

        if (deleteError) {
          Alert.alert(
            'Aggiornamento parziale',
            'Risposta salvata, ma non è stato possibile aggiornare la lista "da correggere".'
          );
        }
      }
    }
  }

  function handleAvanti() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (indiceAttuale + 1 >= quiz.length) {
      setSessioneFinita(true);
    } else {
      setIndiceAttuale(i => i + 1);
      setRispostaScelta(null);
    }
  }

  // ── LOADING ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>Errore caricamento quiz.</Text>
      </View>
    );
  }

  // ── NESSUN QUIZ ────────────────────────────────────────────
  if (quiz.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.testoVuoto}>
          {isRipassoErrori
            ? 'Nessun errore da ripassare al momento. Ottimo lavoro!'
            : 'Nessun quiz disponibile per questa sezione.'}
        </Text>
      </View>
    );
  }

  // ── SESSIONE FINITA ────────────────────────────────────────
  if (sessioneFinita) {
    const percentuale = Math.round((punteggio / quiz.length) * 100);
    return (
      <View style={styles.risultatoContainer}>
        <Text style={styles.risultatoEmoji}>
          {percentuale >= 70 ? '🎉' : '💪'}
        </Text>
        <Text style={styles.risultatoTitolo}>Sessione completata!</Text>
        <Text style={styles.risultatoPunteggio}>
          {punteggio} / {quiz.length} corrette
        </Text>
        <Text style={styles.risultatoPercentuale}>{percentuale}%</Text>

        <TouchableOpacity
          style={styles.bottone}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.goBack();
          }}
        >
          <Text style={styles.bottoneText}>Torna alla sezione</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottone, styles.bottoneSecondario]}
          onPress={async () => {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
             // Forza l'aggiornamento dei quiz
            await refetch();
            // Riinizia la sessione
            setIndiceAttuale(0);
            setRispostaScelta(null);
            setPunteggio(0);
            setSessioneFinita(false);
          }}
        >
          <Text style={styles.bottoneTestoSecondario}>Rifai i quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── QUIZ ATTIVO ────────────────────────────────────────────
  const quizAttuale = quiz[indiceAttuale];
  const opzioni = [
    { key: 'a', testo: quizAttuale.opzione_a },
    { key: 'b', testo: quizAttuale.opzione_b },
    { key: 'c', testo: quizAttuale.opzione_c },
  ];

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      contentContainerStyle={styles.content}
    >

      {/* Progresso */}
      <View style={styles.progressoContainer}>
        <Text style={styles.progressoTesto}>
          {indiceAttuale + 1} / {quiz.length}
        </Text>
        <View style={styles.progressoBar}>
          <View
            style={[
              styles.progressoFill,
              { width: `${((indiceAttuale + 1) / quiz.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Domanda */}
      <View style={[styles.domandaCard, theme.shadows.mild]}>
        <Text style={styles.domandaTesto}>{quizAttuale.domanda}</Text>
      </View>

      {/* Opzioni */}
      {opzioni.map((opzione) => {
        // Calcola il colore dell'opzione dopo la risposta
        let stileOpzione: any = styles.opzione;
        let stileTesto: any = styles.opzioneTesto;

        if (rispostaScelta) {
          if (opzione.key === quizAttuale.risposta_corretta) {
            stileOpzione = [styles.opzione, styles.opzioneCorretta];
            stileTesto = [styles.opzioneTesto, styles.opzioneTestoCorretta];
          } else if (opzione.key === rispostaScelta) {
            stileOpzione = [styles.opzione, styles.opzioneErrata];
            stileTesto = [styles.opzioneTesto, styles.opzioneTestoErrata];
          }
        }

        return (
          <TouchableOpacity
            key={opzione.key}
            style={stileOpzione}
            onPress={() => handleRisposta(opzione.key)}
            disabled={!!rispostaScelta}
            activeOpacity={0.7}
          >
            <Text style={styles.opzioneLabel}>{opzione.key.toUpperCase()})</Text>
            <Text style={stileTesto}>{opzione.testo}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Spiegazione + bottone Avanti (visibili dopo la risposta) */}
      {rispostaScelta && (
        <View>
          {quizAttuale.spiegazione && (
            <View style={styles.spiegazioneCard}>
               <Text style={styles.spiegazioneLabel}>💡 Spiegazione</Text>
              <Text style={styles.spiegazioneTesto}>{quizAttuale.spiegazione}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.bottone} onPress={handleAvanti} activeOpacity={0.8}>
            <Text style={styles.bottoneText}>
              {indiceAttuale + 1 >= quiz.length ? 'Vedi risultato' : 'Prossima domanda →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  testoVuoto: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' },

  // Progresso
  progressoContainer: { marginBottom: 4 },
  progressoTesto: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8, textAlign: 'right', fontWeight: '600' },
  progressoBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  progressoFill: { height: 8, backgroundColor: theme.colors.accent, borderRadius: 4 },

  // Domanda
  domandaCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  domandaTesto: { fontSize: 18, color: theme.colors.text, fontWeight: '700', lineHeight: 26 },

  // Opzioni
  opzione: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  opzioneCorretta: { backgroundColor: theme.colors.successBg, borderColor: theme.colors.success },
  opzioneErrata: { backgroundColor: theme.colors.errorBg, borderColor: theme.colors.error },
  opzioneLabel: { fontSize: 16, fontWeight: '800', color: theme.colors.textMuted, minWidth: 24 },
  opzioneTesto: { fontSize: 16, color: theme.colors.text, flex: 1, fontWeight: '500' },
  opzioneTestoCorretta: { color: theme.colors.success, fontWeight: '700' },
  opzioneTestoErrata: { color: theme.colors.error, fontWeight: '700' },

  // Spiegazione
  spiegazioneCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  spiegazioneLabel: { fontSize: 14, fontWeight: '800', color: '#0369A1', marginBottom: 6 },
  spiegazioneTesto: { fontSize: 15, color: '#0C4A6E', lineHeight: 22 },

  // Bottoni
  bottone: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  bottoneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bottoneSecondario: { backgroundColor: 'transparent', borderWidth: 0, marginTop: 4 },
  bottoneTestoSecondario: { color: theme.colors.accent, fontSize: 16, fontWeight: '700' },

  // Risultato finale
  risultatoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  risultatoEmoji: { fontSize: 72 },
  risultatoTitolo: { fontSize: 26, fontWeight: '800', color: theme.colors.text },
  risultatoPunteggio: { fontSize: 18, color: theme.colors.textSecondary, fontWeight: '600' },
  risultatoPercentuale: { fontSize: 56, fontWeight: '900', color: theme.colors.accent, marginBottom: 16 },
});
