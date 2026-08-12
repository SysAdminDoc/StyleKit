import type { App, Component } from 'vue';
import {
  BAlert,
  BButton,
  BButtonGroup,
  BCol,
  BCollapse,
  BContainer,
  BDropdown,
  BDropdownDivider,
  BDropdownHeader,
  BDropdownItem,
  BFormCheckbox,
  BFormInput,
  BInputGroup,
  BInputGroupText,
  BListGroup,
  BListGroupItem,
  BRow,
  BTableSimple,
  BTbody,
  BTd,
  BTh,
  BThead,
  BTr,
  createBootstrap,
} from 'bootstrap-vue-next';

import BIcon from './components/BIcon.vue';

const components: Record<string, Component> = {
  BAlert,
  BButton,
  BButtonGroup,
  BCol,
  BCollapse,
  BContainer,
  BDropdown,
  BDropdownDivider,
  BDropdownHeader,
  BDropdownItem,
  BFormCheckbox,
  BFormInput,
  BIcon,
  BInputGroup,
  BInputGroupText,
  BListGroup,
  BListGroupItem,
  BRow,
  BTableSimple,
  BTbody,
  BTd,
  BTh,
  BThead,
  BTr,
};

export const installBootstrap = (app: App): void => {
  app.use(createBootstrap());
  Object.entries(components).forEach(([name, component]) => {
    app.component(name, component);
  });
};
