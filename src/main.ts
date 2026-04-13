import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'
import App from './App.vue'
import './style.css'

const AppTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{zinc.50}',
      100: '{zinc.100}',
      200: '{zinc.200}',
      300: '{zinc.300}',
      400: '{zinc.400}',
      500: '{zinc.900}',
      600: '{zinc.950}',
      700: '#000000',
      800: '#000000',
      900: '#000000',
      950: '#000000',
    },
  },
})

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: AppTheme,
    options: {
      darkModeSelector: '.p-dark',
    },
  },
})
app.use(ToastService)
app.mount('#app')
