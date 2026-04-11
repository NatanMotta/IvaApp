// screens/DettaglioSezioneScreen.tsx
// Mostra il dettaglio di una sezione: mini-lezione, schema riassuntivo
// e bottone per iniziare i quiz.

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDettaglioSezione } from '../hooks/useSezioni';
import { theme } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { RichText } from '../components/RichText';
import { useEntitlements } from '../hooks/useEntitlements';
import { useModuli } from '../hooks/useModuli';
import { canAccessModulo } from '../lib/entitlements';

export default function DettaglioSezioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId, isRipassoErrori } = route.params;
  const { data: entitlements } = useEntitlements();
  const { data: moduli = [], isLoading: moduliLoading } = useModuli();
  const modulo = moduli.find((m) => m.id === moduloId) ?? null;
  const moduloLocked = !isRipassoErrori && modulo ? !canAccessModulo(modulo, !!entitlements?.hasPro) : false;

  const { data: sezione, isLoading, isError } = useDettaglioSezione(isRipassoErrori ? 0 : sezioneId);
  const [showLezione, setShowLezione] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [quizPerSprint, setQuizPerSprint] = useState<10 | 20>(10);

  if ((isLoading || moduliLoading) && !isRipassoErrori) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (isError && !isRipassoErrori) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red' }}>Errore nel caricamento del dettaglio.</Text>
      </View>
    );
  }

  if (moduloLocked) {
    return (
      <View style={styles.centeredLocked}>
        <Text style={styles.lockedTitle}>Sezione Premium</Text>
        <Text style={styles.lockedText}>Per aprire questa sezione è richiesto il piano Pro.</Text>
        <TouchableOpacity
          style={styles.lockedButton}
          onPress={() => navigation.getParent()?.navigate('Profilo')}
          activeOpacity={0.85}
        >
          <Text style={styles.lockedButtonText}>Gestisci abbonamento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isRipassoErrori) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.hero, theme.shadows.mild]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.heroTitle}>Focus Errori</Text>
          <Text style={styles.heroSubtitle}>
            Sprint da {quizPerSprint} domande casuali tra i quiz che hai sbagliato.
          </Text>
        </LinearGradient>

        <View style={[styles.card, theme.shadows.mild]}>
          <Text style={styles.cardTitle}>Come funziona</Text>
          <Text style={styles.cardText}>
            Ogni risposta corretta viene rimossa automaticamente dalla lista di ripasso.
          </Text>
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

        <TouchableOpacity
          style={[styles.bottone, theme.shadows.mild]}
          onPress={() => navigation.push('QuizSessione', {
            sezioneId,
            sezioneTitolo,
            moduloId,
            isRipassoErrori: true,
            quizPerSprint,
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.bottoneText}>Inizia ripasso →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.hero, theme.shadows.mild]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>{sezioneTitolo}</Text>
        <Text style={styles.heroSubtitle}>Leggi e poi fai uno sprint di quiz.</Text>
      </LinearGradient>

      <View style={[styles.card, theme.shadows.mild]}>
        <TouchableOpacity
          style={styles.toggleHeader}
          onPress={() => setShowLezione((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.cardTitleNoMargin}>Lezione</Text>
          <Text style={styles.toggleIcon}>{showLezione ? '−' : '+'}</Text>
        </TouchableOpacity>
        {showLezione ? (
          (sezione?.lezione_testo ?? '').trim() ? (
            <RichText content={(sezione?.lezione_testo ?? '').trim()} />
          ) : (
            <Text style={styles.cardText}>Contenuto non ancora disponibile.</Text>
          )
        ) : null}
      </View>

      <View style={[styles.card, theme.shadows.mild]}>
        <TouchableOpacity
          style={styles.toggleHeader}
          onPress={() => setShowSchema((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.cardTitleNoMargin}>Schema</Text>
          <Text style={styles.toggleIcon}>{showSchema ? '−' : '+'}</Text>
        </TouchableOpacity>
        {showSchema ? (
          (sezione?.schema_testo ?? '').trim() ? (
            <RichText content={(sezione?.schema_testo ?? '').trim()} />
          ) : (
            <Text style={styles.cardText}>Contenuto non ancora disponibile.</Text>
          )
        ) : null}
      </View>

      {/* Setup quiz */}
      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Sprint quiz</Text>
        <Text style={styles.cardTextSmall}>Domande casuali, una alla volta.</Text>

        <View style={[styles.chipsRow, { marginTop: 12 }]}>
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

      <TouchableOpacity
        style={[styles.bottone, theme.shadows.mild]}
        onPress={() => navigation.push('QuizSessione', {
          sezioneId,
          sezioneTitolo,
          moduloId,
          isRipassoErrori: false,
          quizPerSprint,
        })}
        activeOpacity={0.85}
      >
        <Text style={styles.bottoneText}>Inizia i quiz →</Text>
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
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: 16,
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
    padding: 20,
    borderRadius: theme.borderRadius.xl,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 10,
  },
  cardTitleNoMargin: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
    lineHeight: 20,
  },
  cardText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  cardTextSmall: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
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
  bottone: {
    backgroundColor: theme.colors.accent,
    padding: 18,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  bottoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
