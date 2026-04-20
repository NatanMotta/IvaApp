import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useModuli, type Modulo } from '../hooks/useModuli';
import { theme } from '../lib/theme';
import { Skeleton } from '../components/Skeleton';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';
import { useRoadmapProgress } from '../hooks/useRoadmapProgress';
import { supabase } from '../lib/supabase';

const LAST_MODULO_KEY = '@ivaapp_last_modulo_id';

type RoadmapSezione = {
  id: number;
  modulo_id: number;
  titolo: string;
  ordine: number;
};

export default function HomeScreen({ navigation }: any) {
  const { data: moduli = [], isLoading, isError } = useModuli();
  const { data: entitlements } = useEntitlements();
  const [lastModuloId, setLastModuloId] = useState<number | null>(null);
  const { completedByModulo, isLoading: progressLoading } = useRoadmapProgress();

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

  const roadmapModuli = useMemo(() => moduli.slice(0, 2), [moduli]);
  const roadmapModuloIds = useMemo(() => roadmapModuli.map((m) => m.id), [roadmapModuli]);

  const { data: roadmapSezioni = [], isLoading: roadmapLoading } = useQuery({
    queryKey: ['home_roadmap_sezioni', roadmapModuloIds],
    queryFn: async () => {
      if (roadmapModuloIds.length === 0) return [];

      const { data, error } = await supabase
        .from('sezioni')
        .select('id, modulo_id, titolo, ordine')
        .in('modulo_id', roadmapModuloIds)
        .eq('is_attivo', true)
        .order('modulo_id', { ascending: true })
        .order('ordine', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as RoadmapSezione[];
    },
    enabled: roadmapModuloIds.length > 0,
  });

  const roadmapPercentage = useMemo(() => {
    const total = roadmapSezioni.length;
    if (total === 0) return 0;

    let completed = 0;
    for (const moduloId of roadmapModuloIds) {
      completed += (completedByModulo[String(moduloId)] || []).length;
    }

    return Math.round((Math.min(completed, total) / total) * 100);
  }, [completedByModulo, roadmapModuloIds, roadmapSezioni.length]);

  const primaSezioneSbloccata = useMemo(() => {
    if (roadmapModuli.length === 0 || roadmapSezioni.length === 0) return null;

    const byModulo: Record<number, RoadmapSezione[]> = {};
    for (const sezione of roadmapSezioni) {
      if (!byModulo[sezione.modulo_id]) byModulo[sezione.modulo_id] = [];
      byModulo[sezione.modulo_id].push(sezione);
    }

    for (const modulo of roadmapModuli) {
      const sezioniModulo = byModulo[modulo.id] || [];
      const completedIds = completedByModulo[String(modulo.id)] || [];
      const unlocked = sezioniModulo.find((s) => !completedIds.includes(s.id));
      if (unlocked) return { moduloId: modulo.id, sezione: unlocked };
    }

    const primoModulo = roadmapModuli[0];
    const primaSezione = byModulo[primoModulo.id]?.[0];
    if (!primaSezione) return null;

    return {
      moduloId: primoModulo.id,
      sezione: primaSezione,
    };
  }, [completedByModulo, roadmapModuli, roadmapSezioni]);

  async function openModulo(modulo: Modulo) {
    const hasAccess = canAccessModulo(modulo, !!entitlements?.hasPro);
    if (!hasAccess) {
      Alert.alert(
        'Solo piano Pro',
        'Tutto il percorso è disponibile solo con abbonamento premium.',
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

  function openLezioneDiOggi() {
    if (!entitlements?.hasPro) {
      Alert.alert('Solo piano Pro', 'Per iniziare l’allenamento serve abbonamento premium.');
      return;
    }

    if (!primaSezioneSbloccata) {
      Alert.alert('Nessuna sezione disponibile', 'La roadmap non ha ancora sezioni attive.');
      return;
    }

    navigation.navigate('DettaglioSezione', {
      sezioneId: primaSezioneSbloccata.sezione.id,
      sezioneTitolo: primaSezioneSbloccata.sezione.titolo,
      moduloId: primaSezioneSbloccata.moduloId,
      isRipassoErrori: false,
      isDailyImmersion: true,
    });
  }

  if (isLoading || progressLoading || roadmapLoading) {
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={moduli}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <View style={[styles.todayCard, theme.shadows.mild]}>
              <View style={styles.todayTopRow}>
                <Text style={styles.todayTitle}>Il tuo percorso guidato</Text>
                <Text style={styles.todayPercent}>{roadmapPercentage}%</Text>
              </View>
              <Text style={styles.todaySubtitle}>
                Modulo: {moduloCorrente?.titolo ?? '-'}
              </Text>
              <Text style={styles.todayCurrentSection}>
                Sezione: {primaSezioneSbloccata?.sezione.titolo ?? 'Nessuna sezione disponibile'}
              </Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${roadmapPercentage}%` }]} />
              </View>

              <TouchableOpacity
                style={styles.todayButton}
                activeOpacity={0.85}
                onPress={openLezioneDiOggi}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.todayButtonText}>Riprendi</Text>
              </TouchableOpacity>
            </View>

            {!entitlements?.hasPro && (
              <View style={[styles.proOnlyCard, theme.shadows.mild]}>
                <Text style={styles.proOnlyTitle}>Accesso solo Premium</Text>
                <Text style={styles.proOnlyText}>Nella versione attuale non c’è contenuto free: tutte le sezioni sono Pro.</Text>
                <TouchableOpacity
                  style={styles.proOnlyButton}
                  onPress={() => navigation.getParent()?.navigate('Profilo')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.proOnlyButtonText}>Attiva Pro</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Allenati</Text>
              <Text style={styles.sectionSubtitle}>
                Scegli il tuo allenamento.
              </Text>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => navigation.navigate('AllenamentoOggi')}
                activeOpacity={0.85}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name="rocket-outline" size={18} color={theme.colors.accent} />
                </View>
                <Text style={styles.quickActionText}>Inizia</Text>
                <Text style={styles.quickActionSubtext}>Sessione guidata</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => navigation.getParent()?.navigate('Percorso')}
                activeOpacity={0.85}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name="options-outline" size={18} color={theme.colors.accent} />
                </View>
                <Text style={styles.quickActionText}>Allenamento personalizzato</Text>
                <Text style={styles.quickActionSubtext}>Scegli gli argomenti</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, theme.shadows.mild]}
                onPress={() => navigation.getParent()?.navigate('Percorso')}
                activeOpacity={0.85}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name="refresh-circle-outline" size={18} color={theme.colors.accent} />
                </View>
                <Text style={styles.quickActionText}>Ripassa gli errori</Text>
                <Text style={styles.quickActionSubtext}>Correggi e migliora</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          const highlight = moduloCorrente?.id === item.id;
          const hasAccess = canAccessModulo(item, !!entitlements?.hasPro);

          return (
            <TouchableOpacity
              style={[styles.moduleCard, theme.shadows.mild, highlight && styles.moduleCardHighlight, !hasAccess && styles.moduleCardLocked]}
              activeOpacity={0.85}
              onPress={() => openModulo(item)}
            >
              <View style={styles.moduleTop}>
                <Text style={styles.moduleIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={[styles.stateBadge, hasAccess ? styles.stateBadgeActive : styles.stateBadgeIdle]}>
                  <Text style={[styles.stateBadgeText, hasAccess && styles.stateBadgeTextActive]}>
                    {hasAccess ? 'Sbloccato' : 'Bloccato'}
                  </Text>
                </View>
              </View>

              <Text style={styles.moduleTitle}>{item.titolo}</Text>
              <Text style={styles.moduleDescription} numberOfLines={2}>
                {item.descrizione || 'Apri il modulo per schema e quiz.'}
              </Text>

              <View style={styles.moduleFooter}>
                <Text style={styles.modulePremium}>Pro</Text>
                <View style={styles.moduleAction}>
                  <Text style={styles.moduleActionText}>{hasAccess ? 'Apri' : 'Richiede Pro'}</Text>
                  <Ionicons name="arrow-forward" size={15} color={theme.colors.accent} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
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
    marginBottom: 6,
  },
  todayCurrentSection: {
    color: '#F4FAFF',
    fontSize: 13,
    fontWeight: '700',
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
  proOnlyCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: '#F4D7A4',
    padding: 14,
    marginBottom: 4,
  },
  proOnlyTitle: {
    color: '#7C5A11',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  proOnlyText: {
    color: '#926F1E',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  proOnlyButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#E3B457',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proOnlyButtonText: {
    color: '#3E2B05',
    fontSize: 13,
    fontWeight: '800',
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
    gap: 10,
    marginBottom: 6,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#DEE7F2',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 106,
  },
  quickActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDF4FC',
    borderWidth: 1,
    borderColor: '#D4E2F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: 12.5,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 16,
  },
  quickActionSubtext: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
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
  moduleCardLocked: {
    opacity: 0.55,
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
    backgroundColor: '#E9EDF3',
  },
  stateBadgeActive: {
    backgroundColor: '#E9F8F0',
  },
  stateBadgeText: {
    color: '#64748B',
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
