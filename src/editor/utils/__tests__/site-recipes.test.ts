import {
  findSiteRecipes,
  getSiteRecipeSuggestion,
} from '../site-recipes';

describe('site recipe suggestions', () => {
  it('suggests the primary recipe on matching domains and subdomains', () => {
    expect(getSiteRecipeSuggestion('https://studio.youtube.com/video/1')).toMatchObject({
      siteName: 'YouTube',
      recipe: { name: 'Clean YouTube' },
    });
    expect(findSiteRecipes('youtube.com')).toHaveLength(3);
  });

  it('does not match lookalike hostnames', () => {
    expect(findSiteRecipes('https://notyoutube.com/')).toEqual([]);
    expect(findSiteRecipes('https://youtube.com.example.test/')).toEqual([]);
  });

  it('uses a friendly shared label for X domains', () => {
    expect(getSiteRecipeSuggestion('https://x.com/home')?.siteName).toBe(
      'Twitter/X'
    );
  });
});
