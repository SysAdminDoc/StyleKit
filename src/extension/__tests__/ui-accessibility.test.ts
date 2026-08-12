// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import DeleteStyleDialog from '../../editor/components/header/TheDeleteStyleDialog.vue';
import Onboarding from '../../editor/components/TheOnboarding.vue';
import EditorToast from '../../editor/components/TheToast.vue';
import UndoToast from '../../options/components/UndoToast.vue';
import PopupStyle from '../../popup/components/Style.vue';
import {
  stopKeyboardPropagation,
  trapFocus,
} from '../../shared/utils/accessibility';
import {
  getEditorOnboardingDone,
  setEditorOnboardingDone,
} from '../../editor/utils/chrome';

vi.mock('../../editor/utils/chrome', () => ({
  getEditorOnboardingDone: vi.fn(),
  setEditorOnboardingDone: vi.fn(),
}));

const buttonStub = {
  template:
    '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
};

describe('extension UI accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(getEditorOnboardingDone).mockResolvedValue(true);
    vi.mocked(setEditorOnboardingDone).mockResolvedValue(undefined);
  });

  it('traps focus within a dialog in both directions', () => {
    const dialog = document.createElement('div');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button>First</button><button>Last</button>';
    document.body.appendChild(dialog);
    const [first, last] = Array.from(dialog.querySelectorAll('button'));

    last.focus();
    const forward = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    trapFocus(forward, dialog);
    expect(document.activeElement).toBe(first);
    expect(forward.defaultPrevented).toBe(true);

    first.focus();
    const backward = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    trapFocus(backward, dialog);
    expect(document.activeElement).toBe(last);
    expect(backward.defaultPrevented).toBe(true);
  });

  it('keeps editor keystrokes from leaking to page shortcuts', () => {
    const pageShortcut = vi.fn();
    const editorHost = document.createElement('div');
    const input = document.createElement('input');
    const button = document.createElement('button');
    editorHost.append(input, button);
    document.body.appendChild(editorHost);
    editorHost.addEventListener('keydown', stopKeyboardPropagation);
    document.body.addEventListener('keydown', pageShortcut);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true })
    );
    expect(pageShortcut).not.toHaveBeenCalled();

    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(pageShortcut).toHaveBeenCalledOnce();
  });

  it('labels popup icon controls with their style context', () => {
    const wrapper = mount(PopupStyle, {
      props: {
        url: 'example.com',
        initialEnabled: true,
      },
      global: {
        stubs: {
          'b-list-group-item': { template: '<div><slot /></div>' },
          'b-form-checkbox': {
            template: '<label><input type="checkbox" /><slot /></label>',
          },
        },
      },
    });

    expect(wrapper.get('.edit-btn').attributes('aria-label')).toBe(
      'Edit style for example.com'
    );
    expect(wrapper.get('.delete-btn').attributes('aria-label')).toBe(
      'Delete style for example.com'
    );
  });

  it('focuses, contains, closes, and restores focus for destructive dialogs', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const dispatch = vi.fn();
    const wrapper = mount(DeleteStyleDialog, {
      attachTo: document.body,
      global: {
        mocks: {
          $store: { state: { url: 'example.com' }, dispatch },
          t: (key: string) => key,
        },
        stubs: { 'b-button': buttonStub },
      },
    });
    await nextTick();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent?.trim()).toBe('cancel');

    const buttons = wrapper.findAll('button');
    buttons[buttons.length - 1].element.focus();
    await dialog.trigger('keydown', { key: 'Tab' });
    expect(document.activeElement?.textContent?.trim()).toBe('cancel');

    await dialog.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
    expect(document.activeElement).toBe(opener);
  });

  it('announces onboarding state and returns focus when dismissed', async () => {
    vi.mocked(getEditorOnboardingDone).mockResolvedValue(false);
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const wrapper = mount(Onboarding, { attachTo: document.body });
    await flushPromises();
    await nextTick();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-labelledby')).toBe('onboarding-title');
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe(
      'Step 1 of 3'
    );
    expect(document.activeElement?.textContent?.trim()).toBe('Next');

    await dialog.trigger('keydown', { key: 'Escape' });
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(setEditorOnboardingDone).toHaveBeenCalledWith(true);
  });

  it('announces editor and options toast messages politely', async () => {
    const editorToast = mount(EditorToast, {
      global: {
        mocks: {
          $store: {
            state: { css: '', cssHistoryIndex: 1, visible: true },
            dispatch: vi.fn(),
          },
        },
      },
    });
    await editorToast.setData({ visible: true, message: 'Style updated' });
    expect(editorToast.get('[role="status"]').attributes('aria-live')).toBe(
      'polite'
    );
    expect(editorToast.text()).toContain('Style updated');

    const optionsToast = mount(UndoToast, {
      props: { visible: true, message: 'Deleted style' },
    });
    expect(optionsToast.get('[role="status"]').attributes('aria-live')).toBe(
      'polite'
    );
    expect(optionsToast.text()).toContain('Deleted style');
  });

  it('ships focus rings and reduced-motion overrides in every UI surface', () => {
    const accessibilityScss = readFileSync(
      resolve(process.cwd(), 'src/shared/scss/_accessibility.scss'),
      'utf8'
    );
    expect(accessibilityScss).toContain(':focus-visible');
    expect(accessibilityScss).toContain('prefers-reduced-motion: reduce');

    for (const entry of [
      'src/editor/index.scss',
      'src/popup/App.vue',
      'src/options/App.vue',
    ]) {
      const source = readFileSync(resolve(process.cwd(), entry), 'utf8');
      expect(source, entry).toContain('accessibility.focus-ring');
      expect(source, entry).toContain('accessibility.reduced-motion');
    }
  });
});
