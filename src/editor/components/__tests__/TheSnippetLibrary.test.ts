// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils';
import TheSnippetLibrary from '../TheSnippetLibrary.vue';

const mountLibrary = () => {
  const dispatch = vi.fn();
  const state = {
    activeSelector: '#snippet-fixture',
    css: '#snippet-fixture { display: block; }',
  };
  const fixture = document.createElement('div');
  fixture.id = 'snippet-fixture';
  fixture.style.display = 'block';
  document.body.appendChild(fixture);
  const wrapper = shallowMount(TheSnippetLibrary, {
    global: {
      mocks: {
        $store: {
          state,
          getters: { activeRule: null },
          dispatch,
        },
      },
    },
  });
  return { dispatch, state, wrapper };
};

describe('snippet change previews', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('pins a live preview and explains each before/after declaration', async () => {
    const { dispatch, wrapper } = mountLibrary();
    const hideSnippet = wrapper.findAll('.snippet-item')[0];

    await hideSnippet.get('.snippet-preview-btn').trigger('click');

    expect(wrapper.get('.snippet-preview-panel').text()).toContain(
      'Hide element'
    );
    expect(wrapper.get('.snippet-preview-panel').text()).toContain('display');
    expect(wrapper.get('.snippet-preview-panel').text()).toContain('block');
    expect(wrapper.get('.snippet-preview-panel').text()).toContain(
      'none !important'
    );
    expect(dispatch).toHaveBeenCalledWith('applyDeclaration', {
      property: 'display',
      value: 'none !important',
    });
  });

  it('restores the exact CSS on cancel and keeps it on commit', async () => {
    const { dispatch, state, wrapper } = mountLibrary();
    const preview = wrapper.findAll('.snippet-item')[2].get(
      '.snippet-preview-btn'
    );
    await preview.trigger('click');
    await wrapper.get('.snippet-preview-actions button:last-child').trigger(
      'click'
    );
    expect(dispatch).toHaveBeenCalledWith('applyCss', { css: state.css });

    dispatch.mockClear();
    await preview.trigger('click');
    await wrapper.get('.snippet-preview-actions button:first-child').trigger(
      'click'
    );
    expect(dispatch).not.toHaveBeenCalledWith('applyCss', { css: state.css });
    expect(wrapper.find('.snippet-preview-panel').exists()).toBe(false);
  });
});
