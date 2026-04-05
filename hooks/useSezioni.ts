import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Sezione = {
  id: number;
  modulo_id: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  lezione_testo: string;
  schema_testo: string;
  is_attivo: boolean;
};

export function useSezioni(moduloId: number) {
  return useQuery({
    queryKey: ['sezioni', moduloId],
    queryFn: async () => {
      if (!moduloId) return [];
      
      const { data, error } = await supabase
        .from('sezioni')
        .select('*')
        .eq('modulo_id', moduloId)
        .eq('is_attivo', true)
        .order('ordine');

      if (error) {
        throw new Error(error.message);
      }
      return data as Sezione[];
    },
    enabled: !!moduloId,
  });
}

export function useDettaglioSezione(sezioneId: number) {
  return useQuery({
    queryKey: ['sezione', sezioneId],
    queryFn: async () => {
      if (!sezioneId) return null;

      const { data, error } = await supabase
        .from('sezioni')
        .select('*')
        .eq('id', sezioneId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Sezione;
    },
    enabled: !!sezioneId,
  });
}
