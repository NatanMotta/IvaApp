// screens/DettaglioSezioneScreen.tsx
// Mostra il dettaglio di una sezione: mini-lezione, schema riassuntivo
// e bottone per iniziare i quiz.

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDettaglioSezione } from '../hooks/useSezioni';

export default function DettaglioSezioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId, isRipassoErrori } = route.params;

  const { data: sezione, isLoading, isError } = useDettaglioSezione(isRipassoErrori ? 0 : sezioneId);

  if (isLoading && !isRipassoErrori) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E86AB" />
      </View>
    );
  }

  if (isError && !isRipassoErrori) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red' }}>Errore nel caricamento del dettaglio.</Text>
      </View>
    );
  }

  if (isRipassoErrori) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.sezione}>
          <Text style={styles.sezioneLabel}>🔁 Sprint Ripasso Errori</Text>
          <Text style={styles.testo}>
            Questa modalità crea sprint da 20 quiz basati sulle domande che hai sbagliato nel primo modulo.
          </Text>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneLabel}>✅ Come funziona</Text>
          <Text style={styles.testo}>
            Ogni risposta corretta viene rimossa automaticamente dalla lista di ripasso.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bottone}
          onPress={() => navigation.push('QuizSessione', {
            sezioneId,
            sezioneTitolo,
            moduloId,
            isRipassoErrori: true,
          })}
        >
          <Text style={styles.bottoneText}>Inizia il ripasso →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Mini-lezione */}
      <View style={styles.sezione}>
        <Text style={styles.sezioneLabel}>📖 Mini-lezione</Text>
        <Text style={styles.testo}>
          {sezione?.lezione_testo || 'Contenuto in arrivo...'}
        </Text>
      </View>

      {/* Schema riassuntivo */}
      <View style={styles.sezione}>
        <Text style={styles.sezioneLabel}>📋 Schema riassuntivo</Text>
        <Text style={styles.testo}>
          {sezione?.schema_testo || 'Contenuto in arrivo...'}
        </Text>
      </View>

      {/* Bottone quiz */}
      <TouchableOpacity
        style={styles.bottone}
        onPress={() => navigation.push('QuizSessione', {
          sezioneId,
          sezioneTitolo,
          moduloId,
          isRipassoErrori: false,
        })}
      >
        <Text style={styles.bottoneText}>Inizia i quiz →</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sezione: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sezioneLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3A5C',
    marginBottom: 10,
  },
  testo: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  bottone: {
    backgroundColor: '#2E86AB',
    borderRadius: 12,
    padding: 18,
    margin: 16,
    alignItems: 'center',
  },
  bottoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
