import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Quiz = {
  id: number;
  domanda: string;
  opzione_a: string;
  opzione_b: string;
  opzione_c: string;
  risposta_corretta: string;
  spiegazione: string;
};

const QUIZ_PER_SPRINT = 20;

export function useQuizSessione(sezioneId: number, isRipassoErrori: boolean, moduloId?: number) {
  return useQuery({
    queryKey: ['quiz_sessione', sezioneId, isRipassoErrori, moduloId],
    queryFn: async () => {
      if (isRipassoErrori) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          throw new Error('Errore utente non loggato');
        }

        const userId = authData.user.id;

        const { data: sezioniModulo, error: sezioniError } = await supabase
          .from('sezioni')
          .select('id')
          .eq('modulo_id', moduloId)
          .eq('is_attivo', true);

        if (sezioniError) throw new Error(sezioniError.message);

        const idsSezioni = (sezioniModulo || []).map((s: { id: number }) => s.id);
        if (idsSezioni.length === 0) return [];

        const { data: erroriData, error: erroriQueryError } = await supabase
          .from('quiz_da_correggere')
          .select('quiz_id')
          .eq('user_id', userId);

        if (erroriQueryError) throw new Error(erroriQueryError.message);

        const idsQuizDaCorreggere = (erroriData || []).map((q: { quiz_id: number }) => q.quiz_id);
        if (idsQuizDaCorreggere.length === 0) return [];

        const { data: quizData, error: quizError } = await supabase
          .from('quiz')
          .select('*')
          .in('id', idsQuizDaCorreggere)
          .in('sezione_id', idsSezioni)
          .eq('is_attivo', true);

        if (quizError) throw new Error(quizError.message);

        return (quizData || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, QUIZ_PER_SPRINT) as Quiz[];
      } else {
        const { data, error } = await supabase
          .from('quiz')
          .select('*')
          .eq('sezione_id', sezioneId)
          .eq('is_attivo', true);

        if (error) {
          throw new Error(error.message);
        }

        return (data || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, QUIZ_PER_SPRINT) as Quiz[];
      }
    },
    enabled: isRipassoErrori ? !!moduloId : !!sezioneId,
    staleTime: 0, // Vogliamo sempre randomizzare
    gcTime: 0, // Non tenere in cache così quando rientra avrà un set nuovo, oppure no? Mettiamo staleTime 0 ma gcTime standard
  });
}
