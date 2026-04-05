// screens/SezioniScreen.tsx
// Mostra la lista delle sezioni di un modulo.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Sezione = {
  id: number;
  titolo: string;
  descrizione: string;
  ordine: number;
};

export default function SezioniScreen({ route, navigation }: any) {
  // Recupera i parametri passati dalla HomeScreen
  const { moduloId, moduloTitolo } = route.params;

  const [sezioni, setSezioni] = useState<Sezione[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaSezioni();
  }, []);

  async function caricaSezioni() {
    const { data, error } = await supabase
      .from('sezioni')
      .select('*')
      .eq('modulo_id', moduloId)
      .eq('is_attivo', true)
      .order('ordine');

    if (error) {
      console.error('Errore caricamento sezioni:', error.message);
    } else {
      setSezioni(data || []);
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
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>{moduloTitolo}</Text>
        <Text style={styles.headerSubtitle}>Scegli una sezione per iniziare la prossima sprint.</Text>
      </View>

      <FlatList
        data={sezioni}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DettaglioSezione', {
              sezioneId: item.id,
              sezioneTitolo: item.titolo,
              moduloId,
              isRipassoErrori: false,
            })}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitolo}>{item.titolo}</Text>
              <Text style={styles.cardBadge}>Lezione</Text>
            </View>
            <Text style={styles.cardDescrizione}>
              {item.descrizione || 'Apri la sezione per contenuto, schema e quiz a sprint.'}
            </Text>
            <Text style={styles.cardArrow}>Apri sezione →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nessuna sezione disponibile per questo modulo.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBox: {
    backgroundColor: '#1A3A5C',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#D2DFED',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitolo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A3A5C',
  },
  cardBadge: {
    backgroundColor: '#E7F4FA',
    color: '#2E86AB',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardDescrizione: {
    fontSize: 14,
    color: '#425466',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E86AB',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    padding: 16,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
  },
});
