let listeners = new Set();
let toasts = [];
let nextId = 0;

function emitChange() {
  listeners.forEach((listener) => listener());
}

export const toastStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return toasts;
  },
  add(message, type = 'info', duration = 1500) {
    const id = `toast-${++nextId}-${Date.now()}`;
    toasts = [...toasts, { id, message, type, duration }];
    emitChange();
    return id;
  },
  remove(id) {
    const next = toasts.filter((t) => t.id !== id);
    if (next.length === toasts.length) return;
    toasts = next;
    emitChange();
  },
};

export const toast = {
  show(message, type = 'info', duration = 1500) {
    toastStore.add(message, type, duration);
  },
  success(message, duration) {
    toastStore.add(message, 'success', duration ?? 1500);
  },
  error(message, duration) {
    toastStore.add(message, 'error', duration ?? 2500);
  },
  info(message, duration) {
    toastStore.add(message, 'info', duration ?? 1500);
  },
  warning(message, duration) {
    toastStore.add(message, 'warning', duration ?? 2000);
  },
};
