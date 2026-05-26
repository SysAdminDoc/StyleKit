import * as postcss from 'postcss';
import actions from '../actions';

import * as stylebotCss from '@stylekit/css';
import * as chromeUtils from '../../utils/chrome';

vi.mock('@stylekit/css');
vi.mock('../../utils/chrome');

const mockRoot = ({
  some: vi.fn(),
  walkRules: vi.fn(),
  append: vi.fn(),
  toString: vi.fn().mockReturnValue(''),
} as never) as postcss.Root;

const mockCommit = vi.fn();
const mockDispatch = vi.fn();

const mockState = {
  css: '',
  enabled: true,
  url: 'example.com',
  selectors: [],
  activeSelector: '',
  contextMenuSelector: '',
  help: false,
  visible: false,
  inspecting: false,
  resizing: false,
  readability: false,
  colorPickerVisible: false,
  options: {} as any,
  commands: null,
  editorCommands: {} as any,
  readabilitySettings: {} as any,
  cssHistory: [''],
  cssHistoryIndex: 0,
};

describe('actions', () => {
  beforeAll(() => {
    vi.spyOn(stylebotCss, 'injectRootIntoDocument');
    vi.spyOn(chromeUtils, 'setStyle');
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(stylebotCss.safeParse).mockReturnValue(mockRoot);
  });

  describe('applyCss', () => {
    it('does not commit invalid css', () => {
      vi.mocked(stylebotCss.safeParse).mockImplementation(() => {
        throw new Error();
      });

      try {
        actions.applyCss(
          { commit: mockCommit, state: mockState },
          { css: 'invalid' }
        );
      } catch (e) {
        expect(mockCommit).toBeCalledTimes(0);
        expect(chromeUtils.setStyle).toBeCalledTimes(0);
        expect(stylebotCss.injectRootIntoDocument).toBeCalledTimes(0);
      }
    });

    it('invokes setStyle correctly', () => {
      const css = 'a { color: red; }';
      vi.mocked(stylebotCss.removeEmptyRules).mockReturnValue(css);

      actions.applyCss({ commit: mockCommit, state: mockState }, { css });

      expect(mockCommit).toHaveBeenNthCalledWith(1, 'setCss', css);
      expect(mockCommit).toHaveBeenNthCalledWith(2, 'setSelectors', mockRoot);

      expect(stylebotCss.injectRootIntoDocument).toBeCalledWith(
        mockRoot,
        mockState.url
      );

      expect(stylebotCss.removeEmptyRules).toBeCalledWith(css);
      expect(chromeUtils.setStyle).toBeCalledWith(
        mockState.url,
        css,
        mockState.readability
      );
    });
  });

  describe('applyDeclaration', () => {
    it('no-op if no selector is active', () => {
      actions.applyDeclaration(
        { state: mockState, dispatch: mockDispatch },
        {
          property: 'color',
          value: 'red',
        }
      );

      expect(stylebotCss.addDeclaration).toBeCalledTimes(0);
      expect(mockDispatch).toBeCalledTimes(0);
    });

    it('invokes addDeclaration correctly', () => {
      const state = { ...mockState, activeSelector: 'a' };

      vi.mocked(stylebotCss.addDeclaration).mockReturnValue(
        'outputOfAddDeclaration'
      );

      actions.applyDeclaration(
        {
          state,
          dispatch: mockDispatch,
        },
        {
          property: 'color',
          value: 'red',
        }
      );

      expect(stylebotCss.addDeclaration).toBeCalledWith(
        'color',
        'red',
        'a',
        ''
      );

      expect(mockDispatch).toBeCalledWith('applyCss', {
        css: 'outputOfAddDeclaration',
      });
    });
  });
});
