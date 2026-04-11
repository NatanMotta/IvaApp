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
import { Ionicons } from '@expo/vector-icons';
import { useModuli, type Modulo } from '../hooks/useModuli';
import { useSezioni } from '../hooks/useSezioni';
import { theme } from '../lib/theme';
import { Skeleton } from '../components/Skeleton';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';
import { useDailyTrainingProgress } from '../hooks/useDailyTrainingProgress';

const LAST_MODULO_KEY = '@ivaapp_last_modulo_id';

export default function HomeScreen({ navigation }: any) {
  const { data: moduli = [], isLoading, isError } = useModuli();
  const { data: entitlements } = useEntitlements();
  const [lastModuloId, setLastModuloId] = useState<number | null>(null);
  const { percentage, isLoading: progressLoading } = useDailyTrainingProgress();

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

  const { data: sezioniModuloCorrente = [] } = useSezioni(moduloCorrente?.id ?? 0);
  const sezioneDelGiorno = sezioniModuloCorrente[0] ?? null;

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

  function openAllenamentoOggi() {
    if (!moduloCorrente || !sezioneDelGiorno) {
      Alert.alert('Contenuto non disponibile', 'Serve almeno una sezione attiva per avviare l’allenamento di oggi.');
      return;
    }

    navigation.navigate('AllenamentoOggi', {
      moduloId: moduloCorrente.id,
      moduloTitolo: moduloCorrente.titolo,
      sezioneId: sezioneDelGiorno.id,
      sezioneTitolo: sezioneDelGiorno.titolo,
    });
  }

  if (isLoading || progressLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Skeleton height={160} borderRadius={theme.borderRadius.xl} style={{ marginBottom: 14 }} />
          <Skeleton height={130} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 10 }} />
          <Skeleton height={102} borderRadius={theme.borderRadius.lg} style={{ marginBottom: 10 }} />
          <Skeleton height={102} borderRadius={theme.borderRadius.lg} />
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
      <FlatList
        data={moduli}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <View style={[styles.todayCard, theme.shadows.mild]}>
              <View style={styles.todayTopRow}>
                <Text style={styles.todayTitle}>Allenamento di oggi</Text>
                <Text style={styles.todayPercent}>{percentage}%</Text>
              </View>
              <Text style={styles.todaySubtitle}>
                Avvio rapido percorso guidato: podcast + quiz + ripasso.
              </Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
              </View>

              <TouchableOpacity
                style={styles.todayButton}
                activeOpacity={0.85}
                onPress={openAllenamentoOggi}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.todayButtonText}>Avvia allenamento di oggi</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Allenati / Quiz</Text>
              <Text style={styles.sectionSubtitle}>
                Moduli sbloccati, schema riassuntivo, quiz, sbagliati e preferiti.
              </Text>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => (moduloCorrente ? openModulo(moduloCorrente) : null)}
                activeOpacity={0.85}
              >
                <Ionicons name="book-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Schema</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => navigation.getParent()?.navigate('Quiz')}
                activeOpacity={0.85}
              >
                <Ionicons name="help-circle-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Quiz</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => navigation.getParent()?.navigate('Ripasso')}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Sbagliati</Text>
              </TouchableOpacity>
            </View>
          </>
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
                    {highlight ? 'Attivo' : 'Sbloccato'}
                  </Text>
                </View>
              </View>

              <Text style={styles.moduleTitle}>{item.titolo}</Text>
              <Text style={styles.moduleDescription} numberOfLines={2}>
                {item.descrizione || 'Apri il modulo per schema e quiz.'}
              </Text>

              <View style={styles.moduleFooter}>
                {item.is_premium ? (
                  <Text style={styles.modulePremium}>Pro</Text>
                ) : (
                  <Text style={styles.moduleFree}>Free</Text>
                )}
                <View style={styles.moduleAction}>
                  <Text style={styles.moduleActionText}>Apri</Text>
                  <Ionicons name="arrow-forward" size={15} color={theme.colors.accent} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.contentContainer}
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
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  todayCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    marginBottom: 14,
  },
  todayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  todayPercent: {
    color: '#8CE3B8',
    fontSize: 20,
    fontWeight: '900',
  },
  todaySubtitle: {
    color: '#D7E4F1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#4EC38A',
  },
  todayButton: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 3,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
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
