// screens/SezioniScreen.tsx
// Mostra la lista delle sezioni di un modulo.

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSezioni } from '../hooks/useSezioni';
import { theme } from '../lib/theme';
import { PremiumCard } from '../components/PremiumCard';
import { Skeleton } from '../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { useModuli } from '../hooks/useModuli';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';

export default function SezioniScreen({ route, navigation }: any) {
  // Recupera i parametri passati dalla HomeScreen
  const { moduloId, moduloTitolo } = route.params;
  const { data: moduli = [], isLoading: moduliLoading } = useModuli();
  const { data: entitlements } = useEntitlements();
  const modulo = moduli.find((m) => m.id === moduloId) ?? null;
  const moduloLocked = modulo ? !canAccessModulo(modulo, !!entitlements?.hasPro) : false;

  const { data: sezioni = [], isLoading, isError } = useSezioni(moduloLocked ? 0 : moduloId);

  if (isLoading || moduliLoading) {
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

  if (moduloLocked) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A3A5C', '#244d7a']} style={styles.headerBox} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          <Text style={styles.headerTitle}>{moduloTitolo}</Text>
          <Text style={styles.headerSubtitle}>Questo modulo richiede un piano Pro.</Text>
        </LinearGradient>

        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Contenuto Premium</Text>
          <Text style={styles.lockedText}>
            Attiva Pro per accedere a lezioni, schemi e quiz di questo modulo.
          </Text>
          <TouchableOpacity
            style={styles.lockedButton}
            onPress={() => navigation.getParent()?.navigate('Profilo')}
            activeOpacity={0.85}
          >
            <Text style={styles.lockedButtonText}>Vai al profilo</Text>
          </TouchableOpacity>
        </View>
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
  lockedCard: {
    margin: 16,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    ...theme.shadows.mild,
  },
  lockedTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  lockedText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  lockedButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
