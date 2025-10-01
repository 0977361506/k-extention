/**
 * Smart text replacement utilities for Confluence Storage Format
 */

/**
 * Replace text in Confluence Storage Format while preserving XML structure
 */
export function replaceTextInStorageFormat(
  storageFormat: string,
  originalText: string,
  newText: string
): string {
  // Clean the original text for better matching
  const cleanOriginal = originalText.trim();
  
  // Strategy 1: Direct text replacement
  if (storageFormat.includes(cleanOriginal)) {
    return storageFormat.replace(cleanOriginal, newText);
  }
  
  // Strategy 2: Replace within HTML content while preserving tags
  const htmlContentRegex = /(>[^<]*?)([^<]*)/g;
  let result = storageFormat.replace(htmlContentRegex, (match, prefix, textContent) => {
    if (textContent.includes(cleanOriginal)) {
      return prefix + textContent.replace(cleanOriginal, newText);
    }
    return match;
  });
  
  // Strategy 3: Handle text that spans across multiple elements
  if (result === storageFormat) {
    // Try to find the text in plain text content
    const plainTextRegex = />([^<]*)</g;
    result = storageFormat.replace(plainTextRegex, (match, textContent) => {
      if (textContent.trim() === cleanOriginal) {
        return `>${newText}<`;
      }
      if (textContent.includes(cleanOriginal)) {
        return `>${textContent.replace(cleanOriginal, newText)}<`;
      }
      return match;
    });
  }
  
  // Strategy 4: Partial matching for complex cases
  if (result === storageFormat) {
    // Split original text into words and try partial replacements
    const words = cleanOriginal.split(/\s+/);
    if (words.length > 1) {
      // Try to find the start and end of the text
      const firstWord = words[0];
      const lastWord = words[words.length - 1];
      
      const startRegex = new RegExp(`(>[^<]*?)${escapeRegExp(firstWord)}([^<]*?<)`, 'g');
      result = storageFormat.replace(startRegex, (match, prefix, suffix) => {
        const fullText = prefix + firstWord + suffix;
        if (removeHtmlTags(fullText).includes(cleanOriginal)) {
          return prefix + newText + suffix.replace(/[^<]*/, '');
        }
        return match;
      });
    }
  }
  
  return result;
}

/**
 * Extract plain text from HTML content
 */
export function removeHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Escape special regex characters
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find text in storage format and get its context
 */
export function findTextInStorageFormat(
  storageFormat: string,
  searchText: string
): { found: boolean; context: string; startIndex: number; endIndex: number } {
  const cleanText = searchText.trim();
  
  // Simple direct search
  const directIndex = storageFormat.indexOf(cleanText);
  if (directIndex !== -1) {
    return {
      found: true,
      context: storageFormat.substring(Math.max(0, directIndex - 100), directIndex + cleanText.length + 100),
      startIndex: directIndex,
      endIndex: directIndex + cleanText.length
    };
  }
  
  // Search in plain text content
  const plainText = removeHtmlTags(storageFormat);
  const plainIndex = plainText.indexOf(cleanText);
  if (plainIndex !== -1) {
    return {
      found: true,
      context: plainText.substring(Math.max(0, plainIndex - 100), plainIndex + cleanText.length + 100),
      startIndex: -1, // Can't determine exact position in HTML
      endIndex: -1
    };
  }
  
  return {
    found: false,
    context: '',
    startIndex: -1,
    endIndex: -1
  };
}
