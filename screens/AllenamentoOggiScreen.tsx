import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useModuli } from '../hooks/useModuli';
import { useEntitlements } from '../hooks/useEntitlements';
import { useRoadmapProgress } from '../hooks/useRoadmapProgress';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

type RoadmapSezione = {
  id: number;
  modulo_id: number;
  titolo: string;
  ordine: number;
};

export default function AllenamentoOggiScreen({ navigation }: any) {
  const { data: entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const { data: moduli = [], isLoading: moduliLoading } = useModuli();
  const {
    completedByModulo,
    isLoading: progressLoading,
    markSectionCompleted,
    resetRoadmap,
  } = useRoadmapProgress();

  const roadmapModuli = useMemo(() => moduli.slice(0, 2), [moduli]);
  const moduloIds = useMemo(() => roadmapModuli.map((m) => m.id), [roadmapModuli]);

  const { data: sezioni = [], isLoading: sezioniLoading } = useQuery({
    queryKey: ['roadmap_sezioni', moduloIds],
    queryFn: async () => {
      if (moduloIds.length === 0) return [];

      const { data, error } = await supabase
        .from('sezioni')
        .select('id, modulo_id, titolo, ordine')
        .in('modulo_id', moduloIds)
        .eq('is_attivo', true)
        .order('modulo_id', { ascending: true })
        .order('ordine', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as RoadmapSezione[];
    },
    enabled: moduloIds.length > 0,
  });

  const sezioniByModulo = useMemo(() => {
    const grouped: Record<number, RoadmapSezione[]> = {};
    for (const sezione of sezioni) {
      if (!grouped[sezione.modulo_id]) grouped[sezione.modulo_id] = [];
      grouped[sezione.modulo_id].push(sezione);
    }
    return grouped;
  }, [sezioni]);

  const totals = useMemo(() => {
    const total = sezioni.length;
    let completed = 0;

    for (const moduloId of moduloIds) {
      const done = completedByModulo[String(moduloId)] || [];
      completed += done.length;
    }

    const clampedCompleted = total > 0 ? Math.min(completed, total) : 0;
    const percentage = total > 0 ? Math.round((clampedCompleted / total) * 100) : 0;

    return { total, completed: clampedCompleted, percentage };
  }, [completedByModulo, moduloIds, sezioni.length]);

  const isLoading = entitlementsLoading || moduliLoading || progressLoading || sezioniLoading;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!entitlements?.hasPro) {
    return (
      <View style={styles.centeredLocked}>
        <Text style={styles.lockedTitle}>Solo piano Pro</Text>
        <Text style={styles.lockedText}>Tutto il percorso Allenamento è disponibile solo con abbonamento premium.</Text>
        <TouchableOpacity style={styles.lockedButton} onPress={() => navigation.getParent()?.navigate('Profilo')}>
          <Text style={styles.lockedButtonText}>Vai al profilo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.hero, theme.shadows.mild]}>
        <Text style={styles.heroKicker}>Allenamento di oggi</Text>
        <Text style={styles.heroTitle}>{totals.percentage}% completato</Text>
        <Text style={styles.heroSubtitle}>Roadmap sequenziale: in ogni modulo è cliccabile solo la prossima sezione.</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totals.percentage}%` }]} />
        </View>
      </View>

      {roadmapModuli.map((modulo, moduloIndex) => {
        const moduloSezioni = sezioniByModulo[modulo.id] || [];
        const completedIds = completedByModulo[String(modulo.id)] || [];
        const activeIndex = moduloSezioni.findIndex((sezione) => !completedIds.includes(sezione.id));

        return (
          <View key={modulo.id} style={[styles.moduloCard, theme.shadows.mild]}>
            <Text style={styles.moduloTitle}>{moduloIndex + 1}. {modulo.titolo}</Text>

            <View style={styles.sezioniList}>
              {moduloSezioni.map((sezione, sezioneIndex) => {
                const isDone = completedIds.includes(sezione.id);
                const isActive = activeIndex === -1 ? false : sezioneIndex === activeIndex;
                const isLocked = !isDone && !isActive;

                return (
                  <View
                    key={sezione.id}
                    style={[styles.sezioneItem, isLocked && styles.sezioneItemLocked, isActive && styles.sezioneItemActive]}
                  >
                    <View style={styles.sezioneTopRow}>
                      <Text style={styles.sezioneTitle}>{sezioneIndex + 1}. {sezione.titolo}</Text>
                      {isDone ? (
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                      ) : isLocked ? (
                        <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
                      ) : (
                        <Ionicons name="play-circle" size={18} color={theme.colors.accent} />
                      )}
                    </View>

                    {!isLocked && !isDone && (
                      <View style={styles.sezioneActions}>
                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => navigation.navigate('DettaglioSezione', {
                            sezioneId: sezione.id,
                            sezioneTitolo: sezione.titolo,
                            moduloId: modulo.id,
                            isRipassoErrori: false,
                          })}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.primaryBtnText}>Apri sezione</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() => markSectionCompleted(modulo.id, sezione.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.secondaryBtnText}>Segna completata</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isDone && (
                      <View style={styles.sezioneActions}>
                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => navigation.navigate('DettaglioSezione', {
                            sezioneId: sezione.id,
                            sezioneTitolo: sezione.titolo,
                            moduloId: modulo.id,
                            isRipassoErrori: false,
                          })}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.primaryBtnText}>Riapri sezione</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.resetButton} onPress={resetRoadmap} activeOpacity={0.85}>
        <Text style={styles.resetButtonText}>Reset roadmap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  centeredLocked: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  lockedTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  lockedText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  lockedButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  lockedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  hero: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
    padding: 18,
  },
  heroKicker: {
    color: '#C6D8EA',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 5,
  },
  heroSubtitle: {
    color: '#D8E5F2',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#4EC38A',
  },
  moduloCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  moduloTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  sezioniList: {
    gap: 8,
  },
  sezioneItem: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#DEE8F2',
    backgroundColor: '#FAFCFF',
    padding: 10,
  },
  sezioneItemActive: {
    borderColor: '#B4D2EB',
    backgroundColor: '#F4F9FF',
  },
  sezioneItemLocked: {
    opacity: 0.45,
  },
  sezioneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sezioneTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
    paddingRight: 10,
  },
  sezioneActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    paddingVertical: 9,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#EAF2FA',
    alignItems: 'center',
    paddingVertical: 9,
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  resetButton: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#E7EEF5',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 2,
  },
  resetButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
