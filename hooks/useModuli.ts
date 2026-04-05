import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Modulo = {
  id: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  is_premium: boolean;
};

export function useModuli() {
  return useQuery({
    queryKey: ['moduli'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moduli')
        .select('*')
        .eq('is_attivo', true)
        .order('ordine');

      if (error) {
        throw new Error(error.message);
      }
      return data as Modulo[];
    },
  });
}
