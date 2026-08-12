// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import TheAnimationEditor from '../TheAnimationEditor.vue';

const mountEditor = (css = '#target { color: red; }') => {
  const dispatch = vi.fn();
  const store = {
    state: { activeSelector: '#target', css },
    dispatch,
  };
  const wrapper = mount(TheAnimationEditor, {
    global: { mocks: { $store: store } },
  });
  return { dispatch, store, wrapper };
};

describe('TheAnimationEditor', () => {
  it('renders visual markers and inserts a keyframe in the largest gap', async () => {
    const { wrapper } = mountEditor();
    expect(wrapper.findAll('.animation-marker')).toHaveLength(2);

    await wrapper.find('.animation-actions button').trigger('click');

    expect(wrapper.findAll('.animation-marker')).toHaveLength(3);
    expect(wrapper.text()).toContain('50%');
  });

  it('applies the animation and generated keyframes through CSS history', async () => {
    const { dispatch, wrapper } = mountEditor();
    const buttons = wrapper.findAll('.animation-actions button');

    await buttons[1].trigger('click');

    expect(dispatch).toHaveBeenCalledTimes(1);
    const payload = dispatch.mock.calls[0][1] as { css: string };
    expect(dispatch.mock.calls[0][0]).toBe('applyCss');
    expect(payload.css).toContain('animation: stylekit-');
    expect(payload.css).toContain('@keyframes stylekit-');
    expect(payload.css).toContain('transform: translateY(12px)');
  });

  it('removes only the selector-scoped managed animation', async () => {
    const { dispatch, store, wrapper } = mountEditor();
    wrapper.vm.applyAndReplay();
    store.state.css = dispatch.mock.calls[0][1].css;
    dispatch.mockClear();

    await wrapper.findAll('.animation-actions button')[2].trigger('click');

    const payload = dispatch.mock.calls[0][1] as { css: string };
    expect(payload.css).toContain('color: red');
    expect(payload.css).not.toContain('@keyframes stylekit-');
  });

  it('shows declaration validation errors without changing CSS', async () => {
    const { dispatch, wrapper } = mountEditor();
    await wrapper
      .find('textarea')
      .setValue('@media (prefers-reduced-motion: reduce) {}');

    await wrapper.findAll('.animation-actions button')[1].trigger('click');

    expect(dispatch).not.toHaveBeenCalled();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});
