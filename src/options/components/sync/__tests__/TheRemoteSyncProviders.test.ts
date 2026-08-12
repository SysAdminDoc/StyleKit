// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils';
import TheRemoteSyncProviders from '../TheRemoteSyncProviders.vue';
import {
  getRemoteSyncSettings,
  runRemoteSync,
  saveRemoteSyncConfig,
} from '../../../utils';

vi.mock('../../../utils', () => ({
  deleteRemoteSyncConfig: vi.fn(),
  getRemoteSyncSettings: vi.fn(),
  runRemoteSync: vi.fn(),
  saveRemoteSyncConfig: vi.fn(),
}));

const settings = {
  configs: {},
  metadata: {},
};

describe('remote sync provider controls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRemoteSyncSettings).mockResolvedValue(settings);
    vi.mocked(saveRemoteSyncConfig).mockImplementation(async config => ({
      configs: { [config.provider]: config },
      metadata: {},
    }));
    vi.mocked(runRemoteSync).mockResolvedValue({
      provider: 'webdav',
      syncedAt: '2026-08-12T12:00:00.000Z',
      remoteCreated: true,
      localChanged: false,
      conflicts: [],
      tombstonesApplied: 0,
    });
  });

  it('saves a WebDAV endpoint before enabling a remote sync', async () => {
    const wrapper = shallowMount(TheRemoteSyncProviders, {
      global: {
        stubs: {
          'b-form-input': {
            inheritAttrs: false,
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
        mocks: { $store: { dispatch: vi.fn() } },
      },
    });
    await flushPromises();
    await wrapper
      .get('[aria-label="WebDAV object URL"]')
      .setValue('https://dav.example.com/stylekit.json');
    await wrapper.get('[aria-label="WebDAV username"]').setValue('alice');
    await wrapper.get('[aria-label="WebDAV password"]').setValue('app-pass');
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Save credentials'))
      ?.trigger('click');
    await flushPromises();

    expect(saveRemoteSyncConfig).toHaveBeenCalledWith({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: 'alice',
      password: 'app-pass',
    });
    const webDavCard = wrapper
      .findAll('section')
      .find(section => section.text().includes('WebDAV'));
    const syncButton = webDavCard
      ?.findAll('button')
      .find(button => button.text().includes('Sync now'));
    expect(syncButton?.attributes('disabled')).toBeUndefined();
    await syncButton?.trigger('click');
    await flushPromises();

    expect(runRemoteSync).toHaveBeenCalledWith('webdav');
    expect(wrapper.text()).toContain('Remote backup created.');
  });
});
