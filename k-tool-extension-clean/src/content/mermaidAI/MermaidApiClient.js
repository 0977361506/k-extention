/**
 * Mermaid API Client
 * Handles API calls to fetch Mermaid diagram code from Confluence
 */
export class MermaidApiClient {
  /**
   * Extract page ID from current URL
   * @returns {string|null} Page ID or null if not found
   */
  static extractPageId() {
    try {
      console.log("🔍 Extracting page ID from current page...");
      console.log("🔍 Current URL:", window.location.href);
      console.log("🔍 Current pathname:", window.location.pathname);
      console.log("🔍 Current search:", window.location.search);

      // Method 1: From URL params like /pages/viewpage.action?pageId=1933328
      const urlParams = new URLSearchParams(window.location.search);
      const pageId = urlParams.get("pageId");
      if (pageId) {
        console.log("📄 Page ID extracted from URL params:", pageId);
        return pageId;
      }

      // Method 2: From URL path like /pages/(\d+) or /display/SPACE/(\d+)
      const pathMatches = [
        window.location.pathname.match(/\/pages\/(\d+)/),
        window.location.pathname.match(/\/display\/[^\/]+\/(\d+)/),
        window.location.href.match(/pageId=(\d+)/),
        window.location.href.match(/\/(\d+)(?:[?#]|$)/),
      ];

      for (const match of pathMatches) {
        if (match && match[1]) {
          console.log("📄 Page ID extracted from path/URL:", match[1]);
          return match[1];
        }
      }

      // Method 3: From meta tags
      const metaSelectors = [
        'meta[name="ajs-page-id"]',
        'meta[name="confluence-page-id"]',
        'meta[property="confluence:page-id"]',
      ];

      for (const selector of metaSelectors) {
        const metaTag = document.querySelector(selector);
        if (metaTag && metaTag.content) {
          console.log(
            `📄 Page ID extracted from meta tag (${selector}):`,
            metaTag.content
          );
          return metaTag.content;
        }
      }

      // Method 4: From AJS context if available
      if (window.AJS && window.AJS.params && window.AJS.params.pageId) {
        console.log("📄 Page ID extracted from AJS:", window.AJS.params.pageId);
        return window.AJS.params.pageId;
      }

      // Method 5: From Confluence context
      if (window.Confluence && window.Confluence.getContentId) {
        const contentId = window.Confluence.getContentId();
        if (contentId) {
          console.log(
            "📄 Page ID extracted from Confluence context:",
            contentId
          );
          return contentId;
        }
      }

      // Method 6: From data attributes on body or html
      const bodyPageId =
        document.body.getAttribute("data-page-id") ||
        document.documentElement.getAttribute("data-page-id");
      if (bodyPageId) {
        console.log(
          "📄 Page ID extracted from body data attribute:",
          bodyPageId
        );
        return bodyPageId;
      }

      console.warn("⚠️ Could not extract page ID from current page");
      console.warn(
        "⚠️ Available methods tried: URL params, path patterns, meta tags, AJS context, Confluence context, data attributes"
      );
      return null;
    } catch (error) {
      console.error("❌ Error extracting page ID:", error);
      return null;
    }
  }

  /**
   * Extract filename from image src URL
   * @param {string} src - Image src URL
   * @returns {string|null} Filename without extension or null if not found
   */
  static extractFilename(src) {
    try {
      if (!src) return null;

      console.log("🔍 Extracting filename from src:", src);

      // Parse URL to get pathname
      const url = new URL(src, window.location.origin);
      const pathname = url.pathname;

      // Extract filename from path like /download/attachments/1933328/Diagram.png
      const pathParts = pathname.split("/");
      const filenameWithExt = pathParts[pathParts.length - 1];

      if (!filenameWithExt) return null;

      // Remove extension (.png, .jpg, .svg, etc.)
      const filename = filenameWithExt.split(".")[0];

      console.log("✅ Extracted filename:", filename);
      return filename;
    } catch (error) {
      console.error("❌ Error extracting filename:", error);
      return null;
    }
  }

  /**
   * Save filename to localStorage for later use
   * @param {string} filename - Filename to save
   */
  static saveFilename(filename) {
    try {
      if (!filename) return;

      localStorage.setItem("mermaid-ai-filename", filename);
      console.log("💾 Filename saved to localStorage:", filename);
    } catch (error) {
      console.error("❌ Error saving filename to localStorage:", error);
    }
  }

  /**
   * Get saved filename from localStorage
   * @returns {string|null} Saved filename or null if not found
   */
  static getSavedFilename() {
    try {
      const filename = localStorage.getItem("mermaid-ai-filename");
      console.log("📂 Retrieved filename from localStorage:", filename);
      return filename;
    } catch (error) {
      console.error("❌ Error retrieving filename from localStorage:", error);
      return null;
    }
  }

  /**
   * Fetch Mermaid diagram code from Confluence API
   * @param {string} pageId - Confluence page ID (ceoId)
   * @param {string} filename - Diagram filename
   * @returns {Promise<string>} Mermaid diagram code
   */
  static async fetchMermaidCode(pageId, filename) {
    try {
      console.log("🌐 Fetching Mermaid code from API...", { pageId, filename });

      const apiUrl = `http://localhost:8090/rest/mermaidrest/1.0/mermaid/diagram?ceoId=${pageId}&filename=${filename}`;

      console.log("📡 API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json; charset=utf-8",
          Pragma: "no-cache",
          Referer:
            "http://localhost:8090/plugins/mermaid-cloud/editMermaidDiagram.action",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": navigator.userAgent,
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json(); // Assuming API returns plain text Mermaid code

      return data;
    } catch (error) {
      console.error("❌ Error fetching Mermaid code:", error);
      throw error;
    }
  }

  /**
   * Fetch Mermaid code using saved filename and current page ID
   * @returns {Promise<string>} Mermaid diagram code
   */
  static async fetchMermaidCodeFromSaved() {
    const pageId = this.extractPageId();
    const filename = this.getSavedFilename();

    if (!pageId) {
      throw new Error("Could not extract page ID from current page");
    }

    if (!filename) {
      throw new Error(
        "No filename found in localStorage. Please click on a Mermaid diagram first."
      );
    }

    return await this.fetchMermaidCode(pageId, filename);
  }
}
