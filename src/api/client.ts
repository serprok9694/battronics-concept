// Simulated transport layer. In production this file becomes the generated
// OpenAPI client (base URL, auth header, error mapping); endpoints keep their signatures.

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const shouldFail = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fail');

/**
 * Resolves `produce()` after a network-like delay.
 * `?fail` in the URL makes data endpoints (`failable`) answer 503, to demo error states.
 */
export function simulateRequest<T>(
  produce: () => T,
  signal?: AbortSignal,
  { failable = false }: { failable?: boolean } = {},
): Promise<T> {
  const latency = 200 + Math.random() * 300;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (failable && shouldFail()) reject(new ApiError(503, 'Data service unavailable (simulated)'));
      else resolve(structuredClone(produce()));
    }, latency);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
