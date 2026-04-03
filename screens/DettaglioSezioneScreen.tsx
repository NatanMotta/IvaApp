// screens/DettaglioSezioneScreen.tsx
// Mostra il dettaglio di una sezione: mini-lezione, schema riassuntivo
// e bottone per iniziare i quiz.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Sezione = {
  id: number;
  titolo: string;
  lezione_testo: string;
  schema_testo: string;
};

export default function DettaglioSezioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo } = route.params;

  const [sezione, setSezione] = useState<Sezione | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaSezione();
  }, []);

  async function caricaSezione() {
    const { data, error } = await supabase
      .from('sezioni')
      .select('*')
      .eq('id', sezioneId)
      .single(); // restituisce un oggetto singolo invece di un array

    if (error) {
      console.error('Errore:', error.message);
    } else {
      setSezione(data);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E86AB" />
      </View>
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