import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type InstitutionCustomer = Tables<'institution_customers'>;
export type InstitutionPayment = Tables<'institution_payment_dues'>;

export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useInstitutionCustomers() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['institution-customers'],
    queryFn: async () => {
      const customers: InstitutionCustomer[] = [];
      const payments: InstitutionPayment[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('institution_customers').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        customers.push(...data);
        if (data.length < 500) break;
      }
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('institution_payment_dues').select('*').order('due_date').order('id').range(offset, offset + 499);
        if (error) throw error;
        payments.push(...data);
        if (data.length < 500) break;
      }
      return { customers, payments };
    },
    staleTime: 30_000,
  });
  return { ...query, customers: query.data?.customers ?? [], payments: query.data?.payments ?? [], refresh: () => client.invalidateQueries({ queryKey: ['institution-customers'] }) };
}

export const healthLabels: Record<string, string> = { not_assessed: 'Not assessed', healthy: 'Healthy', watch: 'Watch', at_risk: 'At risk' };
export const healthStyles: Record<string, string> = { not_assessed: 'text-muted-foreground bg-muted', healthy: 'text-status-healthy bg-status-healthy/10', watch: 'text-status-watch bg-status-watch/10', at_risk: 'text-status-risk bg-status-risk/10' };
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}