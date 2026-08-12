import {
  formatStyleCode,
  MONACO_FORMAT_ON_SAVE_STORAGE_KEY,
  parseFormatOnSave,
} from '../format-on-save';

describe('Monaco Prettier on save', () => {
  it('only enables the persisted opt-in for a literal boolean true', () => {
    expect(parseFormatOnSave(true)).toBe(true);
    expect(parseFormatOnSave(false)).toBe(false);
    expect(parseFormatOnSave('true')).toBe(false);
    expect(MONACO_FORMAT_ON_SAVE_STORAGE_KEY).toBe(
      'stylekit-monaco-format-on-save'
    );
  });

  it('formats CSS with the project indentation convention', async () => {
    await expect(formatStyleCode('a{color:red}', 'css')).resolves.toBe(
      'a {\n  color: red;\n}\n'
    );
  });

  it('supports SCSS syntax through the PostCSS parser', async () => {
    await expect(
      formatStyleCode('$accent:red;a{color:$accent}', 'scss')
    ).resolves.toBe('$accent: red;\na {\n  color: $accent;\n}\n');
  });
});
