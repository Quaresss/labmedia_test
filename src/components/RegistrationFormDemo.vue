<script setup lang="ts">
import { reactive } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import { useFormValidation } from '../composables/useFormValidation'
import type { RegistrationForm } from '../types/registration-form'

const form = reactive<RegistrationForm>({
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
})

const { fieldState, isValid, hasError, validate, reset } = useFormValidation({
  model: form,
  schema: {
    displayName: [
      { type: 'required' },
      { type: 'minLength', min: 2 },
      { type: 'maxLength', max: 80 },
    ],
    email: [{ type: 'required' }, { type: 'email' }],
    password: [
      { type: 'required' },
      { type: 'minLength', min: 8 },
      {
        type: 'custom',
        validate: (v) => {
          const s = String(v)
          return /\d/.test(s) && /[a-zA-Z]/.test(s) ? true : 'Пароль должен содержать букву и цифру'
        },
      },
    ],
    confirmPassword: [
      { type: 'required' },
      {
        type: 'custom',
        validate: (v, ctx) => (v === ctx.values.password ? true : 'Пароли не совпадают'),
      },
    ],
    acceptTerms: [
      {
        type: 'custom',
        validate: (v) => (v === true ? true : 'Примите условия использования'),
      },
    ],
  },
})

const toast = useToast()

function onSubmit() {
  if (!validate()) return
  toast.add({
    severity: 'success',
    summary: 'Регистрация',
    detail: 'Форма прошла проверку',
    life: 4000,
  })
}
</script>

<template>
  <div class="demo-sheet">
    <h2 class="demo-title">Регистрация</h2>
    <form novalidate class="stack" @submit.prevent="onSubmit">
        <div class="field">
          <label for="reg-name" class="label">Имя</label>
          <InputText
            id="reg-name"
            v-model="form.displayName"
            fluid
            autocomplete="name"
            placeholder="Например, Иван Петров"
            :invalid="Boolean(fieldState.displayName?.errors.length)"
          />
          <Message
            v-if="fieldState.displayName?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.displayName?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field">
          <label for="reg-email" class="label">Email</label>
          <InputText
            id="reg-email"
            v-model="form.email"
            fluid
            type="text"
            inputmode="email"
            autocomplete="email"
            placeholder="you@example.com"
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
          <label for="reg-pass" class="label">Пароль</label>
          <Password
            id="reg-pass"
            v-model="form.password"
            fluid
            toggle-mask
            :feedback="false"
            input-class="w-full"
            autocomplete="new-password"
            placeholder="Не менее 8 символов, буква и цифра"
            :invalid="Boolean(fieldState.password?.errors.length)"
          />
          <Message
            v-if="fieldState.password?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.password?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field">
          <label for="reg-pass2" class="label">Повтор пароля</label>
          <Password
            id="reg-pass2"
            v-model="form.confirmPassword"
            fluid
            toggle-mask
            :feedback="false"
            input-class="w-full"
            autocomplete="new-password"
            placeholder="Повторите пароль"
            :invalid="Boolean(fieldState.confirmPassword?.errors.length)"
          />
          <Message
            v-if="fieldState.confirmPassword?.errors.length"
            severity="error"
            size="small"
            variant="simple"
            :closable="false"
          >
            {{ fieldState.confirmPassword?.errors.join(' · ') }}
          </Message>
        </div>

        <div class="field terms">
          <Checkbox
            v-model="form.acceptTerms"
            input-id="reg-terms"
            binary
          />
          <label for="reg-terms" class="terms-label">Согласен с условиями</label>
        </div>
        <Message
          v-if="fieldState.acceptTerms?.errors.length"
          severity="error"
          size="small"
          variant="simple"
          :closable="false"
        >
          {{ fieldState.acceptTerms?.errors.join(' · ') }}
        </Message>

        <div class="actions">
          <Button type="submit" label="Зарегистрироваться" icon="pi pi-user-plus" />
          <Button
            type="button"
            label="Сброс"
            severity="secondary"
            outlined
            @click="reset({ remeasureInitial: true })"
          />
        </div>

        <p class="status">
          <span :class="{ ok: isValid, bad: hasError }">isValid: {{ isValid }}</span>
          <span class="sep">·</span>
          <span>dirty (email): {{ fieldState.email?.dirty }}</span>
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

.terms {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.terms-label {
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
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

.sep {
  margin: 0 0.35rem;
  opacity: 0.5;
}
</style>
