import {
  computed,
  reactive,
  toRaw,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'

export type RuleOutcome = true | string

export type CustomValidatorFn<TValues extends object, K extends keyof TValues> = (
  value: TValues[K],
  ctx: { values: TValues; field: K },
) => RuleOutcome

export type BuiltInFieldRule<TValues extends object, K extends keyof TValues> =
  | { type: 'required'; message?: string }
  | { type: 'minLength'; min: number; message?: string }
  | { type: 'maxLength'; max: number; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'pattern'; regex: RegExp; message?: string }
  | { type: 'custom'; validate: CustomValidatorFn<TValues, K> }

export type FieldRules<TValues extends object, K extends keyof TValues> = BuiltInFieldRule<TValues, K>[]

export type FormValidationSchema<TValues extends object> = {
  [K in keyof TValues]?: FieldRules<TValues, K>
}

export interface FieldValidationState {
  errors: string[]
  touched: boolean
  dirty: boolean
  validated: boolean
}

export interface UseFormValidationOptions<TValues extends object> {
  model: MaybeRefOrGetter<TValues>
  schema: FormValidationSchema<TValues>
}

export interface UseFormValidationReturn<TValues extends object> {
  fieldState: { [K in keyof TValues]?: FieldValidationState }
  isValid: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  validate: () => boolean
  validateField: <K extends keyof TValues & string>(field: K) => boolean
  reset: (options?: { remeasureInitial?: boolean }) => void
  touchField: <K extends keyof TValues & string>(field: K) => void
}

const DEFAULT_MESSAGES = {
  required: 'Обязательное поле',
  minLength: (min: number) => `Минимум ${min} символов`,
  maxLength: (max: number) => `Максимум ${max} символов`,
  email: 'Некорректный email',
  pattern: 'Значение не подходит под шаблон',
} as const

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asTrimmedString(value: unknown): string {
  return value == null ? '' : String(value)
}

function evaluateBuiltInRule<TValues extends object, K extends keyof TValues>(
  rule: BuiltInFieldRule<TValues, K>,
  value: TValues[K],
  ctx: { values: TValues; field: K },
): RuleOutcome {
  const str = asTrimmedString(value)

  switch (rule.type) {
    case 'required':
      return str.trim() === '' ? rule.message ?? DEFAULT_MESSAGES.required : true
    case 'minLength':
      return str.length < rule.min ? rule.message ?? DEFAULT_MESSAGES.minLength(rule.min) : true
    case 'maxLength':
      return str.length > rule.max ? rule.message ?? DEFAULT_MESSAGES.maxLength(rule.max) : true
    case 'email': {
      if (str.trim() === '') return true
      return SIMPLE_EMAIL_RE.test(str) ? true : rule.message ?? DEFAULT_MESSAGES.email
    }
    case 'pattern':
      if (str === '') return true
      return rule.regex.test(str) ? true : rule.message ?? DEFAULT_MESSAGES.pattern
    case 'custom':
      return rule.validate(value, ctx)
    default: {
      const _exhaustive: never = rule
      return _exhaustive
    }
  }
}

function collectFieldErrors<TValues extends object, K extends keyof TValues & string>(
  schema: FormValidationSchema<TValues>,
  field: K,
  values: TValues,
): string[] {
  const rules = schema[field]
  if (!rules?.length) return []

  const value = values[field]
  const errors: string[] = []
  for (const rule of rules) {
    const outcome = evaluateBuiltInRule(rule as BuiltInFieldRule<TValues, K>, value, { values, field })
    if (outcome !== true) {
      errors.push(outcome)
      break
    }
  }
  return errors
}

function cloneFormSnapshot<T extends object>(model: T): T {
  return structuredClone(toRaw(model) as T) as T
}

function isSameSnapshotValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}

export function useFormValidation<TValues extends object>(
  options: UseFormValidationOptions<TValues>,
): UseFormValidationReturn<TValues> {
  const { model, schema } = options
  const schemaKeys = Object.keys(schema) as (keyof TValues & string)[]

  const readModel = (): TValues => toValue(model)

  const captureSnapshot = (): TValues => cloneFormSnapshot(readModel())
  let baseline = captureSnapshot()

  const fieldState = reactive({}) as { [K in keyof TValues]?: FieldValidationState }
  for (const key of schemaKeys) {
    fieldState[key] = { errors: [], touched: false, dirty: false, validated: false }
  }

  const syncDirtyFlags = () => {
    const current = readModel()
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (!st) continue
      st.dirty = !isSameSnapshotValue(baseline[key], current[key])
    }
  }

  const syncValidatedErrorsWithModel = () => {
    const values = readModel()
    syncDirtyFlags()
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (st?.validated) {
        st.errors = collectFieldErrors(schema, key, values)
      }
    }
  }

  watch(() => readModel(), syncValidatedErrorsWithModel, { deep: true })
  syncValidatedErrorsWithModel()

  const isValid = computed(() => {
    if (schemaKeys.length === 0) return true
    const values = readModel()
    return schemaKeys.every((key) => collectFieldErrors(schema, key, values).length === 0)
  })

  const hasError = computed(() =>
    schemaKeys.some((key) => (fieldState[key]?.errors.length ?? 0) > 0),
  )

  const validateField = <K extends keyof TValues & string>(field: K): boolean => {
    const st = fieldState[field]
    if (!st) return true

    st.errors = collectFieldErrors(schema, field, readModel())
    st.touched = true
    st.validated = true
    return st.errors.length === 0
  }

  const validate = (): boolean => {
    let ok = true
    for (const key of schemaKeys) {
      if (!validateField(key)) ok = false
    }
    return ok
  }

  const touchField = <K extends keyof TValues & string>(field: K) => {
    const st = fieldState[field]
    if (st) st.touched = true
  }

  const reset = (resetOptions?: { remeasureInitial?: boolean }) => {
    if (resetOptions?.remeasureInitial) baseline = captureSnapshot()
    for (const key of schemaKeys) {
      const st = fieldState[key]
      if (!st) continue
      st.errors = []
      st.touched = false
      st.validated = false
    }
    syncDirtyFlags()
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
