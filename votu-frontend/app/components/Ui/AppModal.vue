<script setup lang="ts">
const props = withDefaults(
  defineProps<{ ariaLabel?: string; ariaLabelledby?: string }>(),
  { ariaLabel: undefined, ariaLabelledby: undefined },
);
const emit = defineEmits<{ close: [] }>();

const modalRef = ref<HTMLDivElement | null>(null);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
    return;
  }

  if (e.key !== 'Tab') return;

  const focusable = modalRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (!focusable || focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

onMounted(() => {
  // Use the same broad selector as the tab-trap so initial focus is consistent
  modalRef.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      :aria-label="ariaLabelledby ? undefined : (ariaLabel ?? 'Dialog')"
      :aria-labelledby="ariaLabelledby"
    >
      <!-- Overlay -->
      <div
        class="absolute inset-0 bg-black/50"
        aria-hidden="true"
        @click="emit('close')"
      />

      <!-- Panel -->
      <div
        ref="modalRef"
        class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
