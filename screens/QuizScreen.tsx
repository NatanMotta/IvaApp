import { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';
import { useModuli } from '../hooks/useModuli';
import { useSezioni } from '../hooks/useSezioni';
import { useEntitlements } from '../hooks/useEntitlements';
import { canAccessModulo } from '../lib/entitlements';

type Option = { id: number; label: string; subtitle?: string };

function SelectModal({
  visible,
  title,
  options,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedId: number | null;
  onClose: () => void;
  onSelect: (opt: Option) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, theme.shadows.premium]} onPress={() => null}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>Chiudi</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {!!item.subtitle && (
                      <Text style={styles.optionSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {selected && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.optionSeparator} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function QuizScreen({ navigation }: any) {
  const { data: moduli = [], isLoading: moduliLoading, isError: moduliError } = useModuli();
  const { data: entitlements } = useEntitlements();

  const [moduloId, setModuloId] = useState<number | null>(null);
  const [sezioneId, setSezioneId] = useState<number | null>(null);
  const [quizPerSprint, setQuizPerSprint] = useState<10 | 20>(10);

  const [moduloModalOpen, setModuloModalOpen] = useState(false);
  const [sezioneModalOpen, setSezioneModalOpen] = useState(false);

  useEffect(() => {
    if (!moduloId && moduli.length > 0) {
      const primoAccessibile = moduli.find((m) => canAccessModulo(m, !!entitlements?.hasPro));
      setModuloId((primoAccessibile ?? moduli[0]).id);
    }
  }, [entitlements?.hasPro, moduli, moduloId]);

  const moduloSelected = moduli.find((m) => m.id === moduloId) ?? null;
  const moduloLocked = moduloSelected ? !canAccessModulo(moduloSelected, !!entitlements?.hasPro) : false;

  const { data: sezioni = [], isLoading: sezioniLoading } = useSezioni(moduloLocked ? 0 : (moduloId ?? 0));

  useEffect(() => {
    if (sezioni.length === 0) {
      setSezioneId(null);
      return;
    }
    if (!sezioneId || !sezioni.some((s) => s.id === sezioneId)) {
      setSezioneId(sezioni[0].id);
    }
  }, [sezioni, sezioneId]);

  const moduloOptions = useMemo<Option[]>(
    () => moduli.map((m) => {
      const locked = !canAccessModulo(m, !!entitlements?.hasPro);
      return {
        id: m.id,
        label: locked ? `${m.titolo} · Pro` : m.titolo,
        subtitle: locked ? 'Sblocca con abbonamento Pro' : m.descrizione,
      };
    }),
    [entitlements?.hasPro, moduli]
  );

  const sezioneOptions = useMemo<Option[]>(
    () => sezioni.map((s) => ({ id: s.id, label: s.titolo, subtitle: s.descrizione })),
    [sezioni]
  );

  const sezioneSelected = sezioni.find((s) => s.id === sezioneId) ?? null;
  const canStartSezione = !!sezioneSelected && !sezioniLoading && !moduloLocked;

  if (moduliLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (moduliError || !moduloSelected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Non riesco a caricare i moduli per iniziare un quiz.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.hero, theme.shadows.mild]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Quiz</Text>
        <Text style={styles.heroSubtitle}>Scegli cosa allenare e fai uno sprint.</Text>
      </LinearGradient>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Selezione</Text>

        <TouchableOpacity
          style={styles.pickerRow}
          onPress={() => setModuloModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.pickerLabel}>Modulo</Text>
          <Text style={styles.pickerValue} numberOfLines={1}>{moduloSelected.titolo}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickerRow}
          onPress={() => setSezioneModalOpen(true)}
          activeOpacity={0.8}
          disabled={sezioniLoading || sezioneOptions.length === 0 || moduloLocked}
        >
          <Text style={styles.pickerLabel}>Sezione</Text>
          <Text style={styles.pickerValue} numberOfLines={1}>
            {moduloLocked
              ? 'Modulo premium bloccato'
              : (sezioniLoading ? 'Caricamento…' : (sezioneSelected?.titolo ?? 'Nessuna sezione'))}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Domande per sessione</Text>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, quizPerSprint === 10 && styles.chipActive]}
            onPress={() => setQuizPerSprint(10)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, quizPerSprint === 10 && styles.chipTextActive]}>10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, quizPerSprint === 20 && styles.chipActive]}
            onPress={() => setQuizPerSprint(20)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, quizPerSprint === 20 && styles.chipTextActive]}>20</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ gap: 12, marginTop: 'auto' }}>
        <TouchableOpacity
          style={[styles.button, !canStartSezione && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={!canStartSezione}
          onPress={() => {
            if (!sezioneSelected) return;
            navigation.push('QuizSessione', {
              sezioneId: sezioneSelected.id,
              sezioneTitolo: sezioneSelected.titolo,
              moduloId: moduloSelected.id,
              isRipassoErrori: false,
              quizPerSprint,
            });
          }}
        >
          <Text style={styles.buttonText}>Inizia sprint (sezione) →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, moduloLocked && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={moduloLocked}
          onPress={() => navigation.push('QuizSessione', {
            sezioneId: 0,
            sezioneTitolo: `${moduloSelected.titolo} • Misto`,
            moduloId: moduloSelected.id,
            isRipassoErrori: false,
            quizPerSprint,
            quizScope: 'modulo',
          })}
        >
          <Text style={styles.buttonSecondaryText}>Sprint misto (modulo) →</Text>
        </TouchableOpacity>
      </View>

      <SelectModal
        visible={moduloModalOpen}
        title="Scegli modulo"
        options={moduloOptions}
        selectedId={moduloId}
        onClose={() => setModuloModalOpen(false)}
        onSelect={(opt) => {
          const scelto = moduli.find((m) => m.id === opt.id);
          if (scelto && !canAccessModulo(scelto, !!entitlements?.hasPro)) {
            setModuloModalOpen(false);
            Alert.alert(
              'Modulo Premium',
              'Per allenarti su questo modulo serve il piano Pro.',
              [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Apri profilo', onPress: () => navigation.getParent()?.navigate('Profilo') },
              ]
            );
            return;
          }
          setModuloModalOpen(false);
          setModuloId(opt.id);
        }}
      />

      <SelectModal
        visible={sezioneModalOpen}
        title="Scegli sezione"
        options={sezioneOptions}
        selectedId={sezioneId}
        onClose={() => setSezioneModalOpen(false)}
        onSelect={(opt) => {
          setSezioneModalOpen(false);
          setSezioneId(opt.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    paddingTop: 24,
    gap: 16,
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
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#D2DFED',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: theme.colors.accent,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: 18,
    alignItems: 'center',
    ...theme.shadows.mild,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  buttonSecondaryText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: 16,
    maxHeight: '75%',
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
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionRowSelected: {
    backgroundColor: theme.colors.accentLight,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  optionLabelSelected: {
    color: theme.colors.accent,
  },
  optionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  optionCheck: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.8,
    marginHorizontal: 8,
  },
});
