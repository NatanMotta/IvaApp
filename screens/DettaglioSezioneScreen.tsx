// screens/DettaglioSezioneScreen.tsx
// Mostra il dettaglio di una sezione: mini-lezione, schema riassuntivo
// e bottone per iniziare i quiz.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { useDettaglioSezione } from '../hooks/useSezioni';
import { theme } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { RichText } from '../components/RichText';
import { useEntitlements } from '../hooks/useEntitlements';
import { useModuli } from '../hooks/useModuli';
import { canAccessModulo } from '../lib/entitlements';
import { useRoadmapProgress } from '../hooks/useRoadmapProgress';
import { supabase } from '../lib/supabase';

function splitIntoImmersionBlocks(raw: string): string[] {
  const clean = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  const blocks: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 260) {
      blocks.push(paragraph);
      continue;
    }

    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      blocks.push(paragraph);
      continue;
    }

    let current = '';
    for (const sentence of sentences) {
      const next = current ? `${current} ${sentence}` : sentence;
      if (next.length > 260 && current) {
        blocks.push(current);
        current = sentence;
      } else {
        current = next;
      }
    }
    if (current) blocks.push(current);
  }

  return blocks;
}

function parseCuePoints(raw: unknown): number[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 0)
      .sort((a, b) => a - b);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return parseCuePoints(parsed);
    } catch {
      return trimmed
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v >= 0)
        .sort((a, b) => a - b);
    }
  }

  return [];
}

function parseStorageRef(raw: unknown): { bucket: string; path: string } | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  // Format: bucket:path/to/file.mp3
  const colonIdx = value.indexOf(':');
  if (colonIdx > 0 && !value.startsWith('http')) {
    const bucket = value.slice(0, colonIdx).trim();
    const path = value.slice(colonIdx + 1).trim();
    if (bucket && path) return { bucket, path };
  }

  // Format: supabase://bucket/path/to/file.mp3
  if (value.startsWith('supabase://')) {
    const stripped = value.replace('supabase://', '');
    const slash = stripped.indexOf('/');
    if (slash > 0) {
      const bucket = stripped.slice(0, slash).trim();
      const path = stripped.slice(slash + 1).trim();
      if (bucket && path) return { bucket, path };
    }
  }

  return null;
}

function normalizeStoragePath(input: string, bucket: string): string {
  let value = (input ?? '').trim();
  if (!value) return value;

  // Full public URL -> extract object path
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const signMarker = `/storage/v1/object/sign/${bucket}/`;
  const privateMarker = `/storage/v1/object/private/${bucket}/`;
  const idxPublic = value.indexOf(publicMarker);
  const idxSign = value.indexOf(signMarker);
  const idxPrivate = value.indexOf(privateMarker);

  if (idxPublic >= 0) value = value.slice(idxPublic + publicMarker.length);
  if (idxSign >= 0) value = value.slice(idxSign + signMarker.length);
  if (idxPrivate >= 0) value = value.slice(idxPrivate + privateMarker.length);

  // Common prefixes copied from dashboard/links
  const prefixes = [
    `${bucket}/`,
    `public/${bucket}/`,
    `private/${bucket}/`,
    `/public/${bucket}/`,
    `/private/${bucket}/`,
    '/storage/v1/object/public/',
    '/storage/v1/object/private/',
    '/storage/v1/object/sign/',
    '/object/public/',
    '/object/private/',
    '/object/sign/',
  ];

  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length);
    }
  }

  while (value.startsWith('/')) value = value.slice(1);

  // If bucket was duplicated in path after trims, remove it once.
  if (value.startsWith(`${bucket}/`)) {
    value = value.slice(bucket.length + 1);
  }

  return value;
}

export default function DettaglioSezioneScreen({ route, navigation }: any) {
  const { sezioneId, sezioneTitolo, moduloId, isRipassoErrori, isDailyImmersion } = route.params;
  const { data: entitlements } = useEntitlements();
  const { data: moduli = [], isLoading: moduliLoading } = useModuli();
  const { markSectionCompleted } = useRoadmapProgress();
  const modulo = moduli.find((m) => m.id === moduloId) ?? null;
  const moduloLocked = !isRipassoErrori && modulo ? !canAccessModulo(modulo, !!entitlements?.hasPro) : false;

  const { data: sezione, isLoading, isError } = useDettaglioSezione(isRipassoErrori ? 0 : sezioneId);
  const [showLezione, setShowLezione] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [quizPerSprint, setQuizPerSprint] = useState<10 | 20>(10);
  const [immersionIndex, setImmersionIndex] = useState(0);
  const immersionAnim = useRef(new Animated.Value(1)).current;
  const audioRef = useRef<{ player: any; subscription?: any } | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPositionMs, setAudioPositionMs] = useState(0);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const [audioModuleReady, setAudioModuleReady] = useState(true);
  const [audioDebug, setAudioDebug] = useState<string | null>(null);

  const immersionBlocks = useMemo(
    () => splitIntoImmersionBlocks((sezione?.lezione_testo ?? '').trim()),
    [sezione?.lezione_testo]
  );
  const audioUrl = useMemo(() => {
    const row = (sezione ?? {}) as Record<string, unknown>;
    return typeof row.audio_url === 'string' ? row.audio_url : null;
  }, [sezione]);
  const audioBucket = useMemo(() => {
    const row = (sezione ?? {}) as Record<string, unknown>;
    return typeof row.audio_bucket === 'string' ? row.audio_bucket : null;
  }, [sezione]);
  const audioPath = useMemo(() => {
    const row = (sezione ?? {}) as Record<string, unknown>;
    return typeof row.audio_path === 'string' ? row.audio_path : null;
  }, [sezione]);
  const audioIsPrivate = useMemo(() => {
    const row = (sezione ?? {}) as Record<string, unknown>;
    return !!row.audio_is_private;
  }, [sezione]);
  const cuePointsFromDb = useMemo(() => {
    const row = (sezione ?? {}) as Record<string, unknown>;
    return parseCuePoints(row.audio_cues ?? row.audio_cues_json ?? row.audio_timestamps);
  }, [sezione]);

  const inDailyImmersion = !!isDailyImmersion && !isRipassoErrori;
  const immersionTotal = immersionBlocks.length;
  const immersionProgress = immersionTotal > 0 ? Math.round(((immersionIndex + 1) / immersionTotal) * 100) : 0;
  const effectiveCuePoints = useMemo(() => {
    if (immersionTotal === 0) return [];
    if (cuePointsFromDb.length === immersionTotal) return cuePointsFromDb;
    if (audioDurationMs <= 0) return [];

    const seconds = audioDurationMs / 1000;
    if (immersionTotal === 1) return [0];
    const step = seconds / immersionTotal;
    return Array.from({ length: immersionTotal }, (_, idx) => Math.max(0, Number((idx * step).toFixed(2))));
  }, [audioDurationMs, cuePointsFromDb, immersionTotal]);

  useEffect(() => {
    setImmersionIndex(0);
  }, [sezioneId, inDailyImmersion]);

  useEffect(() => {
    async function resolveAudioUrl() {
      if (!inDailyImmersion) {
        setResolvedAudioUrl(null);
        setAudioDebug(null);
        return;
      }

      const storageRefFromUrl = parseStorageRef(audioUrl);
      const bucket = audioBucket ?? storageRefFromUrl?.bucket ?? null;
      const rawPath = audioPath ?? storageRefFromUrl?.path ?? null;
      const path = bucket && rawPath ? normalizeStoragePath(rawPath, bucket) : rawPath;

      if (audioIsPrivate && bucket && path) {
        const { data, error } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60);

        if (error || !data?.signedUrl) {
          setResolvedAudioUrl(null);
          setAudioDebug(`Signed URL fallita. bucket=${bucket} path=${path}`);
          return;
        }

        setResolvedAudioUrl(data.signedUrl);
        setAudioDebug(`Audio privato OK. bucket=${bucket} path=${path}`);
        return;
      }

      setResolvedAudioUrl(audioUrl);
      if (audioUrl) {
        setAudioDebug('Audio pubblico: uso audio_url diretto');
      } else {
        setAudioDebug('Nessun audio configurato per questa sezione');
      }
    }

    resolveAudioUrl().catch(() => {
      setResolvedAudioUrl(null);
      setAudioDebug('Errore durante risoluzione URL audio');
    });
  }, [audioBucket, audioIsPrivate, audioPath, audioUrl, inDailyImmersion]);

  useEffect(() => {
    async function setupAudio() {
      if (!inDailyImmersion || !resolvedAudioUrl) return;

      if (audioRef.current) {
        audioRef.current.subscription?.remove?.();
        audioRef.current.player?.pause?.();
        audioRef.current.player?.remove?.();
        audioRef.current = null;
      }

      const expoAudio = await import('expo-audio');
      const player = expoAudio.createAudioPlayer({ uri: resolvedAudioUrl }, { updateInterval: 250 });
      const subscription = player.addListener?.('playbackStatusUpdate', (status: any) => {
        setAudioLoaded(true);
        setAudioPlaying(!!status?.playing);
        setAudioPositionMs(Math.round((status?.currentTime ?? 0) * 1000));
        setAudioDurationMs(Math.round((status?.duration ?? 0) * 1000));
      });
      setAudioModuleReady(true);
      setAudioDebug((prev) => prev ?? 'Audio ready');
      audioRef.current = { player, subscription };
    }

    setupAudio().catch(() => {
      setAudioModuleReady(false);
      setAudioLoaded(false);
      setAudioPlaying(false);
      setAudioPositionMs(0);
      setAudioDurationMs(0);
      setAudioDebug('expo-audio non disponibile in questa build');
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.subscription?.remove?.();
        audioRef.current.player?.pause?.();
        audioRef.current.player?.remove?.();
        audioRef.current = null;
      }
      setAudioLoaded(false);
      setAudioPlaying(false);
      setAudioPositionMs(0);
      setAudioDurationMs(0);
    };
  }, [inDailyImmersion, resolvedAudioUrl, sezioneId]);

  useEffect(() => {
    if (!inDailyImmersion || effectiveCuePoints.length === 0) return;
    const seconds = audioPositionMs / 1000;

    let idx = 0;
    for (let i = 0; i < effectiveCuePoints.length; i += 1) {
      if (seconds >= effectiveCuePoints[i]) {
        idx = i;
      } else {
        break;
      }
    }

    if (idx !== immersionIndex) {
      setImmersionIndex(idx);
    }
  }, [audioPositionMs, effectiveCuePoints, immersionIndex, inDailyImmersion]);

  useEffect(() => {
    if (!inDailyImmersion) return;
    immersionAnim.setValue(0);
    Animated.timing(immersionAnim, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [immersionAnim, immersionIndex, inDailyImmersion]);

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

  if (inDailyImmersion) {
    const block = immersionBlocks[immersionIndex] ?? '';
    const isFirst = immersionIndex === 0;
    const isLast = immersionIndex >= immersionTotal - 1;
    const canSyncAudio = audioLoaded && effectiveCuePoints.length === immersionTotal;

    async function toggleAudio() {
      const player = audioRef.current?.player;
      if (!player || !audioLoaded) return;
      if (audioPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }

    async function goToIndex(nextIndex: number) {
      const clamped = Math.max(0, Math.min(immersionTotal - 1, nextIndex));
      setImmersionIndex(clamped);
      const player = audioRef.current?.player;
      if (!player || !canSyncAudio) return;
      const seconds = effectiveCuePoints[clamped] ?? 0;
      await player.seekTo(seconds);
    }

    return (
      <View style={styles.immersionContainer}>
        <View style={styles.immersionHeader}>
          <View style={styles.immersionHeaderTop}>
            <Text style={styles.immersionSectionTitle}>{sezioneTitolo}</Text>
            {!!resolvedAudioUrl && audioModuleReady && (
              <TouchableOpacity
                style={[styles.audioBtn, !audioLoaded && styles.audioBtnDisabled]}
                onPress={toggleAudio}
                disabled={!audioLoaded}
                activeOpacity={0.85}
              >
                <Text style={styles.audioBtnText}>{audioPlaying ? 'Pausa' : 'Play audio'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!resolvedAudioUrl && !audioModuleReady && (
            <Text style={styles.audioWarningText}>Audio non disponibile in questa build</Text>
          )}
          {!!audioDebug && (
            <Text style={styles.audioDebugText}>{audioDebug}</Text>
          )}
          <Text style={styles.immersionCounter}>
            {Math.min(immersionIndex + 1, Math.max(immersionTotal, 1))} / {Math.max(immersionTotal, 1)}
          </Text>
        </View>

        <View style={styles.immersionBody}>
          {immersionTotal > 0 ? (
            <Animated.View
              style={[
                styles.immersionParagraphWrap,
                {
                  opacity: immersionAnim,
                  transform: [
                    {
                      translateY: immersionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(233,240,248,0)', 'rgba(233,240,248,0.96)', 'rgba(233,240,248,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.immersionTextGlow}
              >
                <Text style={styles.immersionBlockText}>{block}</Text>
              </LinearGradient>
            </Animated.View>
          ) : (
            <Text style={styles.cardText}>Contenuto non ancora disponibile.</Text>
          )}
        </View>

        <View style={styles.immersionHintBar}>
          <Text style={styles.immersionHintText}>
            Tocca a destra per continuare, a sinistra per tornare.
          </Text>
        </View>

        {immersionTotal > 0 && (
          <View style={styles.immersionTapLayer}>
            <Pressable
              style={styles.immersionTapHalf}
              disabled={isFirst}
              onPress={() => goToIndex(immersionIndex - 1)}
            />
            <Pressable
              style={styles.immersionTapHalf}
              onPress={async () => {
                if (isLast) {
                  if (audioRef.current?.player) {
                    audioRef.current.player.pause?.();
                  }
                  await markSectionCompleted(moduloId, sezioneId);
                  navigation.navigate('AllenamentoOggi');
                  return;
                }
                await goToIndex(immersionIndex + 1);
              }}
            />
          </View>
        )}
      </View>
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
  immersionContainer: {
    flex: 1,
    backgroundColor: '#E9F0F8',
  },
  immersionHeader: {
    paddingTop: 42,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  immersionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  immersionSectionTitle: {
    color: theme.colors.primary,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 34,
    flex: 1,
  },
  immersionCounter: {
    marginTop: 8,
    color: '#5B6D82',
    fontSize: 12,
    fontWeight: '700',
  },
  audioBtn: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#1D4A73',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  audioBtnDisabled: {
    opacity: 0.55,
  },
  audioBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  audioWarningText: {
    marginTop: 6,
    color: '#7C8FA4',
    fontSize: 11,
    fontWeight: '600',
  },
  audioDebugText: {
    marginTop: 4,
    color: '#73879D',
    fontSize: 10,
    fontWeight: '600',
  },
  immersionBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  immersionParagraphWrap: {
    paddingHorizontal: 10,
  },
  immersionTextGlow: {
    paddingVertical: 24,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  immersionBlockText: {
    fontSize: 22,
    lineHeight: 35,
    color: '#1A2F45',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  immersionHintBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  immersionHintText: {
    color: '#5F7085',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  immersionTapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  immersionTapHalf: {
    flex: 1,
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
