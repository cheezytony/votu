import { defineStore } from 'pinia';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function add(options: {
    message: string;
    variant?: ToastVariant;
    duration?: number;
  }) {
    const id = Math.random().toString(36).slice(2);
    const variant = options.variant ?? 'info';
    const duration = options.duration ?? 4000;

    toasts.value.push({ id, message: options.message, variant });

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    return id;
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, add, remove };
});
