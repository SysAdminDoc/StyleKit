import { StyleMap } from '@stylekit/types';
import BackgroundPageUtils from './utils';

/**
 * Pre-indexed style lookup for fast hostname-based matching.
 * Falls back to full pattern matching for wildcards and regex.
 */
export class StyleIndex {
  // hostname -> array of style URLs that match that hostname
  private hostnameMap = new Map<string, string[]>();
  // URLs that require pattern matching (wildcards, regex, comma-separated)
  private patternUrls: string[] = [];
  private allStyles: StyleMap = {};

  build(styles: StyleMap): void {
    this.hostnameMap.clear();
    this.patternUrls = [];
    this.allStyles = styles;

    for (const url in styles) {
      if (url === '*') {
        // Global wildcard - matches everything, handled separately
        this.patternUrls.push(url);
        continue;
      }

      if (this.isPattern(url)) {
        this.patternUrls.push(url);
        continue;
      }

      // Extract hostname from simple URL patterns
      const hostname = this.extractHostname(url);
      if (hostname) {
        const existing = this.hostnameMap.get(hostname) || [];
        existing.push(url);
        this.hostnameMap.set(hostname, existing);
      } else {
        this.patternUrls.push(url);
      }
    }
  }

  /**
   * Find all style URLs that match a given page URL.
   * Uses the hostname index for fast lookups, then falls back to pattern matching.
   */
  getMatchingUrls(pageUrl: string): string[] {
    const matches: string[] = [];

    try {
      const parsed = new URL(pageUrl);
      const hostname = parsed.hostname;

      // Check exact hostname matches and parent domain matches
      // e.g., for "sub.example.com", check "sub.example.com", "example.com"
      const parts = hostname.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        const domain = parts.slice(i).join('.');
        const urls = this.hostnameMap.get(domain);
        if (urls) {
          for (const url of urls) {
            if (BackgroundPageUtils.matches(pageUrl, url)) {
              matches.push(url);
            }
          }
        }
      }
    } catch {
      // Invalid URL, fall through to pattern matching
    }

    // Check pattern URLs (wildcards, regex)
    for (const url of this.patternUrls) {
      if (BackgroundPageUtils.matches(pageUrl, url)) {
        matches.push(url);
      }
    }

    return matches;
  }

  private isPattern(url: string): boolean {
    return url.includes('*') || url.startsWith('^') || url.includes(',');
  }

  private extractHostname(url: string): string | null {
    try {
      const trimmed = url.trim();
      // Strip protocol if present
      const matches = trimmed.match(/^(?:\w+:\/\/)?([^\/:\?#]+)/);
      return matches ? matches[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }
}
