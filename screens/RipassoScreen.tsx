import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useModuli } from '../hooks/useModuli';
import { theme } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function RipassoScreen({ navigation }: any) {
  const { data: moduli = [], isLoading, isError } = useModuli();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const moduloId = moduli[0]?.id ?? null;

  if (isError || !moduloId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Nessun modulo disponibile per avviare il ripasso.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.hero, theme.shadows.mild]} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
        <Text style={styles.heroTitle}>Focus Errori</Text>
        <Text style={styles.heroSubtitle}>
          Rivedi i quiz che hai sbagliato e consolida la tua preparazione.
        </Text>
      </LinearGradient>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Modalità Sprint</Text>
        <Text style={styles.cardText}>
          Affronta uno sprint da max 20 domande casuali selezionate tra i tuoi errori recenti. 
          Ogni risposta corretta rimuove automaticamente il quiz dalla lista rossa.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() =>
          navigation.push('QuizSessioneRipasso', {
            sezioneId: 'ripasso-errori',
            sezioneTitolo: 'Ripasso Errori',
            moduloId,
            isRipassoErrori: true,
          })
        }
      >
        <Text style={styles.buttonText}>Inizia sprint ripasso</Text>
      </TouchableOpacity>
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
  hero: {
    padding: 24,
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
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: 'auto',
    marginBottom: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: 18,
    alignItems: 'center',
    ...theme.shadows.mild,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
