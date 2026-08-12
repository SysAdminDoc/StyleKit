import type { UserRecipe } from '@stylekit/types';
import {
  createUserRecipeExport,
  parseUserRecipeExport,
} from '../../utils/user-recipes';

export const downloadUserRecipes = (
  recipes: UserRecipe[],
  filename = 'stylekit-recipes.json'
): void => {
  const json = JSON.stringify(createUserRecipeExport(recipes), null, 2);
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json;charset=utf-8' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const pickUserRecipeFile = (): Promise<UserRecipe[]> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No recipe file selected'));
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          const parsed = parseUserRecipeExport(
            JSON.parse(String(reader.result || ''))
          );
          resolve(parsed.recipes);
        } catch (error) {
          reject(error);
        }
      });
      reader.addEventListener('error', () =>
        reject(reader.error || new Error('Recipe file could not be read'))
      );
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    input.remove();
  });
