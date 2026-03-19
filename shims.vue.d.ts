declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'bootstrap-vue-3' {
  import type { Plugin } from 'vue';
  export const BootstrapVue3: Plugin;
  export const BListGroup: any;
  export const BListGroupItem: any;
  export const BFormCheckbox: any;
  export const BFormInput: any;
  export const BButton: any;
  export const BRow: any;
  export const BCol: any;
  export const BModal: any;
  export const BDropdown: any;
  export const BDropdownItem: any;
  export const BFormTextarea: any;
  export const BFormGroup: any;
  export const BAlert: any;
  export const BTooltip: any;
  export const BCollapse: any;
  export const BFormRadio: any;
  export const BFormRadioGroup: any;
  export const BInputGroup: any;
  export const BInputGroupAppend: any;
  export const BButtonGroup: any;
  export const BTable: any;
  export const BTableSimple: any;
  export const BThead: any;
  export const BTbody: any;
  export const BTr: any;
  export const BTh: any;
  export const BTd: any;
}
