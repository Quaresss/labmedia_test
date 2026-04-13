# labmedia_test — Vue3 composables (форма + HTTP)

Учебный проект на **Vite + Vue 3 + TypeScript**: два универсальных composable без лишних зависимостей.

## Установка и сборка

```bash
npm install
npm run dev
npm run build
```

## Импорт

```ts
import { useFormValidation } from '@/composables/useFormValidation'
import { useHttpRequest, HttpRequestError, HttpNetworkError } from '@/composables/useHttpRequest'
```

(В шаблоне Vite по умолчанию используйте относительный путь `./composables/...` или настройте алиас `@` в `vite.config.ts`.)

## `useFormValidation`

**Назначение:** валидация произвольной модели формы по схеме правил.

**Вход:**

- `model` — `Ref<TValues>` или реактивный объект `TValues` (`Record<string, unknown>`).
- `schema` — `FormValidationSchema<TValues>`: для каждого поля — массив правил `FieldRules`.

**Правила (`BuiltInFieldRule`):** `required`, `minLength`, `maxLength`, `email`, `pattern`, а также `custom` с функцией `validate(value, { values, field })`, возвращающей `true` или строку ошибки.

**Выход:**

- `fieldState` — для полей из схемы: `errors`, `touched`, `dirty`, `validated`.
- `isValid` / `hasError` — вычисляемые флаги (форма считается валидной только после явной валидации всех полей схемы).
- `validate()`, `validateField(name)`, `reset({ remeasureInitial? })`, `touchField(name)`.

Подробнее см. JSDoc в `src/composables/useFormValidation.ts`.

## `useHttpRequest`

**Назначение:** обёртка над `fetch` с реактивным состоянием и ручным запуском.

**Вход (опции):** `url`, `method`, `headers`, `body` (объекты сериализуются в JSON), `query`, `timeoutMs`, `signal`, опционально `parseResponse`.

**Выход:**

- `data`, `status`, `loading`, `error`, `isSuccess`, `isError`.
- `execute(overrides?)` — выполнить запрос (можно частично переопределить опции).
- `cancel(reason?)` — отмена через `AbortController`.
- `clear()` — сброс состояния.

Ошибки HTTP (`!ok`) — класс `HttpRequestError`; сетевые сбои — `HttpNetworkError`. Отмена — `DOMException` с именем `AbortError`.

Примеры GET/POST — в `src/App.vue` (JSONPlaceholder).
