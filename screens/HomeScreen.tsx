// screens/HomeScreen.tsx
// Schermata principale — mostra i moduli IVA disponibili.
// Ogni modulo porta a una lista di sezioni.

import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useModuli } from '../hooks/useModuli';
import { theme } from '../lib/theme';
import { PremiumCard } from '../components/PremiumCard';
import { Skeleton } from '../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation }: any) {
  const { data: moduli = [], isLoading, isError } = useModuli();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.heroBox}>
          <Skeleton width="60%" height={28} borderRadius={8} style={{ marginBottom: 8, opacity: 0.5 }} />
          <Skeleton width="40%" height={16} borderRadius={4} style={{ opacity: 0.4 }} />
        </LinearGradient>
        <View style={styles.listContainer}>
           <Skeleton height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 16 }} />
           <Skeleton height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 16 }} />
           <Skeleton height={120} borderRadius={theme.borderRadius.lg} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.error }}>Errore nel caricamento dei moduli.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.primary, '#244d7a']} style={styles.heroBox} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
        <Text style={styles.heroTitle}>I tuoi moduli IVA</Text>
        <Text style={styles.heroSubtitle}>Seleziona un modulo per imparare e allenarti.</Text>
      </LinearGradient>

      <FlatList
        data={moduli}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PremiumCard
            title={item.titolo}
            description={item.descrizione}
            badge={item.is_premium ? 'PRO' : undefined}
            badgeType={item.is_premium ? 'warning' : 'primary'}
            onPress={() => navigation.navigate('Sezioni', {
              moduloId: item.id,
              moduloTitolo: item.titolo,
            })}
          />
        )}
        contentContainerStyle={styles.listContainer}
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
  heroBox: {
    padding: 24,
    paddingTop: 32,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.mild,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#D2DFED',
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
    gap: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
});
