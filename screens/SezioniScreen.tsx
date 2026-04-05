// screens/SezioniScreen.tsx
// Mostra la lista delle sezioni di un modulo.

import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSezioni } from '../hooks/useSezioni';
import { theme } from '../lib/theme';
import { PremiumCard } from '../components/PremiumCard';
import { Skeleton } from '../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

export default function SezioniScreen({ route, navigation }: any) {
  // Recupera i parametri passati dalla HomeScreen
  const { moduloId, moduloTitolo } = route.params;

  const { data: sezioni = [], isLoading, isError } = useSezioni(moduloId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A3A5C', '#244d7a']} style={styles.headerBox}>
          <Skeleton width="70%" height={26} borderRadius={8} style={{ marginBottom: 8, opacity: 0.5 }} />
          <Skeleton width="50%" height={14} borderRadius={4} style={{ opacity: 0.4 }} />
        </LinearGradient>
        <View style={{ padding: 16, gap: 16 }}>
           <Skeleton height={110} borderRadius={theme.borderRadius.lg} />
           <Skeleton height={110} borderRadius={theme.borderRadius.lg} />
           <Skeleton height={110} borderRadius={theme.borderRadius.lg} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>Errore nel caricamento delle sezioni.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A3A5C', '#244d7a']} style={styles.headerBox} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
        <Text style={styles.headerTitle}>{moduloTitolo}</Text>
        <Text style={styles.headerSubtitle}>Scegli una sezione per imparare e fare i quiz.</Text>
      </LinearGradient>

      <FlatList
        data={sezioni}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PremiumCard
            title={item.titolo}
            description={item.descrizione || 'Tocca per aprire appunti e sprint di quiz.'}
            badge="Lezione"
            badgeType="primary"
            onPress={() => navigation.navigate('DettaglioSezione', {
              sezioneId: item.id,
              sezioneTitolo: item.titolo,
              moduloId,
              isRipassoErrori: false,
            })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nessuna sezione disponibile per questo modulo.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  headerBox: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.mild,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerSubtitle: {
    color: '#D2DFED',
    fontSize: 15,
  },
  emptyBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
  },
});
