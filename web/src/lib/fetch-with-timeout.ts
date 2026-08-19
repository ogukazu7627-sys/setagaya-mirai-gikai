export class RequestTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs: number;
  /** 呼び出し側の中断（画面遷移・再検索など）を引き継ぐ。 */
  signal?: AbortSignal;
};

/**
 * タイムアウト付き fetch。
 * 呼び出し側の中断は AbortError のまま伝え、時間切れだけは
 * RequestTimeoutError として区別できるようにする。
 * 画面側で「利用者が中断した」と「応答が返らない」を取り違えないための分離。
 */
export async function fetchWithTimeout(
  input: string,
  { timeoutMs, signal, ...init }: FetchWithTimeoutOptions,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut && !signal?.aborted) {
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
