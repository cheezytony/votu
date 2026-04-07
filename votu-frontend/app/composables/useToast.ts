import type { ToastVariant } from '~/stores/toast';
import { useToastStore } from '~/stores/toast';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export function useToast() {
  const store = useToastStore();

  return {
    add: ({ message, variant = 'info', duration }: ToastOptions) =>
      store.add({ message, variant, duration }),
    success: (message: string, duration?: number) =>
      store.add({ message, variant: 'success', duration }),
    error: (message: string, duration?: number) =>
      store.add({ message, variant: 'error', duration }),
    info: (message: string, duration?: number) =>
      store.add({ message, variant: 'info', duration }),
    remove: store.remove,
  };
}
