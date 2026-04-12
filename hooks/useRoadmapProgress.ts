import { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

type CompletedMap = Record<string, number[]>;

type StoredRoadmap = {
  completedByModulo: CompletedMap;
};

const STORAGE_KEY = '@ivaapp_roadmap_progress_v1';

export function useRoadmapProgress() {
  const [completedByModulo, setCompletedByModulo] = useState<CompletedMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setCompletedByModulo({});
        return;
      }

      const parsed = JSON.parse(raw) as StoredRoadmap;
      if (!parsed?.completedByModulo || typeof parsed.completedByModulo !== 'object') {
        setCompletedByModulo({});
        return;
      }

      setCompletedByModulo(parsed.completedByModulo);
    } catch {
      setCompletedByModulo({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = useCallback(async (next: CompletedMap) => {
    setCompletedByModulo(next);
    const payload: StoredRoadmap = { completedByModulo: next };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const markSectionCompleted = useCallback(
    async (moduloId: number, sezioneId: number) => {
      const key = String(moduloId);
      const current = completedByModulo[key] || [];
      if (current.includes(sezioneId)) return;

      const next: CompletedMap = {
        ...completedByModulo,
        [key]: [...current, sezioneId],
      };

      await save(next);
    },
    [completedByModulo, save]
  );

  const resetRoadmap = useCallback(async () => {
    await save({});
  }, [save]);

  const completedCount = useMemo(
    () => Object.values(completedByModulo).reduce((acc, ids) => acc + ids.length, 0),
    [completedByModulo]
  );

  return {
    completedByModulo,
    isLoading,
    completedCount,
    markSectionCompleted,
    resetRoadmap,
    refresh: load,
  };
}
