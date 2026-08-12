// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils';
import TheSelectiveSync from '../TheSelectiveSync.vue';
import {
  getSelectiveSyncConfig,
  setSelectiveSyncConfig,
} from '../../../utils';

vi.mock('../../../utils', () => ({
  getSelectiveSyncConfig: vi.fn(),
  setSelectiveSyncConfig: vi.fn(),
}));

describe('selective sync controls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSelectiveSyncConfig).mockResolvedValue({
      mode: 'all',
      urls: [],
    });
    vi.mocked(setSelectiveSyncConfig).mockImplementation(async config => config);
  });

  it('saves an explicit subset of URL-keyed styles', async () => {
    const wrapper = shallowMount(TheSelectiveSync, {
      global: {
        stubs: {
          AppButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
        mocks: {
          $store: {
            state: {
              styles: {
                'https://one.example/': {},
                'https://two.example/': {},
              },
            },
          },
        },
      },
    });
    await flushPromises();
    await wrapper.get('input[value="selected"]').setValue();
    await wrapper
      .get('[aria-label="Sync style https://one.example/"]')
      .setValue(true);
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Save sync selection'))
      ?.trigger('click');
    await flushPromises();

    expect(setSelectiveSyncConfig).toHaveBeenCalledWith({
      mode: 'selected',
      urls: ['https://one.example/'],
    });
    expect(wrapper.text()).toContain('1 selected style will sync.');
  });
});
