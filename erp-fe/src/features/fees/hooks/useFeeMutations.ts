import { useQueryClient } from '@tanstack/react-query';
import queryKeys from '@/lib/queryKeys';

/**
 * Standardized fee query invalidation hooks to maintain state hygiene
 * across Student Ledger, Invoices, Structures, and Summary Cards.
 */
export const useFeeMutations = () => {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.fees.all });
  };

  const invalidateSummary = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() });
  };

  const invalidateInvoices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() }),
    ]);
  };

  const invalidateStudent = async (studentId: string) => {
    if (!studentId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'ledger'] }),
      queryClient.invalidateQueries({ queryKey: ['portal', 'student', 'fees'] }),
      queryClient.invalidateQueries({ queryKey: ['fees', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() }),
      queryClient.invalidateQueries({ queryKey: ['fees', 'defaulters'] }),
    ]);
  };

  const invalidateStructures = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'structures'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() }),
    ]);
  };

  const invalidateHeads = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.heads() }),
      queryClient.invalidateQueries({ queryKey: ['fees', 'structures'] }),
    ]);
  };

  const invalidateRefunds = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'refunds'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() }),
    ]);
  };

  const invalidateReversals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'reversals'] }),
      queryClient.invalidateQueries({ queryKey: ['fees', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() }),
    ]);
  };

  const invalidateReminders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'reminders'] }),
    ]);
  };

  return {
    invalidateAll,
    invalidateSummary,
    invalidateInvoices,
    invalidateStudent,
    invalidateStructures,
    invalidateHeads,
    invalidateRefunds,
    invalidateReversals,
    invalidateReminders,
  };
};

export default useFeeMutations;

