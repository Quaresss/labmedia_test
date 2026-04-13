import { computed, reactive, toRaw, unref, watch, type ComputedRef, type Ref } from 'vue'

/**
 * Результат одного правила: `true` — ок, строка — текст ошибки.
 */
export type RuleOutcome = true | string

/**
 * Произвольный синхронный валидатор для поля `K` модели `TValues`.
 */
export type CustomValidatorFn<TValues extends Record<string, unknown>, K extends keyof TValues> = (
  value: TValues[K],
  ctx: { values: TValues; field: K },
) => RuleOutcome

/**
 * Встроенные правила (типовые). Сообщение `message` переопределяет текст по умолчанию.
 */
export type BuiltInFieldRule<TValues extends Record<string, unknown>, K extends keyof TValues> =
  | { type: 'required'; message?: string }
  | { type: 'minLength'; min: number; message?: string }
  | { type: 'maxLength'; max: number; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'pattern'; regex: RegExp; message?: string }
  | { type: 'custom'; validate: CustomValidatorFn<TValues, K> }

/**
 * Описание набора правил для одного поля.
 */
export type FieldRules<TValues extends Record<string, unknown>, K extends keyof TValues> =
  BuiltInFieldRule<TValues, K>[]

/**
 * Схема формы: ключи — имена полей модели, значения — списки правил.
 * Поля модели без записи в схеме не валидируются.
 */
export type FormValidationSchema<TValues extends Record<string, unknown>> = {
  [K in keyof TValues]?: FieldRules<TValues, K>
}

/**
 * Состояние валидации одного поля.
 */
export interface FieldValidationState {
  /** Сообщения ошибок (после последнего запуска правил для этого поля). */
  errors: string[]
  /** Поле получало фокус / явную валидацию — см. `touchField`, `validate`, `validateField`. */
  touched: boolean
  /** Значение отличалось от снимка на момент создания composable. */
  dirty: boolean
  /** Для этого поля хотя бы раз выполняли валидацию. */
  validated: boolean
}

export interface UseFormValidationOptions<TValues extends Record<string, unknown>> {
  /** Реактивная модель значений (обычно `reactive` или `ref` с объектом). */
  model: Ref<TValues> | TValues
  /** Правила по полям. */
  schema: FormValidationSchema<TValues>
}

export interface UseFormValidationReturn<TValues extends Record<string, unknown>> {
  /** Состояние по каждому полю из схемы. */
  fieldState: { [K in keyof TValues]?: FieldValidationState }
  /** Все поля из схемы прошли валидацию и без ошибок. */
  isValid: ComputedRef<boolean>
  /** Есть хотя бы одна ошибка среди полей схемы после их валидации. */
  hasError: ComputedRef<boolean>
  /** Запуск правил для всех полей схемы. */
  validate: () => boolean
  /** Запуск правил для одного поля (должно быть в схеме). */
  validateField: <K extends keyof TValues & string>(field: K) => boolean
  /** Сброс ошибок и флагов `touched` / `validated`; `dirty` пересчитывается от начального снимка. */
  reset: (options?: { remeasureInitial?: boolean }) => void
  /** Пометить поле как `touched` без валидации. */
  touchField: <K extends keyof TValues & string>(field: K) => void
}

function getModelObject<TValues extends Record<string, unknown>>(model: Ref<TValues> | TValues): TValues {
  return unref(model) as TValues
}

function cloneSnapshot<T extends Record<string, unknown>>(v: T): T {
  return structuredClone(toRaw(v) as T) as T
}

function defaultMessages() {
  return {
    required: 'Обязательное поле',
    minLength: (min: number) => `Минимум ${min} символов`,
    maxLength: (max: number) => `Максимум ${max} символов`,
    email: 'Некорректный email',
    pattern: 'Значение не подходит под шаблон',
  } as const
}

function runBuiltInRule<TValues extends Record<string, unknown>, K extends keyof TValues>(
  rule: BuiltInFieldRule<TValues, K>,
  value: TValues[K],
  ctx: { values: TValues; field: K },
): RuleOutcome {
  const msg = defaultMessages()
  const str = value == null ? '' : String(value)

  switch (rule.type) {
    case 'required':
      if (str.trim() === '') return rule.message ?? msg.required
      return true
    case 'minLength':
      if (str.length < rule.min) return rule.message ?? msg.minLength(rule.min)
      return true
    case 'maxLength':
      if (str.length > rule.max) return rule.message ?? msg.maxLength(rule.max)
      return true
    case 'email': {
      if (str.trim() === '') return true
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
      return ok ? true : rule.message ?? msg.email
    }
    case 'pattern':
      if (str === '') return true
      return rule.regex.test(str) ? true : rule.message ?? msg.pattern
    case 'custom':
      return rule.validate(value, ctx)
    default: {
      const _exhaustive: never = rule
      return _exhaustive
    }
  }
}

/**
 * Composable валидации формы: схема правил + реактивная модель.
 *
 * **Семантика `isValid`:** `true`, только если для каждого поля из `schema` вызывалась
 * валидация (`validate` / `validateField`) и список `errors` пуст.
 */
export function useFormValidation<TValues extends Record<string, unknown>>(
  options: UseFormValidationOptions<TValues>,
): UseFormValidationReturn<TValues> {
  const { model, schema } = options

  const schemaKeys = Object.keys(schema) as (keyof TValues & string)[]

  function captureSnapshot(m: Ref<TValues> | TValues): TValues {
    return cloneSnapshot(getModelObject(m))
  }

  let initialSnapshot = captureSnapshot(model)

  const fieldState = reactive({}) as { [K in keyof TValues]?: FieldValidationState }

  for (const key of schemaKeys) {
    fieldState[key] = {
      errors: [],
      touched: false,
      dirty: false,
      validated: false,
    }
  }

  function recomputeDirty() {
    const current = getModelObject(model)
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (!st) continue
      st.dirty = !valuesEqual((initialSnapshot as TValues)[key], current[key])
    }
  }

  watch(
    () => getModelObject(model),
    () => recomputeDirty(),
    { deep: true },
  )

  recomputeDirty()

  function collectErrorsForField<K extends keyof TValues & string>(field: K): string[] {
    const rules = schema[field]
    if (!rules?.length) return []

    const values = getModelObject(model)
    const value = values[field]
    const errors: string[] = []

    for (const rule of rules) {
      const result = runBuiltInRule(rule as BuiltInFieldRule<TValues, K>, value, { values, field })
      if (result !== true) errors.push(result)
    }
    return errors
  }

  const isValid = computed(() => {
    if (schemaKeys.length === 0) return true
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (!st?.validated || st.errors.length > 0) return false
    }
    return true
  })

  const hasError = computed(() => {
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (st?.validated && st.errors.length > 0) return true
    }
    return false
  })

  function validateField<K extends keyof TValues & string>(field: K): boolean {
    const st = fieldState[field]
    if (!st) return true

    st.errors = collectErrorsForField(field)
    st.touched = true
    st.validated = true
    return st.errors.length === 0
  }

  function validate(): boolean {
    let ok = true
    for (const key of schemaKeys) {
      const fieldOk = validateField(key)
      if (!fieldOk) ok = false
    }
    return ok
  }

  function touchField<K extends keyof TValues & string>(field: K) {
    const st = fieldState[field]
    if (st) st.touched = true
  }

  function reset(resetOptions?: { remeasureInitial?: boolean }) {
    if (resetOptions?.remeasureInitial) {
      initialSnapshot = captureSnapshot(model)
    }
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (!st) continue
      st.errors = []
      st.touched = false
      st.validated = false
    }
    recomputeDirty()
  }

  return {
    fieldState,
    isValid,
    hasError,
    validate,
    validateField,
    reset,
    touchField,
  }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}
