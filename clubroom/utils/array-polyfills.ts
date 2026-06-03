/**
 * Hermes (React Native) does not implement ES2023 Array.prototype.toSorted yet.
 * Import once at app startup before other modules call .toSorted().
 */
declare global {
  interface Array<T> {
    toSorted(compareFn?: (a: T, b: T) => number): T[];
  }
}

if (typeof Array.prototype.toSorted !== 'function') {
  Object.defineProperty(Array.prototype, 'toSorted', {
    value<T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
      return [...this].sort(compareFn);
    },
    writable: true,
    configurable: true,
  });
}

export {};
