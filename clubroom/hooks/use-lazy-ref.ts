import { useState } from 'react';

export function useLazyRef<T>(createValue: () => T): { current: T } {
  const [ref] = useState(() => ({ current: createValue() }));
  return ref;
}
