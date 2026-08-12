// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import TheCssDiffView from '../TheCssDiffView.vue';
import { getStyleVersion } from '../../utils/chrome';

vi.mock('../../utils/chrome', () => ({
  getStyleVersion: vi.fn(),
}));

const mountDiff = (css = 'a { color: blue; }') =>
  mount(TheCssDiffView, {
    props: { visible: true },
    global: {
      mocks: {
        $store: {
          state: { css, url: 'https://example.com' },
        },
      },
    },
  });

describe('saved CSS diff view', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads the persisted previous version and renders additions/removals', async () => {
    vi.mocked(getStyleVersion).mockResolvedValue({
      css: 'a { color: red; }',
      savedAt: '2026-08-12T10:00:00.000-04:00',
    });

    const wrapper = mountDiff();
    await flushPromises();

    expect(getStyleVersion).toHaveBeenCalledWith('https://example.com');
    expect(wrapper.text()).toContain('Compared with saved version from');
    expect(wrapper.find('.removed').text()).toContain('color: red');
    expect(wrapper.find('.added').text()).toContain('color: blue');
  });

  it('distinguishes a missing saved version from an unchanged version', async () => {
    vi.mocked(getStyleVersion).mockResolvedValue(null);
    const missing = mountDiff();
    await flushPromises();
    expect(missing.text()).toContain('No previous saved version yet');

    vi.mocked(getStyleVersion).mockResolvedValue({
      css: 'a { color: blue; }',
      savedAt: '2026-08-12T10:00:00.000-04:00',
    });
    const unchanged = mountDiff();
    await flushPromises();
    expect(unchanged.text()).toContain(
      'No changes from the previous saved version'
    );
  });

  it('exposes dialog and close-button semantics', async () => {
    vi.mocked(getStyleVersion).mockResolvedValue(null);
    const wrapper = mountDiff();
    await flushPromises();

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe(
      'true'
    );
    await wrapper.get('button[aria-label="Close CSS changes"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
