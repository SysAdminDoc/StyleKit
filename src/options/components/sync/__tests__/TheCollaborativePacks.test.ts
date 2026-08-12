// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils';
import TheCollaborativePacks from '../TheCollaborativePacks.vue';
import {
  createCollaborativePack,
  getCollaborativePacks,
} from '../../../utils';

vi.mock('../../../utils', () => ({
  applyCollaborativePack: vi.fn(),
  captureCollaborativePack: vi.fn(),
  createCollaborativePack: vi.fn(),
  deleteCollaborativePack: vi.fn(),
  exportCollaborativePack: vi.fn(),
  getCollaborativePacks: vi.fn(),
  importCollaborativePack: vi.fn(),
}));

const pack = {
  id: 'pack-1',
  name: 'Shared design pack',
  createdAt: '2026-08-12T10:00:00.000Z',
  updatedAt: '2026-08-12T10:00:00.000Z',
  styleCount: 2,
  stateVector: 'AQID',
};

describe('collaborative pack controls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCollaborativePacks).mockResolvedValue([]);
  });

  it('creates a Yjs pack from the current style library', async () => {
    vi.mocked(createCollaborativePack).mockResolvedValue([pack]);
    const wrapper = shallowMount(TheCollaborativePacks, {
      global: {
        stubs: {
          'b-form-input': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
        mocks: { $store: { dispatch: vi.fn() } },
      },
    });
    await flushPromises();
    await wrapper.get('input').setValue('Shared design pack');
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Create'))
      ?.trigger('click');
    await flushPromises();

    expect(createCollaborativePack).toHaveBeenCalledWith('Shared design pack');
    expect(wrapper.text()).toContain('2 styles');
    expect(wrapper.text()).toContain('Collaborative pack created');
  });
});
