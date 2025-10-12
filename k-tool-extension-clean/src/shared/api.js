// API utilities for K-Tool Extension
import { API_URLS } from "./constants.js";
import {
  getDiagramConfluenceStyles,
  processAndSaveDiagrams,
} from "./diagramUtils.js";

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

  /**
   * Convert HTML to XHTML using BeautifulSoup
   * @param {string} htmlContent - HTML content to convert
   * @returns {Promise<Object>} Conversion response with XHTML content
   */
  static async convertHtmlToXhtml(htmlContent) {
    console.log("🔄 Converting HTML to XHTML...");
    console.log("📄 HTML content length:", htmlContent?.length || 0);
    console.log("🔗 API URL:", API_URLS.CONVERT_HTML_TO_XHTML);

    try {
      const result = await this.request(API_URLS.CONVERT_HTML_TO_XHTML, {
        method: "POST",
        body: JSON.stringify({
          content: htmlContent,
        }),
      });

      console.log("✅ HTML to XHTML conversion result:", result);
      return result;
    } catch (error) {
      console.error("❌ HTML to XHTML conversion error:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Return error in expected format
      return {
        success: false,
        error: error.message,
      };
    }
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
   * Validate and clean page title to prevent font/encoding issues
   */
  static validateAndCleanTitle(title) {
    return (
      title
        // Remove control characters and invalid XML characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Fix common encoding issues
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/â€¦/g, "...")
        // Clean up whitespace
        .replace(/\s+/g, " ")
        .trim() ||
      // Ensure title is not empty and has reasonable length
      `Generated Document - ${new Date().toLocaleDateString()}`
    );
  }

  /**
   * Ensure UTF-8 encoding for content
   */
  static ensureUtf8Encoding(content) {
    try {
      // Try to encode and decode to ensure proper UTF-8
      const encoder = new TextEncoder();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const encoded = encoder.encode(content);
      return decoder.decode(encoded);
    } catch (error) {
      console.warn("UTF-8 encoding issue, using original content:", error);
      return content;
    }
  }

  /**
   * Basic content cleanup - EXACT copy from extension/src/api/api.ts
   */
  static basicContentCleanup(content) {
    return (
      content
        // Remove code block prefixes
        .replace(/^```\w*\s*/g, "")
        .replace(/```\s*$/g, "")
        .trim()

        // Enhanced character cleanup for Vietnamese and UTF-8
        .replace(/^\uFEFF/, "") // Remove BOM
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters

        // Fix common encoding issues
        .replace(/â€™/g, "'") // Smart apostrophe
        .replace(/â€œ/g, '"') // Smart quote open
        .replace(/â€/g, '"') // Smart quote close
        .replace(/â€¦/g, "...") // Ellipsis
        .replace(/â€"/g, "–") // En dash
        .replace(/â€"/g, "—") // Em dash

        // Clean up line breaks and whitespace
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive line breaks
        .replace(/[ \t]+$/gm, "") // Remove trailing whitespace from lines
        .replace(/^[ \t]+/gm, "") // Remove leading whitespace from lines (but preserve structure)
        .trim()
    );
  }

  /**
   * Advanced HTML sanitization - EXACT copy from extension/src/api/api.ts
   */
  static advancedHTMLSanitization(content) {
    console.log("🔬 Starting advanced HTML sanitization...");

    // Step 1: Preprocess content to fix obvious issues
    let processedContent = content
      // Fix unclosed self-closing tags first
      .replace(
        /<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)([^>]*?)(?<!\/)\s*>/gi,
        "<$1$2/>"
      )
      // Ensure proper quotes around attributes
      .replace(/(\w+)=([^"\s>]+)(\s|>)/g, '$1="$2"$3')
      // Fix common encoding issues before processing
      .replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;")
      // Remove any null bytes or control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Fix common Vietnamese encoding issues
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"');

    // Step 2: Basic structure validation and cleanup
    let finalHTML = processedContent
      // Remove empty tags that could cause issues (but keep non-breaking spaces)
      .replace(/<(\w+)([^>]*?)>\s*<\/\1>/g, (match, tagName) => {
        // Keep paragraph and cell tags with nbsp
        if (["p", "td", "th", "li"].includes(tagName.toLowerCase())) {
          return `<${tagName}>&nbsp;</${tagName}>`;
        }
        return ""; // Remove other empty tags
      })
      .replace(/>\s+</g, "><") // Remove spaces between tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    console.log("✅ Advanced HTML sanitization complete");
    console.log(
      `📊 Original length: ${content.length}, Final length: ${finalHTML.length}`
    );

    return finalHTML;
  }

  /**
   * Convert all macros to mermaid-cloud macros - EXACT copy from extension/src/api/api.ts
   */
  static convertToMermaidCloudMacros(content) {
    console.log("🔄 Converting all macros to mermaid-cloud macros...");
    let macroCounter = 1;
    let macroId = 111;

    // Replace all structured macros (mermaid, code, etc.) with mermaid-cloud macros
    const convertedContent = content.replace(
      /<ac:structured-macro[^>]*>[\s\S]*?<\/ac:structured-macro>/g,
      (match) => {
        const filename = `k-tool-diagram-${macroCounter}`;
        const currentId = macroId.toString();
        macroCounter++;
        macroId++;

        console.log(
          `🔧 Converting macro ${
            macroCounter - 1
          } to mermaid-cloud: ${filename}`
        );

        return `<ac:structured-macro ac:name="mermaid-cloud" ac:schema-version="1" ac:macro-id="${currentId}">
<ac:parameter ac:name="toolbar">bottom</ac:parameter>
<ac:parameter ac:name="filename">${filename}</ac:parameter>
<ac:parameter ac:name="format">svg</ac:parameter>
<ac:parameter ac:name="zoom">fit</ac:parameter>
<ac:parameter ac:name="revision">1</ac:parameter>
</ac:structured-macro>`;
      }
    );

    console.log(`✅ Converted ${macroCounter - 1} macros to mermaid-cloud`);
    return convertedContent;
  }

  /**
   * Validate and fix XML content specifically for Confluence storage format
   */
  static validateAndFixXML(content) {
    let fixed = content;

    console.log("🔍 Validating and fixing XML content...");

    // Fix the specific issue mentioned in error: spaces in tag names
    fixed = fixed
      // Remove spaces at the beginning of tag names
      .replace(/<\s+([a-zA-Z])/g, "<$1")
      // Remove spaces at the end of tag names (before attributes or closing >)
      .replace(/([a-zA-Z])\s+([^>]*>)/g, "$1 $2")
      // Fix spaces in closing tags
      .replace(/<\/\s+([a-zA-Z][^>]*?)>/g, "</$1>")
      // Fix malformed attributes with spaces
      .replace(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g, '$1="$2"')
      // Remove multiple consecutive spaces in content
      .replace(/\s{2,}/g, " ")
      // Fix line breaks that might cause parsing issues
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    // Validate specific Confluence storage format requirements
    fixed = fixed
      // Ensure proper ac: namespace usage
      .replace(/<ac:([^>]+)>/g, (match, content) => {
        return `<ac:${content.trim()}>`;
      })
      // Fix structured macro formatting
      .replace(/<ac:structured-macro\s+([^>]+)>/g, (match, attrs) => {
        const cleanAttrs = attrs.trim().replace(/\s+/g, " ");
        return `<ac:structured-macro ${cleanAttrs}>`;
      })
      // Ensure CDATA sections are properly formatted
      .replace(/<!\[CDATA\[\s*([\s\S]*?)\s*\]\]>/g, "<![CDATA[$1]]>");

    console.log("✅ XML validation and fixing complete");
    return fixed;
  }

  /**
   * Create new Confluence page - EXACT copy logic from createPageFromGeneratedContent
   * @param {string} title - Page title
   * @param {string} fullStorageFormat - Page content (storage format)
   * @param {string} spaceKey - Space key
   * @param {string} parentPageId - Parent page ID (optional)
   * @returns {Promise<void>} No return value, same as createPageFromGeneratedContent
   */
  static async createPage(
    title,
    fullStorageFormat,
    spaceKey,
    parentPageId = null
  ) {
    try {
      console.log("🔄 Creating page from generated content...");

      // Step 0: Validate and clean title
      const cleanTitle = this.validateAndCleanTitle(title);
      console.log("📋 Original title:", title);
      console.log("📋 Clean title:", cleanTitle);
      console.log("📋 Space:", spaceKey);
      console.log("📋 Content length:", fullStorageFormat.length);

      // Step 0.5: Ensure UTF-8 encoding
      const utf8Content = this.ensureUtf8Encoding(fullStorageFormat);
      console.log("🔤 UTF-8 validation complete");

      // Show content preview for debugging
      console.log("📄 Content preview (first 200 chars):");
      console.log(utf8Content.substring(0, 200));

      // Step 1: Enhanced content cleanup with Vietnamese support
      console.log("🧹 Starting enhanced content cleanup...");
      let processedContent = this.basicContentCleanup(utf8Content);

      // Step 2: Advanced HTML sanitization and validation
      console.log("🔬 Performing advanced HTML sanitization...");
      processedContent = this.advancedHTMLSanitization(processedContent);

      // Step 3: Convert all macros to mermaid-cloud macros
      console.log("🔄 Converting macros to mermaid-cloud...");
      processedContent = this.convertToMermaidCloudMacros(processedContent);

      const finalContent = processedContent;
      console.log("✅ Content processing complete");
      console.log("📄 Final content length:", finalContent.length);
      console.log("📄 Final content preview (first 200 chars):");
      console.log(finalContent.substring(0, 200));

      // Create the page payload with clean title
      const createPayload = {
        type: "page",
        title: cleanTitle.trim() + "-" + Date.now(), // Use clean title with timestamp
        space: { key: spaceKey },
        body: {
          storage: {
            value: finalContent,
            representation: "storage",
          },
        },
      };

      // Add parent page if specified
      if (parentPageId) {
        createPayload.ancestors = [{ id: parentPageId }];
        console.log("📁 Setting parent page ID:", parentPageId);
      }

      console.log("📤 Sending page creation request...");
      const response = await fetch("/rest/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        body: JSON.stringify(createPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Page creation failed:", errorText);

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }

          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            const detailedErrors = errorJson.errors
              .map(
                (err) =>
                  `${err.field || "Unknown field"}: ${err.message || err}`
              )
              .join("\n");
            errorMessage += `\n\nDetailed errors:\n${detailedErrors}`;
          }
        } catch (parseError) {
          console.warn("Could not parse error response as JSON");
          errorMessage += `\n\nRaw error: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Page created successfully!");
      console.log("📄 Page ID:", result.id);
      console.log("🔗 Page URL:", result._links?.webui);

      let finalMessage = `✅ Tạo tài liệu thành công!\n\nTiêu đề: ${result.title}\nPage ID: ${result.id}`;
      const extractedDiagrams = getDiagramConfluenceStyles(fullStorageFormat);
      console.log(
        `📊 Extracted ${extractedDiagrams.length} diagrams from content`
      );
      // Process and save diagrams after page creation
      if (extractedDiagrams.length > 0) {
        console.log("🎨 Processing extracted diagrams...");
        const diagramResult = await processAndSaveDiagrams(
          result.id,
          extractedDiagrams
        );

        // Add diagram processing result to message
        if (diagramResult.total > 0) {
          finalMessage += `\n\n📊 Diagrams: ${diagramResult.success}/${diagramResult.total} saved successfully`;

          if (diagramResult.errors.length > 0) {
            finalMessage += `\n⚠️ Diagram errors:\n${diagramResult.errors.join(
              "\n"
            )}`;
          }
        }
      }

      // Show final result after everything is complete
      if (typeof window !== "undefined" && window["KToolNotificationUtils"]) {
        window["KToolNotificationUtils"].success(
          "Trang đã được tạo thành công!",
          finalMessage.replace(/^✅\s*/, "")
        );
      }

      if (result._links?.webui) {
        const fullUrl = `${window.location.origin}${result._links.webui}`;
        window.open(fullUrl, "_blank");
      }
    } catch (error) {
      console.error("❌ Error creating page:", error);

      let userMessage = "Lỗi khi tạo trang Confluence.";

      if (error instanceof Error) {
        if (error.message.includes("validation failed")) {
          userMessage = `❌ Nội dung không hợp lệ:\n\n${error.message}`;
        } else if (error.message.includes("HTTP 400")) {
          userMessage =
            "❌ Dữ liệu không hợp lệ. Vui lòng kiểm tra lại nội dung.";
        } else if (error.message.includes("HTTP 401")) {
          userMessage = "❌ Không có quyền truy cập. Vui lòng đăng nhập lại.";
        } else if (error.message.includes("HTTP 403")) {
          userMessage = "❌ Không có quyền tạo trang trong space này.";
        } else {
          userMessage = `❌ ${error.message}`;
        }
      }

      if (typeof window !== "undefined" && window["KToolNotificationUtils"]) {
        window["KToolNotificationUtils"].error(
          "Lỗi tạo trang",
          userMessage.replace(/^❌\s*/, "")
        );
      }
      throw error;
    }
  }
}
