import { createApp } from 'vue';
import { t } from '@stylekit/i18n';

import App from './App.vue';
import BIcon from '../shared/components/BIcon.vue';

import { createBootstrap } from 'bootstrap-vue-next';

const app = createApp(App);

app.use(createBootstrap());
app.component('BIcon', BIcon);

app.config.globalProperties.t = t;

app.mount('#app');
