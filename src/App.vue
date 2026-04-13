<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFormValidation } from './composables/useFormValidation'
import { useHttpRequest, HttpRequestError } from './composables/useHttpRequest'

/** Модель формы: произвольные имена полей. */
interface DemoForm {
  email: string
  password: string
  nickname: string
}

const form = reactive<DemoForm>({
  email: '',
  password: '',
  nickname: '',
})

const { fieldState, isValid, hasError, validate, validateField, reset, touchField } = useFormValidation({
  model: form,
  schema: {
    email: [
      { type: 'required' },
      { type: 'email' },
      { type: 'maxLength', max: 120 },
    ],
    password: [
      { type: 'required' },
      { type: 'minLength', min: 8 },
      {
        type: 'custom',
        validate: (value) => (/\d/.test(String(value)) ? true : 'Пароль должен содержать цифру'),
      },
    ],
    nickname: [
      { type: 'required' },
      { type: 'pattern', regex: /^[a-zA-Z0-9_]+$/, message: 'Только латиница, цифры и _' },
    ],
  },
})

/** Пример GET: один пост с query-параметром (для демонстрации сборки URL). */
type JsonPlaceholderPost = { userId: number; id: number; title: string; body: string }

const getPost = useHttpRequest<JsonPlaceholderPost>({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET',
  query: { _example: 'vue-demo' },
})

/** Пример POST: создание ресурса с JSON-телом. */
type CreatePostBody = { title: string; body: string; userId: number }
type CreatePostResponse = CreatePostBody & { id: number }

const createPost = useHttpRequest<CreatePostResponse, CreatePostBody>({
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  body: { title: '', body: '', userId: 1 },
})

const getPostErrorText = computed(() => getPost.error.value?.message ?? '')
const createPostErrorText = computed(() => createPost.error.value?.message ?? '')

const lastHttpMessage = ref('')

async function runGetExample() {
  lastHttpMessage.value = ''
  try {
    await getPost.execute()
    lastHttpMessage.value = 'GET: успех'
  } catch (e) {
    lastHttpMessage.value =
      e instanceof HttpRequestError ? `GET: HTTP ${e.status}` : `GET: ${(e as Error).message}`
  }
}

async function runPostExample() {
  lastHttpMessage.value = ''
  try {
    await createPost.execute({
      body: {
        title: 'Demo post',
        body: 'Создано через useHttpRequest',
        userId: 1,
      },
    })
    lastHttpMessage.value = 'POST: успех'
  } catch (e) {
    lastHttpMessage.value =
      e instanceof HttpRequestError ? `POST: HTTP ${e.status}` : `POST: ${(e as Error).message}`
  }
}

function cancelGet() {
  getPost.cancel()
}
</script>

<template>
  <main class="page">
    <h1>Демо composables</h1>

    <section class="card">
      <h2>useFormValidation</h2>
      <p class="hint">
        Схема: <code>FormValidationSchema</code> — для каждого поля список правил
        (<code>required</code>, <code>minLength</code>, …, <code>custom</code>).
      </p>

      <form class="form" @submit.prevent="validate()">
        <label>
          Email
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            @blur="touchField('email')"
          />
        </label>
        <p v-if="fieldState.email?.touched && fieldState.email?.errors.length" class="err">
          {{ fieldState.email?.errors.join(' · ') }}
        </p>

        <label>
          Пароль (≥8, с цифрой)
          <input v-model="form.password" type="password" autocomplete="new-password" />
        </label>
        <p v-if="fieldState.password?.errors.length" class="err">
          {{ fieldState.password?.errors.join(' · ') }}
        </p>

        <label>
          Ник (латиница / цифры / _)
          <input v-model="form.nickname" autocomplete="username" @blur="validateField('nickname')" />
        </label>
        <p v-if="fieldState.nickname?.errors.length" class="err">
          {{ fieldState.nickname?.errors.join(' · ') }}
        </p>

        <div class="row">
          <button type="submit">Проверить всю форму</button>
          <button type="button" class="secondary" @click="reset({ remeasureInitial: true })">
            Сброс состояния (новый «чистый» снимок)
          </button>
        </div>

        <p class="status">
          <span :class="{ ok: isValid, bad: hasError }">isValid: {{ isValid }}</span>
          · dirty email: {{ fieldState.email?.dirty }}
        </p>
      </form>
    </section>

    <section class="card">
      <h2>useHttpRequest</h2>
      <p class="hint">Публичный API JSONPlaceholder — только для примера; composable универсальный.</p>

      <div class="http-block">
        <h3>GET /posts/1</h3>
        <div class="row">
          <button type="button" :disabled="getPost.loading.value" @click="runGetExample">execute GET</button>
          <button type="button" class="secondary" @click="cancelGet">cancel</button>
        </div>
        <p class="meta">
          loading: {{ getPost.loading }} · status: {{ getPost.status }} · isSuccess: {{ getPost.isSuccess }} ·
          isError: {{ getPost.isError }}
        </p>
        <pre v-if="getPost.data" class="json">{{ JSON.stringify(getPost.data, null, 2) }}</pre>
        <p v-if="getPostErrorText" class="err">{{ getPostErrorText }}</p>
      </div>

      <div class="http-block">
        <h3>POST /posts</h3>
        <button type="button" :disabled="createPost.loading.value" @click="runPostExample">
          execute POST
        </button>
        <p class="meta">
          loading: {{ createPost.loading }} · status: {{ createPost.status }} · isSuccess:
          {{ createPost.isSuccess }}
        </p>
        <pre v-if="createPost.data" class="json">{{ JSON.stringify(createPost.data, null, 2) }}</pre>
        <p v-if="createPostErrorText" class="err">{{ createPostErrorText }}</p>
      </div>

      <p v-if="lastHttpMessage" class="toast">{{ lastHttpMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}
h1 {
  font-size: 1.5rem;
}
h2 {
  margin-top: 0;
  font-size: 1.15rem;
}
h3 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  background: #fafafa;
}
.hint {
  font-size: 0.9rem;
  color: #444;
  margin-top: 0;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  margin-top: 0.75rem;
}
.form input {
  padding: 0.45rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
button {
  padding: 0.45rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #333;
  background: #1e5a96;
  color: #fff;
  cursor: pointer;
}
button.secondary {
  background: #fff;
  color: #333;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.err {
  color: #b00020;
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}
.status {
  font-size: 0.9rem;
  margin-bottom: 0;
}
.ok {
  color: #0d6b3a;
}
.bad {
  color: #b00020;
}
.http-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed #ccc;
}
.http-block:first-of-type {
  border-top: none;
  padding-top: 0;
}
.meta {
  font-size: 0.85rem;
  color: #555;
}
.json {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.8rem;
  overflow: auto;
}
.toast {
  font-size: 0.9rem;
  margin-top: 0.75rem;
}
</style>
