import { createApp } from 'vue';
import { t } from '@stylekit/i18n';

import App from './App.vue';
import { installBootstrap } from '../shared/bootstrap';
import store from './store/index';

const app = createApp(App);

installBootstrap(app);
app.use(store);

app.config.globalProperties.t = t;

app.mount('#app');
