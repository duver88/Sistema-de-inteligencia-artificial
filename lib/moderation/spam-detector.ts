import { matchesKeywords, DEFAULT_SPAM_PATTERNS } from './keyword-detector';

/**
 * Additional structural spam detection beyond keyword matching.
 * Checks for patterns common in bot/spam comments that aren't captured by keywords.
 */

// Patterns that indicate automated/spam behavior
const SPAM_STRUCTURAL_PATTERNS = [
  // All-caps promotional text (5+ words in caps)
  /^(?:[A-Z]{2,}\s+){4,}[A-Z]{2,}/,
  // Excessive emojis (5+ in a row)
  /[\u{1F300}-\u{1F9FF}]{5,}/u,
  // Repeated characters (aaaaaaa)
  /(.)\1{6,}/,
  // Multiple URLs
  /https?:\/\/\S+.*https?:\/\/\S+/,
];

/**
 * Check if a comment is spam using both keyword patterns and structural analysis.
 */
export function isSpam(text: string, customPatterns: string[] = []): boolean {
  // 1. Check custom patterns first (user-defined)
  if (customPatterns.length > 0 && matchesKeywords(text, customPatterns)) {
    return true;
  }

  // 2. Check default spam keyword patterns
  if (matchesKeywords(text, DEFAULT_SPAM_PATTERNS)) {
    return true;
  }

  // 3. Structural checks
  for (const pattern of SPAM_STRUCTURAL_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}
