// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import FontAxes from '../FontAxes.vue';

describe('FontAxes', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="target" style="font-family: \'Roboto Flex\'; font-weight: 450"></div>';
  });

  it('renders supported metadata ranges and applies variation settings', async () => {
    const dispatch = vi.fn();
    const wrapper = mount(FontAxes, {
      global: {
        mocks: {
          $store: {
            state: { activeSelector: '#target', css: '' },
            dispatch,
          },
        },
      },
    });
    await wrapper.setData({
      catalogAxes: {
        'Roboto Flex': [
          { tag: 'wght', min: 100, max: 1000, defaultValue: 400 },
          { tag: 'wdth', min: 25, max: 151, defaultValue: 100 },
          { tag: 'opsz', min: 8, max: 144, defaultValue: 14 },
        ],
      },
    });

    expect(wrapper.text()).toContain('Roboto Flex axes');
    expect(wrapper.find('#stylekit-font-weight').attributes('min')).toBe('100');
    expect(wrapper.findAll('.font-axis-row')).toHaveLength(3);

    await wrapper.find('input[aria-label="Width axis value"]').setValue('112');

    expect(dispatch).toHaveBeenLastCalledWith('applyDeclaration', {
      property: 'font-variation-settings',
      value: '"opsz" 14, "wdth" 112',
    });
  });

  it('always offers numeric font weight for non-variable fonts', async () => {
    const target = document.querySelector('#target') as HTMLElement;
    target.style.fontFamily = 'Arial';
    const dispatch = vi.fn();
    const wrapper = mount(FontAxes, {
      global: {
        mocks: {
          $store: {
            state: { activeSelector: '#target', css: '' },
            dispatch,
          },
        },
      },
    });

    await wrapper.find('input[aria-label="Font weight value"]').setValue('575');

    expect(dispatch).toHaveBeenLastCalledWith('applyDeclaration', {
      property: 'font-weight',
      value: '575',
    });
    expect(wrapper.text()).toContain('Variable axes appear');
  });
});
