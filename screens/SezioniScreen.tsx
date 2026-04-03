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
      <FlatList
        data={sezioni}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DettaglioSezione', {
              sezioneId: item.id,
              sezioneTitolo: item.titolo,
            })}
          >
            <Text style={styles.cardTitolo}>{item.titolo}</Text>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      />
    </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitolo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A3A5C',
  },
  cardArrow: {
    fontSize: 18,
    color: '#2E86AB',
  },
});