import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export interface HttpRequestConfig<TBody = unknown> {
  url: string
  method?: HttpMethod
  headers?: HeadersInit
  body?: TBody
  query?: QueryParams
  timeoutMs?: number
  signal?: AbortSignal
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

export type UseHttpRequestOptions<TBody = unknown> = HttpRequestConfig<TBody>

export type ExecuteOverrides<TBody = unknown> = Partial<HttpRequestConfig<TBody>>

export interface UseHttpRequestReturn<TData, TBody = unknown> {
  data: ShallowRef<TData | null>
  status: Ref<number | null>
  loading: Ref<boolean>
  error: Ref<HttpRequestError | HttpNetworkError | Error | null>
  isSuccess: ComputedRef<boolean>
  isError: ComputedRef<boolean>
  clear: () => void
  execute: (overrides?: ExecuteOverrides<TBody>) => Promise<TData>
  cancel: (reason?: unknown) => void
  signal: Ref<AbortSignal | undefined>
}

const DEFAULT_METHOD: HttpMethod = 'GET'
const JSON_MEDIA_TYPE = 'application/json'

export function useHttpRequest<TData = unknown, TBody = unknown>(
  defaultOptions: UseHttpRequestOptions<TBody>,
): UseHttpRequestReturn<TData, TBody> {
  const data = shallowRef<TData | null>(null) as ShallowRef<TData | null>
  const status = ref<number | null>(null)
  const loading = ref(false)
  const error = shallowRef<HttpRequestError | HttpNetworkError | Error | null>(null)
  const finishedSuccess = ref(false)
  const finishedError = ref(false)
  const signalRef = ref<AbortSignal | undefined>(undefined)

  let activeController: AbortController | null = null

  const isSuccess = computed(() => finishedSuccess.value && !finishedError.value)
  const isError = computed(() => finishedError.value)

  const cancel = (reason?: unknown) => {
    activeController?.abort(reason)
  }

  const clear = () => {
    data.value = null
    status.value = null
    loading.value = false
    error.value = null
    finishedSuccess.value = false
    finishedError.value = false
    signalRef.value = undefined
    activeController = null
  }

  const mergeOptions = (overrides?: ExecuteOverrides<TBody>): HttpRequestConfig<TBody> => ({
    method: DEFAULT_METHOD,
    ...defaultOptions,
    ...overrides,
  })

  const execute = async (overrides?: ExecuteOverrides<TBody>): Promise<TData> => {
    cancel()

    const controller = new AbortController()
    activeController = controller
    signalRef.value = controller.signal

    data.value = null
    status.value = null

    const cfg = mergeOptions(overrides)
    const signals = [controller.signal, cfg.signal].filter((s): s is AbortSignal => Boolean(s))
    const abortSignal = mergeAbortSignals(signals)
    const disposeTimeout = armRequestTimeout(controller, cfg.timeoutMs)

    loading.value = true
    error.value = null
    finishedSuccess.value = false
    finishedError.value = false

    const url = withQueryString(cfg.url, cfg.query)
    const bodyInit = serializeBody(cfg.body as unknown)
    const headers = buildHeaders(cfg.headers, cfg.body, bodyInit)

    try {
      const response = await fetch(url, {
        method: cfg.method ?? DEFAULT_METHOD,
        headers,
        body: shouldOmitBody(cfg.method) ? undefined : bodyInit,
        signal: abortSignal,
      })

      status.value = response.status

      if (!response.ok) {
        const httpError = await httpErrorFromResponse(response)
        error.value = httpError
        finishedError.value = true
        throw httpError
      }

      const parse = cfg.parseResponse ?? parseResponseBody
      const parsed = (await parse(response)) as TData
      data.value = parsed
      finishedSuccess.value = true
      return parsed
    } catch (err) {
      if (err instanceof HttpRequestError) throw err
      const normalized = mapUnknownToRequestFailure(err)
      error.value = normalized
      finishedError.value = true
      throw normalized
    } finally {
      disposeTimeout?.()
      loading.value = false
      if (activeController === controller) {
        activeController = null
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

function withQueryString(baseUrl: string, query?: QueryParams): string {
  if (!query || Object.keys(query).length === 0) return baseUrl
  const url = new URL(baseUrl, window.location.origin)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 0) return new AbortController().signal
  if (signals.length === 1) return signals[0]

  const merged = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      merged.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => merged.abort(signal.reason), { once: true })
  }
  return merged.signal
}

function armRequestTimeout(controller: AbortController, timeoutMs?: number): (() => void) | undefined {
  if (timeoutMs == null || timeoutMs <= 0) return undefined
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs)
  return () => clearTimeout(id)
}

function shouldOmitBody(method?: HttpMethod): boolean {
  const m = method ?? DEFAULT_METHOD
  return m === 'GET' || m === 'HEAD'
}

function serializeBody(body: unknown): BodyInit | undefined {
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

function shouldAttachJsonHeader(body: unknown, bodyInit: BodyInit | undefined): boolean {
  if (bodyInit === undefined || bodyInit instanceof FormData) return false
  if (typeof body !== 'object' || body === null) return false
  if (body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams) return false
  return true
}

function buildHeaders(
  init: HeadersInit | undefined,
  rawBody: unknown,
  bodyInit: BodyInit | undefined,
): Headers {
  const headers = new Headers(init ?? {})
  if (shouldAttachJsonHeader(rawBody, bodyInit) && !headers.has('content-type')) {
    headers.set('content-type', JSON_MEDIA_TYPE)
  }
  return headers
}

function isLikelyJsonContentType(header: string | null): boolean {
  if (!header) return true
  return header.includes('application/json') || header.includes('+json')
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (response.status === 204 || response.headers.get('content-length') === '0') return null

  if (isLikelyJsonContentType(contentType)) {
    try {
      return await response.json()
    } catch {
      return await response.text()
    }
  }
  return await response.text()
}

async function httpErrorFromResponse(response: Response): Promise<HttpRequestError> {
  let bodyText: string | undefined
  try {
    bodyText = await response.clone().text()
  } catch {
    bodyText = undefined
  }
  return new HttpRequestError(`HTTP ${response.status}`, {
    status: response.status,
    response,
    bodyText,
  })
}

function mapUnknownToRequestFailure(err: unknown): Error {
  if (err instanceof Error && err.name === 'AbortError') {
    return err instanceof DOMException ? err : new DOMException('Aborted', 'AbortError')
  }
  if (err instanceof Error) return new HttpNetworkError(err.message, err)
  return new HttpNetworkError('Network error', err)
}
