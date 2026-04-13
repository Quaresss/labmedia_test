<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { useFormValidation } from '../composables/useFormValidation'
import type { FeedbackForm } from '../types/feedback-form'

const subjectOptions = [
  { label: 'Общий вопрос', value: 'general' },
  { label: 'Ошибка / баг', value: 'bug' },
  { label: 'Предложение', value: 'idea' },
  { label: 'Другое', value: 'other' },
]

const form = reactive<FeedbackForm>({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const subjectModel = ref<{ label: string; value: string } | null>(null)

watch(subjectModel, () => {
  form.subject = subjectModel.value?.value ?? ''
})

const { fieldState, isValid, hasError, validate, reset } = useFormValidation({
  model: form,
  schema: {
    name: [
      { type: 'required' },
      { type: 'minLength', min: 2 },
      { type: 'maxLength', max: 100 },
    ],
    email: [{ type: 'required' }, { type: 'email' }],
    subject: [{ type: 'required', message: 'Выберите тему обращения' }],
    message: [
      { type: 'required' },
      { type: 'minLength', min: 10 },
      { type: 'maxLength', max: 2000 },
    ],
  },
})

const toast = useToast()

function onSubmit() {
  form.subject = subjectModel.value?.value ?? ''
  if (!validate()) return
  toast.add({
    severity: 'success',
    summary: 'Обратная связь',
    detail: 'Форма прошла проверку',
    life: 4000,
  })
}

function onReset() {
  reset({ remeasureInitial: true })
  subjectModel.value = null
}
</script>

<template>
  <div class="demo-sheet">
    <h2 class="demo-title">Обратная связь</h2>
    <form novalidate class="stack" @submit.prevent="onSubmit">
        <div class="field">
          <label for="fb-name" class="label">Имя</label>
          <InputText
            id="fb-name"
            v-model="form.name"
            fluid
            autocomplete="name"
            placeholder="Как к вам обращаться"
            :invalid="Boolean(fieldState.name?.errors.length)"
          />
          <Message
            v-if="fieldState.name?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.name?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field">
          <label for="fb-email" class="label">Email для ответа</label>
          <InputText
            id="fb-email"
            v-model="form.email"
            fluid
            type="text"
            inputmode="email"
            autocomplete="email"
            placeholder="email@example.com"
            :invalid="Boolean(fieldState.email?.errors.length)"
          />
          <Message
            v-if="fieldState.email?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.email?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field">
          <label for="fb-subject" class="label">Тема</label>
          <Select
            id="fb-subject"
            v-model="subjectModel"
            fluid
            :options="subjectOptions"
            option-label="label"
            placeholder="Выберите тему"
            :invalid="Boolean(fieldState.subject?.errors.length)"
          />
          <Message
            v-if="fieldState.subject?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.subject?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field">
          <label for="fb-msg" class="label">Сообщение</label>
          <Textarea
            id="fb-msg"
            v-model="form.message"
            fluid
            rows="5"
            auto-resize
            placeholder="Опишите вопрос, идею или проблему (от 10 символов)"
            :invalid="Boolean(fieldState.message?.errors.length)"
          />
          <Message
            v-if="fieldState.message?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.message?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="actions">
          <Button type="submit" label="Отправить" icon="pi pi-send" />
          <Button type="button" label="Очистить" severity="secondary" outlined @click="onReset" />
        </div>

        <p class="status">
          <span :class="{ ok: isValid, bad: hasError }">isValid: {{ isValid }}</span>
        </p>
    </form>
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
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.3;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color, #64748b);
}

.ok {
  color: var(--p-green-600, #15803d);
  font-weight: 500;
}

.bad {
  color: var(--p-red-600, #b91c1c);
  font-weight: 500;
}
</style>
