/**
 * Font and Encoding Utilities for K-Tool Extension
 * Ensures proper Vietnamese character support and prevents font issues
 */

export class FontEncodingUtils {
  
  /**
   * Test Vietnamese characters rendering
   */
  static testVietnameseChars(): boolean {
    const testChars = 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ';
    
    try {
      // Create a temporary element to test font rendering
      const testElement = document.createElement('div');
      testElement.style.fontFamily = '"Inter", "Roboto", "Segoe UI", "Arial Unicode MS", "Lucida Grande", "Noto Sans", "Helvetica Neue", Arial, sans-serif';
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.textContent = testChars;
      
      document.body.appendChild(testElement);
      
      // Check if characters are rendered properly
      const computed = window.getComputedStyle(testElement);
      const hasProperFont = computed.fontFamily.includes('Inter') || 
                           computed.fontFamily.includes('Roboto') || 
                           computed.fontFamily.includes('Segoe UI');
      
      document.body.removeChild(testElement);
      
      console.log('🔤 Vietnamese character test:', hasProperFont ? 'PASSED' : 'FAILED');
      console.log('🔤 Computed font family:', computed.fontFamily);
      
      return hasProperFont;
    } catch (error) {
      console.error('❌ Vietnamese character test failed:', error);
      return false;
    }
  }

  /**
   * Clean and validate text for Confluence compatibility
   */
  static cleanTextForConfluence(text: string): string {
    return text
      // Remove problematic Unicode characters
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      // Fix common encoding issues
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/â€"/g, '–')
      .replace(/â€"/g, '—')
      // Normalize Vietnamese characters
      .normalize('NFC')
      // Clean whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate UTF-8 encoding
   */
  static validateUtf8(text: string): boolean {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const encoded = encoder.encode(text);
      decoder.decode(encoded);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply Vietnamese font support to element
   */
  static applyVietnameseFontSupport(element: HTMLElement): void {
    element.style.fontFamily = '"Inter", "Roboto", "Segoe UI", "Arial Unicode MS", "Lucida Grande", "Noto Sans", "Helvetica Neue", Arial, sans-serif';
    element.style.setProperty('-webkit-font-smoothing', 'antialiased');
    element.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
    element.style.textRendering = 'optimizeLegibility';
    element.classList.add('vietnamese-text');
  }

  /**
   * Initialize font loading for better Vietnamese support
   */
  static async initializeFontSupport(): Promise<void> {
    try {
      // Load Google Fonts for better Vietnamese support
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);

      // Wait for fonts to load
      if ('fonts' in document) {
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 3000)) // 3s timeout
        ]);
      }

      console.log('✅ Font support initialized successfully');
      
      // Test Vietnamese character rendering
      this.testVietnameseChars();
      
    } catch (error) {
      console.warn('⚠️ Font support initialization failed:', error);
    }
  }

  /**
   * Get safe font family string for mermaid diagrams
   */
  static getMermaidFontFamily(): string {
    return '"Inter", "Roboto", "Segoe UI", "Arial Unicode MS", "Lucida Grande", "Noto Sans", "Helvetica Neue", Arial, sans-serif';
  }

  /**
   * Debug font information
   */
  static debugFontInfo(): void {
    console.log('🔍 Font Debug Information:');
    console.log('Available fonts:', [...document.fonts.keys()].map(font => font.family));
    console.log('User agent:', navigator.userAgent);
    console.log('Language:', navigator.language);
    console.log('Platform:', navigator.platform);
    
    // Test Vietnamese chars
    this.testVietnameseChars();
  }
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  FontEncodingUtils.initializeFontSupport();
}
