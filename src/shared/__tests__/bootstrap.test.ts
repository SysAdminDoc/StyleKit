import { createApp } from 'vue';
import { installBootstrap } from '../bootstrap';

describe('Bootstrap component registration', () => {
  it('registers the components used by extension UI templates', () => {
    const app = createApp({});
    installBootstrap(app);

    for (const name of [
      'BButton',
      'BCol',
      'BContainer',
      'BDropdown',
      'BFormCheckbox',
      'BFormInput',
      'BIcon',
      'BRow',
      'BTableSimple',
    ]) {
      expect(app.component(name), name).toBeDefined();
    }
  });
});
