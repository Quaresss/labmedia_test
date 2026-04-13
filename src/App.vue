<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Toast from 'primevue/toast'
import RegistrationFormDemo from './components/RegistrationFormDemo.vue'
import FeedbackFormDemo from './components/FeedbackFormDemo.vue'
import HttpRequestDemo from './components/HttpRequestDemo.vue'

const activeTab = ref('register')
</script>

<template>
  <div class="app-shell">
    <Toast position="top-right" />

    <main class="app-main">
      <div class="app-container">
        <Card pt:root:class="app-tabs-card" pt:body:class="app-tabs-body">
          <template #content>
            <Tabs v-model:value="activeTab" class="app-tabs">
              <TabList>
                <Tab value="register">
                  <span class="pi pi-user-plus tab-icon" aria-hidden="true" />
                   Форма регистрации
                </Tab>
                <Tab value="feedback">
                  <span class="pi pi-envelope tab-icon" aria-hidden="true" />
                  Форма обратной связи
                </Tab>
                <Tab value="http">
                  <span class="pi pi-cloud-download tab-icon" aria-hidden="true" />
                  HTTP запросы
                </Tab>
              </TabList>
              <Divider class="tab-divider" />
              <TabPanels pt:root:class="tab-panels-root">
                <TabPanel value="register">
                  <RegistrationFormDemo />
                </TabPanel>
                <TabPanel value="feedback">
                  <FeedbackFormDemo />
                </TabPanel>
                <TabPanel value="http">
                  <HttpRequestDemo />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </template>
        </Card>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--p-text-color);
}

.app-main {
  flex: 1;
  display: flex;
  align-items: safe center;
  justify-content: center;
  padding: 1.5rem clamp(1rem, 4vw, 2rem);
  box-sizing: border-box;
}

.app-container {
  width: 100%;
  max-width: 42rem;
}

.app-tabs-card {
  box-shadow: var(--p-card-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.06));
}

.app-tabs-body {
  padding-top: 0.5rem;
}

.app-tabs :deep(.p-tablist) {
  gap: 0.25rem;
}

.tab-icon {
  margin-right: 0.45rem;
  opacity: 0.85;
}

.tab-divider {
  margin: 0 0 0.5rem;
}
</style>

<style>
.tab-panels-root {
  padding-top: 0.75rem;
}
</style>
