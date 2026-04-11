import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { useDailyTrainingProgress, type DailyStep } from '../hooks/useDailyTrainingProgress';

type RoadmapStep = {
  key: DailyStep;
  title: string;
  description: string;
  cta: string;
};

const ROADMAP_STEPS: RoadmapStep[] = [
  {
    key: 'podcast',
    title: 'Podcast + schema',
    description: 'Apri la lezione guidata di oggi e leggi lo schema riassuntivo.',
    cta: 'Apri contenuto',
  },
  {
    key: 'quiz',
    title: 'Quiz del giorno',
    description: 'Fai uno sprint quiz sulla sezione attiva.',
    cta: 'Apri quiz',
  },
  {
    key: 'ripasso',
    title: 'Ripasso errori',
    description: 'Consolida con i quiz sbagliati / da rivedere.',
    cta: 'Apri ripasso',
  },
];

export default function AllenamentoOggiScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId } = route.params;
  const {
    steps,
    isLoading,
    percentage,
    activeStepIndex,
    allCompleted,
    markStepDone,
    resetToday,
  } = useDailyTrainingProgress();

  function openStep(step: DailyStep) {
    if (step === 'podcast') {
      navigation.push('DettaglioSezione', {
        sezioneId,
        sezioneTitolo,
        moduloId,
        isRipassoErrori: false,
      });
      return;
    }

    if (step === 'quiz') {
      navigation.push('QuizSessione', {
        sezioneId,
        sezioneTitolo,
        moduloId,
        isRipassoErrori: false,
        quizPerSprint: 10,
      });
      return;
    }

    navigation.getParent()?.navigate('Ripasso');
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.hero, theme.shadows.mild]}>
        <Text style={styles.kicker}>Allenamento di oggi</Text>
        <Text style={styles.title}>{percentage}% completato</Text>
        <Text style={styles.subtitle}>
          Percorso guidato: podcast, quiz e ripasso. Gli step successivi restano bloccati finché non completi quello attivo.
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>
      </View>

      <View style={styles.roadmap}>
        {ROADMAP_STEPS.map((step, index) => {
          const isDone = steps[step.key];
          const isActive = activeStepIndex === index;
          const isLocked = index > activeStepIndex;

          return (
            <View
              key={step.key}
              style={[
                styles.stepCard,
                theme.shadows.mild,
                isActive && styles.stepCardActive,
                isLocked && styles.stepCardLocked,
              ]}
            >
              <View style={styles.stepTopRow}>
                <Text style={styles.stepTitle}>{index + 1}. {step.title}</Text>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                ) : isLocked ? (
                  <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
                ) : (
                  <Ionicons name="play-circle" size={20} color={theme.colors.accent} />
                )}
              </View>

              <Text style={styles.stepDescription}>{step.description}</Text>

              {!isLocked && !isDone && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionPrimary} onPress={() => openStep(step.key)} activeOpacity={0.85}>
                    <Text style={styles.actionPrimaryText}>{step.cta}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionSecondary}
                    onPress={() => markStepDone(step.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionSecondaryText}>Segna fatto</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {allCompleted && (
        <TouchableOpacity style={styles.resetButton} onPress={resetToday} activeOpacity={0.85}>
          <Text style={styles.resetButtonText}>Ricomincia percorso di oggi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    gap: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  hero: {
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    backgroundColor: '#163552',
  },
  kicker: {
    color: '#A2BED7',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#D4E2F1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4EC38A',
    borderRadius: theme.borderRadius.full,
  },
  roadmap: {
    gap: 10,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepCardActive: {
    borderColor: '#B4D2EB',
    backgroundColor: '#F7FBFF',
  },
  stepCardLocked: {
    opacity: 0.52,
  },
  stepTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  stepDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionPrimary: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  actionSecondary: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#EAF2FA',
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionSecondaryText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  resetButton: {
    marginTop: 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#E7EEF5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
});
