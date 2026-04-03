// screens/HomeScreen.tsx
// Schermata principale — mostra i moduli IVA disponibili.
// Ogni modulo porta a una lista di sezioni.

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

// Definiamo il tipo di un modulo — equivale a una struct in C
type Modulo = {
  id: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  is_premium: boolean;
};

export default function HomeScreen({ navigation }: any) {
  const [moduli, setModuli] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaModuli();
  }, []);

  async function caricaModuli() {
    const { data, error } = await supabase
      .from('moduli')
      .select('*')
      .eq('is_attivo', true)
      .order('ordine');

    if (error) {
      console.error('Errore caricamento moduli:', error.message);
    } else {
      setModuli(data || []);
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
      <Text style={styles.benvenuto}>I tuoi moduli IVA</Text>

      <FlatList
        data={moduli}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Sezioni', { moduloId: item.id, moduloTitolo: item.titolo })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitolo}>{item.titolo}</Text>
              {item.is_premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDescrizione}>{item.descrizione}</Text>
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
  benvenuto: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A3A5C',
    padding: 16,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitolo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A3A5C',
  },
  cardDescrizione: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardArrow: {
    fontSize: 18,
    color: '#2E86AB',
    textAlign: 'right',
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});