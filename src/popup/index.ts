import { createApp } from 'vue';
import { t } from '@stylekit/i18n';

import App from './App.vue';

import { BootstrapVue3 } from 'bootstrap-vue-3';

const app = createApp(App);

app.use(BootstrapVue3);

app.config.globalProperties.t = t;

app.mount('#app');
