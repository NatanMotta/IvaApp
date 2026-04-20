import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';
import { useModuli } from '../hooks/useModuli';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';
import { useRoadmapProgress } from '../hooks/useRoadmapProgress';
import { supabase } from '../lib/supabase';

type SezioneLite = {
  id: number;
  modulo_id: number;
  titolo: string;
  ordine: number;
};

export default function QuizScreen({ navigation }: any) {
  const { data: moduli = [], isLoading: moduliLoading, isError: moduliError } = useModuli();
  const { data: entitlements } = useEntitlements();
  const { completedByModulo } = useRoadmapProgress();

  const [quizPerSprint, setQuizPerSprint] = useState<20 | 35 | 50>(20);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [expandedModuloId, setExpandedModuloId] = useState<number | null>(null);
  const [selectedCustomSezioni, setSelectedCustomSezioni] = useState<number[]>([]);

  const hasPro = !!entitlements?.hasPro;
  const moduliAccessibili = useMemo(
    () => moduli.filter((m) => canAccessModulo(m, hasPro)),
    [hasPro, moduli]
  );
  const moduloIds = useMemo(() => moduliAccessibili.map((m) => m.id), [moduliAccessibili]);

  const { data: allSezioni = [], isLoading: sezioniLoading } = useQuery({
    queryKey: ['allenati_all_sezioni', moduloIds],
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
      return (data || []) as SezioneLite[];
    },
    enabled: moduloIds.length > 0,
  });

  const sezioniByModulo = useMemo(() => {
    const grouped: Record<number, SezioneLite[]> = {};
    for (const sezione of allSezioni) {
      if (!grouped[sezione.modulo_id]) grouped[sezione.modulo_id] = [];
      grouped[sezione.modulo_id].push(sezione);
    }
    return grouped;
  }, [allSezioni]);

  const unlockedSezioneIds = useMemo(() => {
    const ids: number[] = [];

    for (const modulo of moduliAccessibili) {
      const sezioniModulo = sezioniByModulo[modulo.id] || [];
      const completed = completedByModulo[String(modulo.id)] || [];

      ids.push(...completed);

      const nextUnlocked = sezioniModulo.find((s) => !completed.includes(s.id));
      if (nextUnlocked) ids.push(nextUnlocked.id);
    }

    return Array.from(new Set(ids));
  }, [completedByModulo, moduliAccessibili, sezioniByModulo]);

  function ensurePremiumAccess() {
    if (hasPro) return true;
    Alert.alert(
      'Solo piano Pro',
      'Per allenarti serve il piano Pro.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Apri profilo', onPress: () => navigation.getParent()?.navigate('Profilo') },
      ]
    );
    return false;
  }

  function openCustomSelector() {
    if (!ensurePremiumAccess()) return;

    if (!expandedModuloId) {
      setExpandedModuloId(moduliAccessibili[0]?.id ?? null);
    }

    setCustomModalOpen(true);
  }

  function toggleCustomSezione(id: number) {
    setSelectedCustomSezioni((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  function startCustomTraining() {
    if (selectedCustomSezioni.length === 0) {
      Alert.alert('Seleziona almeno una sezione', 'Scegli le sezioni da includere prima di iniziare.');
      return;
    }

    const firstId = selectedCustomSezioni[0];
    const firstSection = allSezioni.find((s) => s.id === firstId);

    setCustomModalOpen(false);
    navigation.push('QuizSessione', {
      sezioneId: 0,
      sezioneTitolo: 'Allenamento personalizzato',
      moduloId: firstSection?.modulo_id ?? moduliAccessibili[0]?.id ?? 0,
      isRipassoErrori: false,
      quizPerSprint,
      quizScope: 'custom-sezioni',
      sezioneIds: selectedCustomSezioni,
    });
  }

  function startQuickTraining() {
    if (!ensurePremiumAccess()) return;

    if (unlockedSezioneIds.length === 0) {
      Alert.alert('Nessuna sezione sbloccata', 'Completa almeno una sezione nel percorso per iniziare.');
      return;
    }

    navigation.push('QuizSessione', {
      sezioneId: 0,
      sezioneTitolo: 'Allenamento rapido',
      moduloId: moduliAccessibili[0]?.id ?? 0,
      isRipassoErrori: false,
      quizPerSprint,
      quizScope: 'custom-sezioni',
      sezioneIds: unlockedSezioneIds,
    });
  }

  function startErrorReview() {
    if (!ensurePremiumAccess()) return;

    navigation.push('QuizSessione', {
      sezioneId: 0,
      sezioneTitolo: 'Ripassa gli errori',
      moduloId: moduliAccessibili[0]?.id ?? 0,
      isRipassoErrori: true,
      quizPerSprint,
    });
  }

  if (moduliLoading || sezioniLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (moduliError || moduli.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Non riesco a caricare i moduli per iniziare un quiz.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.hero, theme.shadows.mild]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Allenati</Text>
        <Text style={styles.heroSubtitle}>Scegli il tuo allenamento.</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quante domande</Text>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, quizPerSprint === 20 && styles.chipActive]}
            onPress={() => setQuizPerSprint(20)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, quizPerSprint === 20 && styles.chipTextActive]}>20</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, quizPerSprint === 35 && styles.chipActive]}
            onPress={() => setQuizPerSprint(35)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, quizPerSprint === 35 && styles.chipTextActive]}>35</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, quizPerSprint === 50 && styles.chipActive]}
            onPress={() => setQuizPerSprint(50)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, quizPerSprint === 50 && styles.chipTextActive]}>50</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Scegli il tuo allenamento</Text>

      <View style={styles.trainingCards}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trainingCard}
        >
          <Text style={styles.trainingTitle}>Allenamento rapido</Text>
          <Text style={styles.trainingSubtitle}>Sessione automatica sugli argomenti già trattati</Text>
          <TouchableOpacity style={styles.trainingCtaBlue} onPress={startQuickTraining} activeOpacity={0.88}>
            <Text style={styles.trainingCtaBlueText}>Inizia subito</Text>
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trainingCard}
        >
          <Text style={styles.trainingTitle}>Allenamento personalizzato</Text>
          <Text style={styles.trainingSubtitle}>Scegli moduli e sezioni da includere</Text>
          <TouchableOpacity style={styles.trainingCtaBlue} onPress={openCustomSelector} activeOpacity={0.88}>
            <Text style={styles.trainingCtaBlueText}>Scegli cosa allenare</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.trainingCardError}>
          <Text style={styles.trainingErrorTitle}>Ripassa gli errori</Text>
          <Text style={styles.trainingErrorSubtitle}>Correggi le domande sbagliate</Text>
          <TouchableOpacity style={styles.trainingCtaRed} onPress={startErrorReview} activeOpacity={0.88}>
            <Text style={styles.trainingCtaRedText}>Correggi gli errori</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={customModalOpen} animationType="slide" transparent onRequestClose={() => setCustomModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCustomModalOpen(false)}>
          <Pressable style={[styles.customSheet, theme.shadows.premium]} onPress={() => null}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allenamento personalizzato</Text>
              <TouchableOpacity onPress={() => setCustomModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.customHintTitle}>Scegli le sezioni da includere</Text>
            <Text style={styles.customHintText}>
              (gli argomenti in <Text style={styles.customHintBold}>grassetto</Text> sono quelli che hai già trattato nel tuo percorso)
            </Text>

            <FlatList
              data={moduliAccessibili}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const expanded = expandedModuloId === item.id;
                const sezioniModulo = sezioniByModulo[item.id] || [];
                return (
                  <View style={styles.customModuloBox}>
                    <TouchableOpacity
                      style={styles.customModuloHeader}
                      onPress={() => setExpandedModuloId((curr) => (curr === item.id ? null : item.id))}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.customModuloTitle}>{item.titolo}</Text>
                      <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={styles.customSectionsWrap}>
                        {sezioniModulo.map((sezione) => {
                          const checked = selectedCustomSezioni.includes(sezione.id);
                          const doneIds = completedByModulo[String(item.id)] || [];
                          const alreadyDone = doneIds.includes(sezione.id);

                          return (
                            <TouchableOpacity
                              key={sezione.id}
                              style={styles.customSectionRow}
                              onPress={() => toggleCustomSezione(sezione.id)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? '#4EA884' : '#B9C4D8'} />
                              <Text style={[styles.customSectionText, alreadyDone && styles.customSectionTextDone]}>{sezione.titolo}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }}
            />

            <TouchableOpacity style={styles.customStartBtn} onPress={startCustomTraining} activeOpacity={0.85}>
              <Text style={styles.customStartBtnText}>Inizia allenamento</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 24,
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  hero: {
    padding: 22,
    borderRadius: theme.borderRadius.xl,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D2DFED',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DEE7F2',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 58,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: theme.colors.accent,
  },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  trainingCards: {
    gap: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  trainingCard: {
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trainingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  trainingSubtitle: {
    color: '#D6E5F5',
    fontSize: 12,
    marginBottom: 10,
  },
  trainingCtaBlue: {
    borderRadius: theme.borderRadius.full,
    paddingVertical: 9,
    backgroundColor: '#6E9EE2',
    alignItems: 'center',
  },
  trainingCtaBlueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  trainingCardError: {
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4B4BE',
    backgroundColor: '#FFFFFF',
  },
  trainingErrorTitle: {
    color: '#B93049',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  trainingErrorSubtitle: {
    color: '#8C4F5A',
    fontSize: 12,
    marginBottom: 10,
  },
  trainingCtaRed: {
    borderRadius: theme.borderRadius.full,
    paddingVertical: 9,
    backgroundColor: '#CD4E67',
    alignItems: 'center',
  },
  trainingCtaRedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  customSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 16,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  modalClose: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  customHintTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  customHintText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  customHintBold: {
    color: theme.colors.text,
    fontWeight: '900',
  },
  customModuloBox: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  customModuloHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customModuloTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  customSectionsWrap: {
    borderTopWidth: 1,
    borderTopColor: '#ECF1F8',
  },
  customSectionRow: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customSectionText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  customSectionTextDone: {
    color: theme.colors.text,
    fontWeight: '900',
  },
  customStartBtn: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  customStartBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
