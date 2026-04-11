import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { useEntitlements } from '../hooks/useEntitlements';

type Preferences = {
  notifQuiz: boolean;
  vibrazioneQuiz: boolean;
  mostraSpiegazioneSubito: boolean;
};

type ProfiloBase = {
  nome: string;
  email: string;
};

const PREFS_KEY = '@ivaapp_profile_preferences';

const DEFAULT_PREFS: Preferences = {
  notifQuiz: true,
  vibrazioneQuiz: true,
  mostraSpiegazioneSubito: true,
};

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconWrap, danger && styles.actionIconWrapDanger]}>
        <Ionicons
          name={icon}
          size={17}
          color={danger ? theme.colors.error : theme.colors.accent}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, danger && { color: theme.colors.error }]}>{title}</Text>
        {!!subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ProfiloScreen() {
  const { data: entitlements } = useEntitlements();
  const [profilo, setProfilo] = useState<ProfiloBase>({ nome: 'Utente', email: '' });
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const piano = useMemo(
    () => (entitlements?.tier === 'pro' ? 'Pro' : 'Free'),
    [entitlements?.tier]
  );
  const statoAbbonamento = useMemo(() => {
    const stato = entitlements?.status ?? 'inactive';
    if (stato === 'active') return 'Attivo';
    if (stato === 'trialing') return 'Trial';
    if (stato === 'past_due') return 'Pagamento in sospeso';
    if (stato === 'canceled') return 'Cancellato';
    return 'Non attivo';
  }, [entitlements?.status]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (user && isMounted) {
          const nomeDaMetadata = (user.user_metadata?.nome as string | undefined)?.trim();
          const emailDaAuth = user.email ?? '';

          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome,email')
            .eq('id', user.id)
            .maybeSingle();

          setProfilo({
            nome: profileData?.nome?.trim() || nomeDaMetadata || 'Utente',
            email: profileData?.email?.trim() || emailDaAuth,
          });
        }

        const rawPrefs = await AsyncStorage.getItem(PREFS_KEY);
        if (rawPrefs && isMounted) {
          const parsed = JSON.parse(rawPrefs) as Partial<Preferences>;
          setPrefs({
            notifQuiz: parsed.notifQuiz ?? DEFAULT_PREFS.notifQuiz,
            vibrazioneQuiz: parsed.vibrazioneQuiz ?? DEFAULT_PREFS.vibrazioneQuiz,
            mostraSpiegazioneSubito: parsed.mostraSpiegazioneSubito ?? DEFAULT_PREFS.mostraSpiegazioneSubito,
          });
        }
      } catch {
        // fallback silenzioso: manteniamo i valori default
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  async function aggiornaPreferenza<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch {
      Alert.alert('Preferenze', 'Non sono riuscito a salvare la preferenza.');
    }
  }

  async function handleCambioPassword() {
    if (!profilo.email) {
      Alert.alert('Account', 'Email non disponibile.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(profilo.email);
    if (error) {
      Alert.alert('Errore', error.message);
      return;
    }
    Alert.alert('Controlla la mail', 'Ti ho inviato il link per cambiare password.');
  }

  async function apriMail(subject: string, body: string) {
    const url = `mailto:supporto@ivaapp.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Supporto', 'Nessuna app email disponibile sul dispositivo.');
      return;
    }
    await Linking.openURL(url);
  }

  async function handleSegnalaErrore() {
    await apriMail(
      'Segnalazione errore IvaApp',
      `Ciao team,\n\nho riscontrato un problema.\n\nDettagli:\n- Schermata:\n- Cosa stavo facendo:\n- Cosa è successo:\n\nEmail account: ${profilo.email || 'n/d'}`
    );
  }

  async function handleContattaSupporto() {
    await apriMail(
      'Richiesta supporto IvaApp',
      `Ciao team,\n\nho bisogno di supporto su:\n\nEmail account: ${profilo.email || 'n/d'}`
    );
  }

  function handleSubscription() {
    Alert.alert(
      'Gestione subscription',
      entitlements?.hasPro
        ? 'Il tuo piano Pro risulta attivo. Per modifiche contatta supporto@ivaapp.it.'
        : 'Se vuoi passare a Pro, scrivi a supporto@ivaapp.it per attivazione manuale.'
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        style={[styles.hero, theme.shadows.mild]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroTitle}>{profilo.nome}</Text>
        <Text style={styles.heroSubtitle}>{profilo.email || 'Email non disponibile'}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>Piano {piano}</Text>
        </View>
      </LinearGradient>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Preferenze</Text>

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Promemoria quiz</Text>
            <Text style={styles.prefSubtitle}>Ricevi reminder per allenarti ogni settimana.</Text>
          </View>
          <Switch
            value={prefs.notifQuiz}
            onValueChange={(v) => aggiornaPreferenza('notifQuiz', v)}
            thumbColor="#fff"
            trackColor={{ false: '#CBD5E1', true: theme.colors.accent }}
          />
        </View>

        <View style={styles.prefDivider} />

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Feedback vibrazione quiz</Text>
            <Text style={styles.prefSubtitle}>Conferma tattile su risposta corretta/errata.</Text>
          </View>
          <Switch
            value={prefs.vibrazioneQuiz}
            onValueChange={(v) => aggiornaPreferenza('vibrazioneQuiz', v)}
            thumbColor="#fff"
            trackColor={{ false: '#CBD5E1', true: theme.colors.accent }}
          />
        </View>

        <View style={styles.prefDivider} />

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Mostra spiegazione dopo la risposta</Text>
            <Text style={styles.prefSubtitle}>Mantieni la spiegazione visibile ad ogni domanda.</Text>
          </View>
          <Switch
            value={prefs.mostraSpiegazioneSubito}
            onValueChange={(v) => aggiornaPreferenza('mostraSpiegazioneSubito', v)}
            thumbColor="#fff"
            trackColor={{ false: '#CBD5E1', true: theme.colors.accent }}
          />
        </View>
      </View>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Account</Text>
        <ActionRow
          icon="mail-open-outline"
          title="Contatta supporto"
          subtitle="Per problemi accesso, dati o funzionalità."
          onPress={handleContattaSupporto}
        />
        <ActionRow
          icon="key-outline"
          title="Cambia password"
          subtitle="Ti inviamo un link di reset via email."
          onPress={handleCambioPassword}
        />
        <ActionRow
          icon="log-out-outline"
          title="Logout"
          subtitle="Esci in sicurezza dal tuo account."
          onPress={() => supabase.auth.signOut()}
          danger
        />
      </View>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.subscriptionInfo}>
          Piano: {piano} · Stato: {statoAbbonamento}
        </Text>
        <ActionRow
          icon="card-outline"
          title="Gestisci abbonamento"
          subtitle="Aggiorna piano, pagamento e fatturazione."
          onPress={handleSubscription}
        />
      </View>

      <View style={[styles.card, theme.shadows.mild]}>
        <Text style={styles.cardTitle}>Aiutaci a migliorare</Text>
        <ActionRow
          icon="bug-outline"
          title="Segnala un errore"
          subtitle="Invia bug, screenshot e passaggi per riprodurlo."
          onPress={handleSegnalaErrore}
        />
      </View>
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
    padding: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D2DFED',
    fontSize: 14,
    lineHeight: 20,
  },
  planBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  prefSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  prefDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentLight,
  },
  actionIconWrapDanger: {
    backgroundColor: theme.colors.errorBg,
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  subscriptionInfo: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
});
