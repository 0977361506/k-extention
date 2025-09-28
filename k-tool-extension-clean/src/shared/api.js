// API utilities for K-Tool Extension
import { API_URLS } from "./constants.js";

export class ApiClient {
  /**
   * Make HTTP request with error handling
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  static async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("API request failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate document from BA content
   * @param {Object} payload - Generation payload
   * @returns {Promise<Object>} Job response
   */
  static async generateDocument(payload) {
    return await this.request(API_URLS.GEN_DOC, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Check generation status
   * @param {string} jobId - Job ID to check
   * @returns {Promise<Object>} Status response
   */
  static async checkStatus(jobId) {
    return await this.request(`${API_URLS.GEN_DOC_STATUS}?job_id=${jobId}`);
  }

  /**
   * Get generation result
   * @param {string} jobId - Job ID to get result
   * @returns {Promise<Object>} Result response
   */
  static async getResult(jobId) {
    return await this.request(`${API_URLS.GEN_DOC_RESULT}?job_id=${jobId}`);
  }

  /**
   * Edit text using AI
   * @param {Object} payload - Edit payload
   * @returns {Promise<Object>} Edit response
   */
  static async editText(payload) {
    return await this.request(API_URLS.EDIT_TEXT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

/**
 * Confluence API utilities
 */
export class ConfluenceApi {
  /**
   * Extract page ID from Confluence URL
   * @param {string} url - Confluence page URL
   * @returns {string|null} Page ID or null
   */
  static extractPageId(url) {
    const patterns = [/\/pages\/(\d+)/, /pageId=(\d+)/, /\/(\d+)$/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Get current space key from page
   * @returns {string|null} Space key or null
   */
  static getCurrentSpaceKey() {
    // Try to get space key from various sources
    const spaceKeyMeta = document.querySelector('meta[name="ajs-space-key"]');
    if (spaceKeyMeta) return spaceKeyMeta.content;

    const spaceKeyElement = document.querySelector("[data-space-key]");
    if (spaceKeyElement) return spaceKeyElement.dataset.spaceKey;

    // Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/spaces\/([^\/]+)/);
    if (urlMatch) return urlMatch[1];

    return null;
  }

  /**
   * Fetch page content from Confluence
   * @param {string} pageId - Page ID to fetch
   * @returns {Promise<Object>} Page content with title, content (view), and storageFormat
   */
  static async fetchPageContent(pageId) {
    try {
      console.log("🔍 Fetching Confluence content for pageId:", pageId);

      const apiUrl = `/rest/api/content/${pageId}?expand=body.storage,body.view`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📄 Content data received:", {
        id: data.id,
        title: data.title,
        hasStorage: !!data.body?.storage?.value,
        hasView: !!data.body?.view?.value,
      });

      return {
        title: data.title,
        content: data.body?.view?.value || "",
        storageFormat: data.body?.storage?.value || "",
      };
    } catch (error) {
      console.error("❌ Error fetching Confluence content:", error);
      throw error;
    }
  }

  /**
   * Clone template from URL for document generation
   * @param {string} url - Template URL
   * @returns {Promise<Object>} Cloned template data
   */
  static async cloneTemplateForGeneration(url) {
    try {
      console.log("🔍 Cloning template from URL:", url);

      if (!url || !url.trim()) {
        console.error("❌ Empty URL provided");
        throw new Error("URL template không được để trống");
      }

      // Extract pageId from URL
      const pageId = this.extractPageIdFromUrl(url);
      if (!pageId) {
        console.error("❌ No pageId found in URL");
        throw new Error(
          "URL không chứa pageId hợp lệ. Vui lòng kiểm tra lại URL template."
        );
      }

      console.log("📋 Fetching template pageId:", pageId);
      const apiUrl = `/rest/api/content/${pageId}?expand=body.storage`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📄 Template data received:", {
        id: data.id,
        title: data.title,
        hasStorage: !!data.body?.storage?.value,
      });

      if (!data.body?.storage?.value) {
        console.error("❌ No storage content found in response");
        throw new Error("Template không có nội dung storage format");
      }

      const originalStorageFormat = data.body.storage.value;
      console.log(
        "📄 Original storage format length:",
        originalStorageFormat.length
      );

      const { templateStructure, analysisInfo } = this.extractTemplateStructure(
        originalStorageFormat
      );

      const result = {
        title: data.title,
        originalStorageFormat,
        templateStructure,
        analysisInfo,
      };

      console.log("✅ Template cloned successfully:", {
        title: result.title,
        originalLength: originalStorageFormat.length,
        structureLength: templateStructure.length,
        analysis: analysisInfo,
      });

      return result;
    } catch (error) {
      console.error("❌ Error cloning template:", error);
      throw error;
    }
  }

  /**
   * Extract template structure and analyze placeholders
   * @param {string} storageFormat - Original storage format
   * @returns {Object} Template structure and analysis info
   */
  static extractTemplateStructure(storageFormat) {
    let emptyParagraphs = 0;
    let emptyTableCells = 0;
    let placeholders = 0;

    console.log("🔍 Extracting template structure...");

    const placeholderPatterns = [
      /(<<.*?>>)/g,
      /(\{\{.*?\}\})/g,
      /(&lt;&lt;.*?&gt;&gt;)/g,
      /(\u003c\u003c.*?\u003e\u003e)/g,
    ];

    let structure = storageFormat;

    placeholderPatterns.forEach((regex, index) => {
      const matches = [...structure.matchAll(regex)];
      console.log(
        `🎯 Placeholder pattern ${index + 1} found ${matches.length} matches`
      );
      placeholders += matches.length;
    });

    // Count empty paragraphs and table cells
    emptyParagraphs = (storageFormat.match(/<p[^>]*>\s*<\/p>/g) || []).length;
    emptyTableCells = (storageFormat.match(/<td[^>]*>\s*<\/td>/g) || []).length;

    const analysisInfo = {
      emptyParagraphs,
      emptyTableCells,
      placeholders,
      totalLength: storageFormat.length,
    };

    return {
      templateStructure: structure,
      analysisInfo,
    };
  }

  /**
   * Extract pageId from various URL formats
   * @param {string} url - URL to extract pageId from
   * @returns {string|null} Page ID or null
   */
  static extractPageIdFromUrl(url) {
    const patterns = [
      /\/pages\/(\d+)/,
      /pageId=(\d+)/,
      /\/(\d+)$/,
      /viewpage\.action\?pageId=(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extract placeholders from content (<<placeholder>> format)
   * @param {string} content - Content to analyze
   * @returns {Array} Array of placeholder strings
   */
  static extractPlaceholders(content) {
    console.log("🔍 Analyzing content for placeholders...");
    console.log("📄 Content length:", content.length);
    console.log(
      "📄 Content preview (first 500 chars):",
      content.substring(0, 500)
    );

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (str) => {
      return str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    };

    const decodedContent = decodeHtmlEntities(content);

    // Patterns to find placeholders
    const patterns = [
      /<<([^>]+)>>/g, // Normal <<placeholder>>
      /&lt;&lt;([^&]+)&gt;&gt;/g, // HTML encoded &lt;&lt;placeholder&gt;&gt;
    ];

    let allMatches = [];

    // Test patterns on both original and decoded content
    [content, decodedContent].forEach((testContent, contentIndex) => {
      console.log(
        `🔍 Testing on ${
          contentIndex === 0 ? "original" : "decoded"
        } content...`
      );

      patterns.forEach((regex, patternIndex) => {
        const matches = [...testContent.matchAll(regex)];
        console.log(
          `🎯 Pattern ${patternIndex + 1} found ${matches.length} matches:`,
          matches.map((m) => m[0])
        );

        if (patternIndex === 1) {
          // For HTML encoded, decode back to normal format
          allMatches.push(...matches.map((match) => `<<${match[1]}>>`));
        } else {
          allMatches.push(...matches.map((match) => match[0]));
        }
      });
    });

    // Remove duplicates
    const uniquePlaceholders = [...new Set(allMatches)];
    console.log("🎯 Unique placeholders found:", uniquePlaceholders);

    return uniquePlaceholders;
  }

  /**
   * Extract images from HTML content and convert to base64
   * @param {string} html - HTML content
   * @returns {Promise<Array>} Array of image objects with base64 data
   */
  static async extractImagesFromHtml(html) {
    const images = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const imgTags = doc.querySelectorAll("img");

      for (const img of Array.from(imgTags)) {
        const src = img.getAttribute("src");
        let filename = undefined;

        if (src) {
          let base64src = src;

          if (!src.startsWith("data:image")) {
            // Convert URL to base64 and get filename
            const { base64, filename: fname } = await this.urlToBase64(src);
            if (base64) {
              base64src = base64;
              filename = fname;
            } else continue; // skip if failed
          } else {
            // If already base64, get name from alt or set default
            filename = img.getAttribute("alt")
              ? img.getAttribute("alt") + ".png"
              : `image_${Date.now()}.png`;
          }

          images.push({
            src: base64src,
            alt: img.getAttribute("alt") || undefined,
            filename,
          });
        }
      }
    } catch (e) {
      console.warn("extractImagesFromHtml error:", e);
    }
    return images;
  }

  /**
   * Convert image URL to base64
   * @param {string} url - Image URL
   * @returns {Promise<Object>} Object with base64 data and filename
   */
  static async urlToBase64(url) {
    try {
      const response = await fetch(url);
      if (!response.ok)
        return { base64: null, filename: this.getFilenameFromUrl(url) };

      const blob = await response.blob();
      const filename = this.getFilenameFromUrl(url);

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ base64: reader.result, filename });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("urlToBase64 error:", e);
      return { base64: null, filename: this.getFilenameFromUrl(url) };
    }
  }

  /**
   * Get filename from URL
   * @param {string} url - URL to extract filename from
   * @returns {string} Filename
   */
  static getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return (
        pathname.substring(pathname.lastIndexOf("/") + 1) ||
        `image_${Date.now()}`
      );
    } catch {
      return `image_${Date.now()}`;
    }
  }

  /**
   * Create new Confluence page
   * @param {string} title - Page title
   * @param {string} content - Page content (storage format)
   * @param {string} spaceKey - Space key
   * @param {string} parentId - Parent page ID (optional)
   * @returns {Promise<Object>} Created page response
   */
  static async createPage(title, content, spaceKey, parentId = null) {
    try {
      const payload = {
        type: "page",
        title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: content,
            representation: "storage",
          },
        },
      };

      if (parentId) {
        payload.ancestors = [{ id: parentId }];
      }

      const response = await fetch("/rest/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create page: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating page:", error);
      throw error;
    }
  }
}
