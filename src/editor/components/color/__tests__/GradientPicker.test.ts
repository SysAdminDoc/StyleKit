// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import GradientPicker from '../GradientPicker.vue';

const mountPicker = () => {
  const dispatch = vi.fn();
  const wrapper = mount(GradientPicker, {
    global: {
      mocks: {
        $store: {
          state: { activeSelector: '#target' },
          getters: { activeRule: null },
          dispatch,
        },
        t: (key: string) => key,
      },
      stubs: {
        'b-row': { template: '<div><slot /></div>' },
        'css-property': { template: '<div><slot /></div>' },
        'css-property-value': { template: '<div><slot /></div>' },
      },
    },
  });
  return { dispatch, wrapper };
};

describe('GradientPicker', () => {
  it('applies positioned conic gradients', async () => {
    const { dispatch, wrapper } = mountPicker();
    await wrapper.setData({
      gradientType: 'conic',
      angle: 90,
      centerX: 25,
      centerY: 75,
    });

    wrapper.vm.apply();

    expect(dispatch).toHaveBeenLastCalledWith('applyDeclaration', {
      property: 'background-image',
      value: 'conic-gradient(from 90deg at 25% 75%, #89b4fa 0%, #cba6f7 100%)',
    });
  });

  it('offers eight one-click angle presets', () => {
    const { wrapper } = mountPicker();
    const presets = wrapper.findAll('.gradient-angle-preset');
    expect(presets).toHaveLength(8);
    expect(presets.map(button => button.text())).toEqual([
      '0°',
      '45°',
      '90°',
      '135°',
      '180°',
      '225°',
      '270°',
      '315°',
    ]);
  });

  it('copies a complete background-image declaration', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { wrapper } = mountPicker();

    await wrapper.vm.copyCss();

    expect(writeText).toHaveBeenCalledWith(
      'background-image: linear-gradient(180deg, #89b4fa 0%, #cba6f7 100%);'
    );
    expect(wrapper.text()).toContain('Copied CSS');
  });
});
