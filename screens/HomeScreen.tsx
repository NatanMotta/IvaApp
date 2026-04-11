import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useModuli, type Modulo } from '../hooks/useModuli';
import { theme } from '../lib/theme';
import { Skeleton } from '../components/Skeleton';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';

const LAST_MODULO_KEY = '@ivaapp_last_modulo_id';

export default function HomeScreen({ navigation }: any) {
  const { data: moduli = [], isLoading, isError } = useModuli();
  const { data: entitlements } = useEntitlements();
  const [lastModuloId, setLastModuloId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LAST_MODULO_KEY)
      .then((value) => {
        if (!mounted || !value) return;
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) setLastModuloId(parsed);
      })
      .catch(() => null);

    return () => {
      mounted = false;
    };
  }, []);

  const moduloCorrente = useMemo(() => {
    if (moduli.length === 0) return null;
    return moduli.find((m) => m.id === lastModuloId) ?? moduli[0];
  }, [lastModuloId, moduli]);

  const premiumCount = moduli.filter((m) => m.is_premium).length;
  const freeCount = Math.max(moduli.length - premiumCount, 0);

  async function openModulo(modulo: Modulo) {
    const hasAccess = canAccessModulo(modulo, !!entitlements?.hasPro);
    if (!hasAccess) {
      Alert.alert(
        'Contenuto Premium',
        'Questo modulo è disponibile con piano Pro. Puoi gestire l’abbonamento dal Profilo.',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Apri profilo', onPress: () => navigation.getParent()?.navigate('Profilo') },
        ]
      );
      return;
    }

    setLastModuloId(modulo.id);
    await AsyncStorage.setItem(LAST_MODULO_KEY, String(modulo.id));
    navigation.navigate('Sezioni', {
      moduloId: modulo.id,
      moduloTitolo: modulo.titolo,
    });
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Skeleton width="38%" height={16} borderRadius={6} style={{ opacity: 0.4, marginBottom: 12 }} />
          <Skeleton width="70%" height={30} borderRadius={8} style={{ opacity: 0.55, marginBottom: 8 }} />
          <Skeleton width="56%" height={18} borderRadius={6} style={{ opacity: 0.45, marginBottom: 18 }} />
          <View style={styles.metricsRow}>
            <Skeleton width="31%" height={78} borderRadius={12} style={{ opacity: 0.45 }} />
            <Skeleton width="31%" height={78} borderRadius={12} style={{ opacity: 0.45 }} />
            <Skeleton width="31%" height={78} borderRadius={12} style={{ opacity: 0.45 }} />
          </View>
        </LinearGradient>

        <View style={styles.listContainer}>
          <Skeleton height={108} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 12 }} />
          <Skeleton height={108} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 12 }} />
          <Skeleton height={108} borderRadius={theme.borderRadius.lg} />
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
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.kicker}>Cockpit Studio</Text>
        <Text style={styles.heroTitle}>Riprendi da dove eri rimasto</Text>
        <Text style={styles.heroSubtitle}>
          Entra in un modulo o avvia subito uno sprint quiz.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{moduli.length}</Text>
            <Text style={styles.metricLabel}>Moduli attivi</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{freeCount}</Text>
            <Text style={styles.metricLabel}>Accesso free</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{premiumCount}</Text>
            <Text style={styles.metricLabel}>Pro</Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaPrimary}
            activeOpacity={0.86}
            disabled={!moduloCorrente}
            onPress={() => moduloCorrente && openModulo(moduloCorrente)}
          >
            <Ionicons name="play" size={15} color={theme.colors.primary} />
            <Text style={styles.ctaPrimaryText}>Continua studio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaSecondary}
            activeOpacity={0.86}
            onPress={() => navigation.getParent()?.navigate('Quiz')}
          >
            <Ionicons name="flash-outline" size={15} color="#fff" />
            <Text style={styles.ctaSecondaryText}>Sprint quiz</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={moduli}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>I tuoi moduli</Text>
            <Text style={styles.sectionSubtitle}>Ordina il tuo studio partendo dalle sezioni essenziali.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const highlight = moduloCorrente?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.moduleCard, theme.shadows.mild, highlight && styles.moduleCardHighlight]}
              activeOpacity={0.85}
              onPress={() => openModulo(item)}
            >
              <View style={styles.moduleTop}>
                <Text style={styles.moduleIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={[styles.stateBadge, highlight ? styles.stateBadgeActive : styles.stateBadgeIdle]}>
                  <Text style={[styles.stateBadgeText, highlight && styles.stateBadgeTextActive]}>
                    {highlight ? 'In corso' : 'Disponibile'}
                  </Text>
                </View>
              </View>

              <Text style={styles.moduleTitle}>{item.titolo}</Text>
              <Text style={styles.moduleDescription} numberOfLines={2}>
                {item.descrizione || 'Apri il modulo per vedere sezioni, schema e quiz.'}
              </Text>

              <View style={styles.moduleFooter}>
                {item.is_premium ? (
                  <Text style={styles.modulePremium}>Contenuto Pro</Text>
                ) : (
                  <Text style={styles.moduleFree}>Contenuto incluso</Text>
                )}
                <View style={styles.moduleAction}>
                  <Text style={styles.moduleActionText}>Apri</Text>
                  <Ionicons name="arrow-forward" size={15} color={theme.colors.accent} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
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
  hero: {
    padding: 18,
    paddingTop: 22,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.mild,
  },
  kicker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#E5EEF8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D2DFED',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricLabel: {
    color: '#D2DFED',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaPrimary: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F8FBFF',
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaPrimaryText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  ctaSecondary: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaSecondaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moduleCardHighlight: {
    borderColor: '#BFD4E8',
    backgroundColor: '#FBFDFF',
  },
  moduleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.7,
  },
  stateBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stateBadgeIdle: {
    backgroundColor: theme.colors.accentLight,
  },
  stateBadgeActive: {
    backgroundColor: '#E9F8F0',
  },
  stateBadgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stateBadgeTextActive: {
    color: theme.colors.success,
  },
  moduleTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  moduleDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  modulePremium: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  moduleFree: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  moduleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleActionText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
});
