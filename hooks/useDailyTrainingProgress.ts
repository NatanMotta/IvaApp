import { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export type DailyStep = 'podcast' | 'quiz' | 'ripasso';

type DailyTrainingState = Record<DailyStep, boolean>;

type StoredDailyTraining = {
  date: string;
  steps: DailyTrainingState;
};

const STORAGE_PREFIX = '@ivaapp_daily_training';
const STEPS: DailyStep[] = ['podcast', 'quiz', 'ripasso'];

const DEFAULT_STEPS: DailyTrainingState = {
  podcast: false,
  quiz: false,
  ripasso: false,
};

function getTodayKey() {
  const today = new Date().toISOString().slice(0, 10);
  return `${STORAGE_PREFIX}_${today}`;
}

export function useDailyTrainingProgress() {
  const [steps, setSteps] = useState<DailyTrainingState>(DEFAULT_STEPS);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const key = getTodayKey();
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        setSteps(DEFAULT_STEPS);
        return;
      }

      const parsed = JSON.parse(raw) as StoredDailyTraining;
      if (!parsed?.steps) {
        setSteps(DEFAULT_STEPS);
        return;
      }

      setSteps({
        podcast: !!parsed.steps.podcast,
        quiz: !!parsed.steps.quiz,
        ripasso: !!parsed.steps.ripasso,
      });
    } catch {
      setSteps(DEFAULT_STEPS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = useCallback(async (next: DailyTrainingState) => {
    setSteps(next);
    const payload: StoredDailyTraining = {
      date: new Date().toISOString().slice(0, 10),
      steps: next,
    };

    await AsyncStorage.setItem(getTodayKey(), JSON.stringify(payload));
  }, []);

  const markStepDone = useCallback(
    async (step: DailyStep) => {
      const next = {
        ...steps,
        [step]: true,
      };
      await save(next);
    },
    [save, steps]
  );

  const resetToday = useCallback(async () => {
    await save(DEFAULT_STEPS);
  }, [save]);

  const completedCount = useMemo(
    () => STEPS.filter((step) => steps[step]).length,
    [steps]
  );

  const percentage = useMemo(
    () => Math.round((completedCount / STEPS.length) * 100),
    [completedCount]
  );

  const activeStepIndex = useMemo(
    () => STEPS.findIndex((step) => !steps[step]),
    [steps]
  );

  return {
    steps,
    isLoading,
    percentage,
    activeStepIndex: activeStepIndex === -1 ? STEPS.length : activeStepIndex,
    allCompleted: completedCount === STEPS.length,
    markStepDone,
    resetToday,
    refresh: load,
    orderedSteps: STEPS,
  };
}
