import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';

import FontSize from '../FontSize.vue';
import Length from '../../Length.vue';

const store = createStore({
  state: {
    activeSelector: '',
    options: {},
  },
  getters: {
    activeRule: () => null,
  },
});

describe('FontSize.vue', () => {
  it('should pass "font-size" as the "property" prop to Length', () => {
    const wrapper = mount(FontSize, {
      global: {
        plugins: [store],
        mocks: { t: (msg: string) => msg },
        stubs: {
          'b-row': { template: '<div><slot /></div>' },
          'b-form-input': true,
          'b-input-group': { template: '<div><slot /></div>' },
          'b-dropdown': true,
          'b-dropdown-item': true,
          'css-property': { template: '<div><slot /></div>' },
          'css-property-value': { template: '<div><slot /></div>' },
          'dropdown-hack-to-support-shadow-dom': { template: '<div><slot /></div>' },
        },
      },
    });

    const lengthWrapper = wrapper.findComponent(Length);
    expect(lengthWrapper.exists()).toBe(true);
    expect(lengthWrapper.props('property')).toBe('font-size');
  });
});
