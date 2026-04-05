// screens/QuizSessioneScreen.tsx
// Schermata di sessione quiz — mostra un quiz alla volta.
// L'utente risponde, vede il feedback immediato, poi passa al successivo.

import { useEffect, useState } from 'react';
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

type Quiz = {
  id: number;
  domanda: string;
  opzione_a: string;
  opzione_b: string;
  opzione_c: string;
  risposta_corretta: string;
  spiegazione: string;
};

const QUIZ_PER_SPRINT = 20;

export default function QuizSessioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId, isRipassoErrori } = route.params;

  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [indiceAttuale, setIndiceAttuale] = useState(0);
  const [rispostaScelta, setRispostaScelta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [punteggio, setPunteggio] = useState(0);
  const [sessioneFinita, setSessioneFinita] = useState(false);

  useEffect(() => {
    caricaQuiz();
  }, []);

  async function caricaQuiz() {
    try {
      if (isRipassoErrori) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          if (authError) console.error('Errore utente:', authError.message);
          setQuiz([]);
          return;
        }

        const userId = authData.user.id;

        const { data: sezioniModulo, error: sezioniError } = await supabase
          .from('sezioni')
          .select('id')
          .eq('modulo_id', moduloId)
          .eq('is_attivo', true);

        if (sezioniError) {
          console.error('Errore caricamento sezioni modulo:', sezioniError.message);
          setQuiz([]);
          return;
        }

        const idsSezioni = (sezioniModulo || []).map((s: { id: number }) => s.id);
        if (idsSezioni.length === 0) {
          setQuiz([]);
          return;
        }

        const { data: erroriData, error: erroriQueryError } = await supabase
          .from('quiz_da_correggere')
          .select('quiz_id')
          .eq('user_id', userId);

        if (erroriQueryError) {
          console.error('Errore caricamento quiz da correggere:', erroriQueryError.message);
          setQuiz([]);
          return;
        }

        const idsQuizDaCorreggere = (erroriData || []).map((q: { quiz_id: number }) => q.quiz_id);
        if (idsQuizDaCorreggere.length === 0) {
          setQuiz([]);
          return;
        }

        const { data: quizData, error: quizError } = await supabase
          .from('quiz')
          .select('*')
          .in('id', idsQuizDaCorreggere)
          .in('sezione_id', idsSezioni)
          .eq('is_attivo', true);

        if (quizError) {
          console.error('Errore caricamento quiz ripasso:', quizError.message);
          setQuiz([]);
          return;
        }

        const sprint = (quizData || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, QUIZ_PER_SPRINT);
        setQuiz(sprint);
        return;
      }

      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .eq('sezione_id', sezioneId)
        .eq('is_attivo', true);

      if (error) {
        console.error('Errore caricamento quiz:', error.message);
      } else {
        // Sprint standard: max 20 quiz casuali
        const sprint = (data || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, QUIZ_PER_SPRINT);
        setQuiz(sprint);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRisposta(opzione: string) {
    if (rispostaScelta) return; // evita doppio tap

    setRispostaScelta(opzione);

    const quizAttuale = quiz[indiceAttuale];
    const isCorretta = opzione === quizAttuale.risposta_corretta;

    if (isCorretta) {
      setPunteggio(p => p + 1);
    }

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
    if (indiceAttuale + 1 >= quiz.length) {
      setSessioneFinita(true);
    } else {
      setIndiceAttuale(i => i + 1);
      setRispostaScelta(null);
    }
  }

  // ── LOADING ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E86AB" />
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
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bottoneText}>Torna alla sezione</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottone, styles.bottoneSecondario]}
          onPress={() => {
            // Riinizia la sessione
            setIndiceAttuale(0);
            setRispostaScelta(null);
            setPunteggio(0);
            setSessioneFinita(false);
            setQuiz(q => [...q].sort(() => Math.random() - 0.5));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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
      <View style={styles.domandaCard}>
        <Text style={styles.domandaTesto}>{quizAttuale.domanda}</Text>
      </View>

      {/* Opzioni */}
      {opzioni.map((opzione) => {
        // Calcola il colore dell'opzione dopo la risposta
        let stileOpzione = styles.opzione;
        let stileTesto = styles.opzioneTesto;

        if (rispostaScelta) {
          if (opzione.key === quizAttuale.risposta_corretta) {
            stileOpzione = { ...styles.opzione, ...styles.opzioneCorretta };
            stileTesto = { ...styles.opzioneTesto, ...styles.opzioneTestoCorretta };
          } else if (opzione.key === rispostaScelta) {
            stileOpzione = { ...styles.opzione, ...styles.opzioneErrata };
            stileTesto = { ...styles.opzioneTesto, ...styles.opzioneTestoErrata };
          }
        }

        return (
          <TouchableOpacity
            key={opzione.key}
            style={stileOpzione}
            onPress={() => handleRisposta(opzione.key)}
            disabled={!!rispostaScelta}
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

          <TouchableOpacity style={styles.bottone} onPress={handleAvanti}>
            <Text style={styles.bottoneText}>
              {indiceAttuale + 1 >= quiz.length ? 'Vedi risultato' : 'Avanti →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  testoVuoto: { fontSize: 16, color: '#6B7280', textAlign: 'center' },

  // Progresso
  progressoContainer: { marginBottom: 4 },
  progressoTesto: { fontSize: 13, color: '#6B7280', marginBottom: 6, textAlign: 'right' },
  progressoBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  progressoFill: { height: 6, backgroundColor: '#2E86AB', borderRadius: 3 },

  // Domanda
  domandaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  domandaTesto: { fontSize: 16, color: '#1A3A5C', fontWeight: '600', lineHeight: 24 },

  // Opzioni
  opzione: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  opzioneCorretta: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  opzioneErrata: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  opzioneLabel: { fontSize: 15, fontWeight: '700', color: '#6B7280', minWidth: 20 },
  opzioneTesto: { fontSize: 15, color: '#374151', flex: 1 },
  opzioneTestoCorretta: { color: '#065F46' },
  opzioneTestoErrata: { color: '#991B1B' },

  // Spiegazione
  spiegazioneCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  spiegazioneLabel: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  spiegazioneTesto: { fontSize: 14, color: '#1E3A8A', lineHeight: 20 },

  // Bottoni
  bottone: {
    backgroundColor: '#2E86AB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  bottoneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bottoneSecondario: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2E86AB' },
  bottoneTestoSecondario: { color: '#2E86AB', fontSize: 16, fontWeight: '700' },

  // Risultato finale
  risultatoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  risultatoEmoji: { fontSize: 64 },
  risultatoTitolo: { fontSize: 24, fontWeight: '800', color: '#1A3A5C' },
  risultatoPunteggio: { fontSize: 20, color: '#374151', fontWeight: '600' },
  risultatoPercentuale: { fontSize: 48, fontWeight: '800', color: '#2E86AB' },
});
