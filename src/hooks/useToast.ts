import { useCallback } from 'react';
import { useToastContext } from '../components/ui/Toast';

/**
 * Convenience hook for triggering toast notifications.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Transaction saved!');
 *   toast.error('Something went wrong.');
 *   toast.info('Refreshing prices…');
 */
export function useToast() {
  const { addToast } = useToastContext();

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error   = useCallback((message: string) => addToast(message, 'error'),   [addToast]);
  const info    = useCallback((message: string) => addToast(message, 'info'),    [addToast]);

  return { success, error, info };
}
