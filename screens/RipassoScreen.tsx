import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Modulo = {
  id: number;
};

export default function RipassoScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [moduloId, setModuloId] = useState<number | null>(null);

  useEffect(() => {
    caricaPrimoModulo();
  }, []);

  async function caricaPrimoModulo() {
    const { data, error } = await supabase
      .from('moduli')
      .select('id')
      .eq('is_attivo', true)
      .order('ordine', { ascending: true })
      .limit(1)
      .single<Modulo>();

    if (error) {
      console.error('Errore caricamento primo modulo:', error.message);
      setModuloId(null);
    } else {
      setModuloId(data?.id ?? null);
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

  if (!moduloId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Nessun modulo disponibile per avviare il ripasso.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ripasso Errori</Text>
        <Text style={styles.heroSubtitle}>
          Esegui sprint da 20 domande basate sui quiz che hai sbagliato.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Modalita Sprint</Text>
        <Text style={styles.cardText}>
          Ogni risposta corretta rimuove automaticamente il quiz dalla lista errori.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.push('QuizSessioneRipasso', {
            sezioneId: 'ripasso-errori',
            sezioneTitolo: 'Ripasso Errori',
            moduloId,
            isRipassoErrori: true,
          })
        }
      >
        <Text style={styles.buttonText}>Inizia sprint ripasso</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FA',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F6FA',
  },
  hero: {
    backgroundColor: '#1A3A5C',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D3E0EE',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  cardTitle: {
    color: '#1A3A5C',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: '#425466',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2E86AB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
});
