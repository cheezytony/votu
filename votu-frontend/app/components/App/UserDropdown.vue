<script setup lang="ts">
const { logout } = useAuth();
const authStore = useAuthStore();

const open = ref(false);
const containerRef = ref<HTMLDivElement | null>(null);

function close() {
  open.value = false;
}

function toggle() {
  open.value = !open.value;
}

async function handleLogout() {
  close();
  await logout();
}

function handleKeydown(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      open.value = true;
      nextTick(() => focusItem(0));
    }
    return;
  }

  const items =
    containerRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]');
  if (!items) return;
  const current = Array.from(items).indexOf(
    document.activeElement as HTMLElement,
  );

  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusItem(current < items.length - 1 ? current + 1 : 0);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusItem(current > 0 ? current - 1 : items.length - 1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    focusItem(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    focusItem(items.length - 1);
  } else if (e.key === 'Tab') {
    close();
  }
}

function focusItem(index: number) {
  const items =
    containerRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]');
  items?.[index]?.focus();
}

function handleOutsideClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick));
onUnmounted(() => document.removeEventListener('click', handleOutsideClick));
</script>

<template>
  <div ref="containerRef" class="relative" @keydown="handleKeydown">
    <button
      class="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="User menu"
      @click.stop="toggle"
    >
      <span class="hidden text-sm font-medium text-gray-700 sm:block">
        {{ authStore.user?.displayName }}
      </span>
      <span
        class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
        aria-hidden="true"
      >
        {{ authStore.user?.displayName?.charAt(0).toUpperCase() }}
      </span>
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-44 origin-top-right rounded-md border bg-white py-1 shadow-lg"
        role="menu"
      >
        <NuxtLink
          to="/profile"
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          role="menuitem"
          @click="close"
        >
          Profile
        </NuxtLink>
        <NuxtLink
          to="/polls/create"
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          role="menuitem"
          @click="close"
        >
          Create poll
        </NuxtLink>
        <hr class="my-1" />
        <button
          class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
          role="menuitem"
          @click="handleLogout"
        >
          Log out
        </button>
      </div>
    </Transition>
  </div>
</template>
