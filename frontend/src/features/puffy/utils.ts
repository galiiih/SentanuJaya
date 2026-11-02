export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Tiny class-name joiner (like clsx). Filters falsy values. */
export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}

export function waitFor<T>(find: () => T | null, timeout = 2500): Promise<T | null> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const found = find();
      if (found) return resolve(found);
      if (performance.now() - t0 > timeout) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
