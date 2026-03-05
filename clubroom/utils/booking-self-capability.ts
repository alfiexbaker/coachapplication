interface ResolveAccountChildCountInput {
  contextChildCount?: number | null;
  accountChildRefCount?: number | null;
}

interface ResolveSelfBookingCapabilityInput extends ResolveAccountChildCountInput {
  allowBookSelf?: boolean | null;
}

function normalizeCount(value?: number | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function resolveAccountChildCount(input: ResolveAccountChildCountInput): number {
  const contextCount = normalizeCount(input.contextChildCount);
  const accountRefCount = normalizeCount(input.accountChildRefCount);
  return Math.max(contextCount, accountRefCount);
}

export function hasAccountChildren(input: ResolveAccountChildCountInput): boolean {
  return resolveAccountChildCount(input) > 0;
}

export function canBookForSelf(input: ResolveSelfBookingCapabilityInput): boolean {
  const accountChildCount = resolveAccountChildCount(input);
  if (accountChildCount === 0) {
    return true;
  }
  return input.allowBookSelf === true;
}
