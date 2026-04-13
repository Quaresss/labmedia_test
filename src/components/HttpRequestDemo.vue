<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useHttpRequest, HttpRequestError } from '../composables/useHttpRequest'
import type {
  CreatePostBody,
  CreatePostResponse,
  JsonPlaceholderDeleteResult,
  JsonPlaceholderPost,
} from '../types/jsonplaceholder'

const JP = 'https://jsonplaceholder.typicode.com'
const errGetUrl = `${JP}/posts/999999999`
const errRoute404 = `${JP}/nonexistent-resource-404`
const errPostUrl = errRoute404
const errDeleteUrl = errRoute404

const getPost = useHttpRequest<JsonPlaceholderPost>({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET',
  query: { _example: 'vue-demo' },
})

const createPost = useHttpRequest<CreatePostResponse, CreatePostBody>({
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  body: { title: '', body: '', userId: 1 },
})

const deletePost = useHttpRequest<JsonPlaceholderDeleteResult>({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'DELETE',
})

const toast = useToast()

const getPostErrorText = computed(() => getPost.error.value?.message ?? '')
const createPostErrorText = computed(() => createPost.error.value?.message ?? '')
const deletePostErrorText = computed(() => deletePost.error.value?.message ?? '')

function toastHttpResult(method: string, ok: boolean, detail: string) {
  toast.add({
    severity: ok ? 'success' : 'error',
    summary: ok ? `${method}: успех` : `${method}: ошибка`,
    detail,
    life: ok ? 4000 : 6000,
  })
}

async function runGetExample() {
  try {
    await getPost.execute()
    toastHttpResult('GET', true, `Статус ${getPost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('GET', e)
  }
}

async function runGetExampleError() {
  try {
    await getPost.execute({ url: errGetUrl, query: undefined })
    toastHttpResult('GET (404)', true, `Статус ${getPost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('GET (404)', e)
  }
}

async function runPostExample() {
  try {
    await createPost.execute({
      body: {
        title: 'Demo post',
        body: 'Создано через useHttpRequest',
        userId: 1,
      },
    })
    toastHttpResult('POST', true, `Статус ${createPost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('POST', e)
  }
}

async function runPostExampleError() {
  try {
    await createPost.execute({
      url: errPostUrl,
      body: {
        title: 'x',
        body: 'y',
        userId: 1,
      },
    })
    toastHttpResult('POST (404)', true, `Статус ${createPost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('POST (404)', e)
  }
}

async function runDeleteExample() {
  try {
    await deletePost.execute()
    toastHttpResult('DELETE', true, `Статус ${deletePost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('DELETE', e)
  }
}

async function runDeleteExampleError() {
  try {
    await deletePost.execute({ url: errDeleteUrl })
    toastHttpResult('DELETE (404)', true, `Статус ${deletePost.status.value ?? '—'}`)
  } catch (e) {
    handleHttpCatch('DELETE (404)', e)
  }
}

function handleHttpCatch(methodLabel: string, e: unknown) {
  if (e instanceof DOMException && e.name === 'AbortError') return
  const detail =
    e instanceof HttpRequestError ? `HTTP ${e.status}` : (e as Error).message
  toastHttpResult(methodLabel, false, detail)
}

function getSeverity(ok: boolean | undefined): 'success' | 'danger' | 'secondary' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'secondary'
}
</script>

<template>
  <div class="demo-sheet">
    <h2 class="demo-title">HTTP</h2>
    <section class="block">
        <h3 class="block-title">GET /posts/1</h3>
        <div class="row">
          <Button
            label="execute GET"
            icon="pi pi-download"
            :disabled="getPost.loading.value"
            @click="runGetExample"
          />
          <Button
            label="GET 404"
            icon="pi pi-times-circle"
            severity="danger"
            outlined
            :disabled="getPost.loading.value"
            @click="runGetExampleError"
          />
        </div>
        <div v-if="getPost.loading.value" class="spinner-wrap">
          <ProgressSpinner stroke-width="4" animation-duration=".8s" style="width: 2rem; height: 2rem" />
        </div>
        <div class="tags">
          <Tag :severity="getSeverity(getPost.isSuccess.value)" :value="`status ${getPost.status.value ?? '—'}`" />
          <Tag
            v-if="getPost.isError.value"
            severity="danger"
            :value="getPost.error.value?.name ?? 'error'"
          />
        </div>
        <pre v-if="getPost.data" class="json">{{ JSON.stringify(getPost.data, null, 2) }}</pre>
        <p v-if="getPostErrorText" class="err">{{ getPostErrorText }}</p>
      </section>

      <Divider />

      <section class="block">
        <h3 class="block-title">POST /posts</h3>
        <div class="row">
          <Button
            label="execute POST"
            icon="pi pi-upload"
            :disabled="createPost.loading.value"
            @click="runPostExample"
          />
          <Button
            label="POST 404"
            icon="pi pi-times-circle"
            severity="danger"
            outlined
            :disabled="createPost.loading.value"
            @click="runPostExampleError"
          />
        </div>
        <div v-if="createPost.loading.value" class="spinner-wrap">
          <ProgressSpinner stroke-width="4" animation-duration=".8s" style="width: 2rem; height: 2rem" />
        </div>
        <div class="tags">
          <Tag
            :severity="getSeverity(createPost.isSuccess.value)"
            :value="`status ${createPost.status.value ?? '—'}`"
          />
        </div>
        <pre v-if="createPost.data" class="json">{{ JSON.stringify(createPost.data, null, 2) }}</pre>
        <p v-if="createPostErrorText" class="err">{{ createPostErrorText }}</p>
      </section>

      <Divider />

      <section class="block">
        <h3 class="block-title">DELETE /posts/1</h3>
        <div class="row">
          <Button
            label="execute DELETE"
            icon="pi pi-trash"
            severity="danger"
            :disabled="deletePost.loading.value"
            @click="runDeleteExample"
          />
          <Button
            label="DELETE 404"
            icon="pi pi-times-circle"
            severity="danger"
            outlined
            :disabled="deletePost.loading.value"
            @click="runDeleteExampleError"
          />
        </div>
        <div v-if="deletePost.loading.value" class="spinner-wrap">
          <ProgressSpinner stroke-width="4" animation-duration=".8s" style="width: 2rem; height: 2rem" />
        </div>
        <div class="tags">
          <Tag
            :severity="getSeverity(deletePost.isSuccess.value)"
            :value="`status ${deletePost.status.value ?? '—'}`"
          />
          <Tag
            v-if="deletePost.isError.value"
            severity="danger"
            :value="deletePost.error.value?.name ?? 'error'"
          />
        </div>
        <pre v-if="deletePost.data != null" class="json">{{ JSON.stringify(deletePost.data, null, 2) }}</pre>
        <p v-if="deletePostErrorText" class="err">{{ deletePostErrorText }}</p>
      </section>
  </div>
</template>

<style scoped>
.demo-sheet {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.demo-title {
  margin: 0 0 0.35rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.3;
}

.demo-subtitle {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

.demo-subtitle code {
  font-size: 0.92em;
}

.block-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.spinner-wrap {
  margin: 0.5rem 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.json {
  margin: 0.75rem 0 0;
  padding: 0.75rem;
  border-radius: var(--p-content-border-radius, 6px);
  background: var(--p-content-background, #f8fafc);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  font-size: 0.8rem;
  overflow: auto;
  text-align: left;
}

.err {
  color: var(--p-red-600, #b91c1c);
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}
</style>
