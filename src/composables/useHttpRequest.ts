import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type QueryParams = Record<string, string | number | boolean | null | undefined>

/**
 * Параметры одного HTTP-вызова. Поля можно переопределять в `execute(overrides)`.
 */
export interface HttpRequestConfig<TBody = unknown> {
  url: string
  method?: HttpMethod
  headers?: HeadersInit
  /** Объект сериализуется в JSON; `FormData` / `Blob` / `string` передаются как есть. */
  body?: TBody
  query?: QueryParams
  /** Мс до отмены через AbortController (дополнительно к внешнему signal). */
  timeoutMs?: number
  /** Внешний сигнал отмены; объединяется с внутренним при `cancel()` / таймауте. */
  signal?: AbortSignal
  /** Кастомная распаковка тела ответа (по умолчанию JSON, иначе text). */
  parseResponse?: (response: Response) => Promise<unknown>
}

export class HttpRequestError extends Error {
  readonly status: number
  readonly response: Response
  readonly bodyText?: string

  constructor(message: string, init: { status: number; response: Response; bodyText?: string }) {
    super(message)
    this.name = 'HttpRequestError'
    this.status = init.status
    this.response = init.response
    this.bodyText = init.bodyText
  }
}

export class HttpNetworkError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'HttpNetworkError'
    this.cause = cause
  }
}

export interface UseHttpRequestOptions<TBody = unknown> extends HttpRequestConfig<TBody> {}

export interface ExecuteOverrides<TBody = unknown> extends Partial<HttpRequestConfig<TBody>> {}

export interface UseHttpRequestReturn<TData, TBody = unknown> {
  data: ShallowRef<TData | null>
  status: Ref<number | null>
  loading: Ref<boolean>
  error: Ref<HttpRequestError | HttpNetworkError | Error | null>
  /** `true` после успешного завершения (2xx + без сетевой ошибки). */
  isSuccess: ComputedRef<boolean>
  /** `true`, если после попытки запроса зафиксирована ошибка. */
  isError: ComputedRef<boolean>
  /** Сброс состояния (без отмены уже ушедшего запроса). */
  clear: () => void
  /** Запуск запроса; возвращает распарсенные данные или бросает ту же ошибку, что попадёт в `error`. */
  execute: (overrides?: ExecuteOverrides<TBody>) => Promise<TData>
  /** Отмена текущего запроса (AbortController). */
  cancel: (reason?: unknown) => void
  /** Текущий AbortSignal активного запроса (или undefined). */
  signal: Ref<AbortSignal | undefined>
}

function buildUrl(baseUrl: string, query?: QueryParams): string {
  if (!query || Object.keys(query).length === 0) return baseUrl
  const u = new URL(baseUrl, window.location.origin)
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue
    u.searchParams.set(k, String(v))
  }
  return u.toString()
}

function isProbablyJsonContentType(ct: string | null): boolean {
  if (!ct) return true
  return ct.includes('application/json') || ct.includes('+json')
}

async function defaultParseResponse(response: Response): Promise<unknown> {
  const ct = response.headers.get('content-type')
  if (response.status === 204 || response.headers.get('content-length') === '0') return null
  if (isProbablyJsonContentType(ct)) {
    try {
      return await response.json()
    } catch {
      return await response.text()
    }
  }
  return await response.text()
}

function prepareBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof FormData ||
    body instanceof URLSearchParams
  ) {
    return body as BodyInit
  }
  return JSON.stringify(body)
}

function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const c = new AbortController()
  for (const s of signals) {
    if (s.aborted) {
      c.abort(s.reason)
      break
    }
    s.addEventListener('abort', () => c.abort(s.reason), { once: true })
  }
  return c.signal
}

/**
 * Универсальный composable над `fetch`: реактивное состояние, ручной `execute`, отмена.
 *
 * Тип `TData` — ожидаемый тип тела ответа после `parseResponse` (по умолчанию JSON).
 */
export function useHttpRequest<TData = unknown, TBody = unknown>(
  options: UseHttpRequestOptions<TBody>,
): UseHttpRequestReturn<TData, TBody> {
  const data = shallowRef<TData | null>(null) as ShallowRef<TData | null>
  const status = ref<number | null>(null)
  const loading = ref(false)
  const error = shallowRef<HttpRequestError | HttpNetworkError | Error | null>(null)
  const finishedSuccess = ref(false)
  const finishedError = ref(false)
  const signalRef = ref<AbortSignal | undefined>(undefined)

  let abortController: AbortController | null = null

  const isSuccess = computed(() => finishedSuccess.value && !finishedError.value)
  const isError = computed(() => finishedError.value)

  function cancel(reason?: unknown) {
    abortController?.abort(reason)
  }

  function clear() {
    data.value = null
    status.value = null
    loading.value = false
    error.value = null
    finishedSuccess.value = false
    finishedError.value = false
    signalRef.value = undefined
    abortController = null
  }

  async function execute(overrides?: ExecuteOverrides<TBody>): Promise<TData> {
    cancel()
    const c = new AbortController()
    abortController = c
    signalRef.value = c.signal

    data.value = null
    status.value = null

    const cfg: HttpRequestConfig<TBody> = {
      method: 'GET',
      ...options,
      ...overrides,
    }

    const signals: AbortSignal[] = [c.signal]
    if (cfg.signal) signals.push(cfg.signal)
    const merged = mergeSignals(signals)

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (cfg.timeoutMs != null && cfg.timeoutMs > 0) {
      timeoutId = setTimeout(() => c.abort(new DOMException('Timeout', 'AbortError')), cfg.timeoutMs)
    }

    loading.value = true
    error.value = null
    finishedSuccess.value = false
    finishedError.value = false

    const url = buildUrl(cfg.url, cfg.query)
    const bodyInit = prepareBody(cfg.body as unknown)

    const headers = new Headers(cfg.headers ?? {})
    if (
      bodyInit !== undefined &&
      !(bodyInit instanceof FormData) &&
      !headers.has('content-type') &&
      typeof cfg.body === 'object' &&
      cfg.body !== null &&
      !(cfg.body instanceof Blob) &&
      !(cfg.body instanceof ArrayBuffer) &&
      !(cfg.body instanceof URLSearchParams)
    ) {
      headers.set('content-type', 'application/json')
    }

    try {
      const response = await fetch(url, {
        method: cfg.method ?? 'GET',
        headers,
        body: cfg.method === 'GET' || cfg.method === 'HEAD' ? undefined : bodyInit,
        signal: merged,
      })

      status.value = response.status

      const parse = cfg.parseResponse ?? defaultParseResponse

      if (!response.ok) {
        let bodyText: string | undefined
        try {
          bodyText = await response.clone().text()
        } catch {
          bodyText = undefined
        }
        const httpErr = new HttpRequestError(`HTTP ${response.status}`, {
          status: response.status,
          response,
          bodyText,
        })
        error.value = httpErr
        finishedError.value = true
        throw httpErr
      }

      const parsed = (await parse(response)) as TData
      data.value = parsed
      finishedSuccess.value = true
      return parsed
    } catch (e) {
      if (e instanceof HttpRequestError) {
        throw e
      }
      const err = e as Error
      if (err?.name === 'AbortError') {
        const aborted = err instanceof DOMException ? err : new DOMException('Aborted', 'AbortError')
        error.value = aborted
        finishedError.value = true
        throw aborted
      }
      const net = new HttpNetworkError(e instanceof Error ? e.message : 'Network error', e)
      error.value = net
      finishedError.value = true
      throw net
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      loading.value = false
      if (abortController === c) {
        abortController = null
        signalRef.value = undefined
      }
    }
  }

  return {
    data,
    status,
    loading,
    error,
    isSuccess,
    isError,
    clear,
    execute,
    cancel,
    signal: signalRef,
  }
}
