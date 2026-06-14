let dialogHandler = null;

export function registerDialogHandler(handler) {
  dialogHandler = handler;
}

export function unregisterDialogHandler(handler) {
  if (dialogHandler === handler) {
    dialogHandler = null;
  }
}

export function emitDialog(payload) {
  if (!dialogHandler) return false;
  dialogHandler(payload);
  return true;
}
