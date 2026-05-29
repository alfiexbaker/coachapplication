export async function runAsyncFinally<T>(
  action: () => Promise<T>,
  onFinally: () => void,
): Promise<T> {
  try {
    return await action();
  } finally {
    onFinally();
  }
}

export async function runAsyncTryCatchFinally<T>(
  action: () => Promise<T>,
  onCatch: (error: unknown) => Promise<T> | T,
  onFinally: () => void,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    return await onCatch(error);
  } finally {
    onFinally();
  }
}

export function runSyncTryCatchFinally<T>(
  action: () => T,
  onCatch: (error: unknown) => T,
  onFinally: () => void,
): T {
  try {
    return action();
  } catch (error) {
    return onCatch(error);
  } finally {
    onFinally();
  }
}

export function runSyncFinally<T>(
  action: () => T,
  onFinally: () => void,
): T {
  try {
    return action();
  } finally {
    onFinally();
  }
}
