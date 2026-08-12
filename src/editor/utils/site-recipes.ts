export interface SiteRecipe {
  name: string;
  description: string;
  sites: string[];
  css: string;
}

export type SiteRecipeSuggestion = {
  siteName: string;
  recipe: SiteRecipe;
};

export const siteRecipes: SiteRecipe[] = [
  {
    name: 'Clean YouTube',
    description: 'Hide comments, sidebar recommendations, and end screens',
    sites: ['youtube.com'],
    css: '#comments { display: none; }\n#related { display: none; }\n.ytp-ce-element { display: none; }\n.ytp-cards-button { display: none; }',
  },
  {
    name: 'YouTube Focus Mode',
    description: 'Just the video - hide everything else',
    sites: ['youtube.com'],
    css: '#masthead-container { display: none; }\n#related { display: none; }\n#comments { display: none; }\n#info { display: none; }\n#meta { display: none; }\n#secondary { display: none; }',
  },
  {
    name: 'YouTube Dark Sidebar',
    description: 'Darken the sidebar and guide',
    sites: ['youtube.com'],
    css: 'ytd-mini-guide-renderer { background: #0f0f0f; }\nytd-guide-renderer { background: #0f0f0f; }',
  },
  {
    name: 'Clean Reddit',
    description: 'Hide sidebar, promoted posts, and awards',
    sites: ['reddit.com'],
    css: '[data-testid="frontpage-sidebar"] { display: none; }\n[data-testid="post-container"] shreddit-post[is-promoted] { display: none; }\n.award-button { display: none; }',
  },
  {
    name: 'Reddit Wide Mode',
    description: 'Make content full width',
    sites: ['reddit.com'],
    css: '.ListingLayout-outerContainer { max-width: 100%; }\n.ListingLayout-backgroundContainer { max-width: 100%; }',
  },
  {
    name: 'Clean Twitter/X',
    description: 'Hide trending sidebar, who to follow, and promoted tweets',
    sites: ['twitter.com', 'x.com'],
    css: '[data-testid="sidebarColumn"] { display: none; }\n[data-testid="placementTracking"] { display: none; }',
  },
  {
    name: 'Twitter/X Focus',
    description: 'Maximize timeline width',
    sites: ['twitter.com', 'x.com'],
    css: '[data-testid="sidebarColumn"] { display: none; }\n[data-testid="primaryColumn"] { max-width: 100%; }',
  },
  {
    name: 'GitHub Wide Code',
    description: 'Make code and file views full width',
    sites: ['github.com'],
    css: '.container-xl { max-width: 100%; }\n.js-repo-pjax-container .container-xl { padding-left: 16px; padding-right: 16px; }',
  },
  {
    name: 'Google Clean Search',
    description: 'Hide ads and sidebar from Google search results',
    sites: ['google.com'],
    css: '#tads { display: none; }\n#tadsb { display: none; }\n#rhs { display: none; }\n.commercial-unit-desktop-top { display: none; }',
  },
  {
    name: 'Amazon Clean',
    description: 'Hide sponsored products and ad placements',
    sites: ['amazon.com'],
    css: '.AdHolder { display: none; }\n[data-cel-widget*="sponsored"] { display: none; }\n.s-sponsored-label-info-icon { display: none; }',
  },
  {
    name: 'Wikipedia Reader',
    description: 'Wider content, larger text, cleaner layout',
    sites: ['wikipedia.org'],
    css: '#mw-content-text { font-size: 18px; line-height: 1.7; }\n.mw-body { max-width: 900px; margin: 0 auto; }',
  },
  {
    name: 'Facebook Clean',
    description: 'Hide sponsored posts and right sidebar',
    sites: ['facebook.com'],
    css: '[data-pagelet="RightRail"] { display: none; }\n[aria-label="Sponsored"] { display: none; }',
  },
];

const SITE_NAMES: Record<string, string> = {
  'amazon.com': 'Amazon',
  'facebook.com': 'Facebook',
  'github.com': 'GitHub',
  'google.com': 'Google',
  'reddit.com': 'Reddit',
  'twitter.com': 'Twitter/X',
  'wikipedia.org': 'Wikipedia',
  'x.com': 'Twitter/X',
  'youtube.com': 'YouTube',
};

const getHostname = (urlOrHostname: string): string => {
  const value = urlOrHostname.trim().toLowerCase();
  if (!value) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname
      .replace(/\.$/, '')
      .toLowerCase();
  } catch {
    return '';
  }
};

const matchesDomain = (hostname: string, domain: string): boolean =>
  hostname === domain || hostname.endsWith(`.${domain}`);

export const findSiteRecipes = (urlOrHostname: string): SiteRecipe[] => {
  const hostname = getHostname(urlOrHostname);
  if (!hostname) return [];
  return siteRecipes.filter(recipe =>
    recipe.sites.some(site => matchesDomain(hostname, site))
  );
};

export const getSiteRecipeSuggestion = (
  urlOrHostname: string
): SiteRecipeSuggestion | null => {
  const hostname = getHostname(urlOrHostname);
  const recipe = findSiteRecipes(hostname)[0];
  if (!recipe) return null;
  const domain = recipe.sites.find(site => matchesDomain(hostname, site));
  return {
    siteName: (domain && SITE_NAMES[domain]) || domain || hostname,
    recipe,
  };
};
