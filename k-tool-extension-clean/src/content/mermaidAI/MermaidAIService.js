/**
 * Mermaid AI Service
 * Handles AI API calls for Mermaid diagram modifications
 */
import { ApiClient, ConfluenceApi } from "../../shared/api.js";
import { API_URLS } from "../../shared/constants.js";

export class MermaidAIService {
  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * Send prompt to AI for diagram modification
   * @param {string} diagramContent - Current Mermaid diagram code
   * @param {string} userPrompt - User's modification request
   * @returns {Promise<Object>} AI response with modified diagram
   */
  async modifyDiagram(diagramContent, userPrompt) {
    console.log("🤖 Sending AI request for diagram modification...");

    // Validate inputs
    const promptValidation = this.validateUserPrompt(userPrompt);
    if (!promptValidation.isValid) {
      throw new Error(promptValidation.error);
    }

    const diagramValidation = this.validateDiagramContent(diagramContent);
    if (!diagramValidation.isValid) {
      throw new Error(diagramValidation.error);
    }

    // Get current page content (raw HTML) from API
    const pageContent = await this.getCurrentPageContent();

    // Prepare payload for new API
    const payload = {
      diagram_code: diagramContent,
      prompt: userPrompt,
      content: pageContent,
    };

    console.log("📤 Sending AI request:", payload);

    try {
      // Call new AI API using constants
      const response = await fetch(API_URLS.EDIT_MERMAID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // API returns plain text mermaid code
      const newMermaidCode = await response.text();

      if (!newMermaidCode || !newMermaidCode.trim()) {
        throw new Error("Empty response from AI API");
      }

      console.log("✅ AI response received successfully");

      // Return in expected format for compatibility
      return {
        success: true,
        edited_diagram: newMermaidCode.trim(),
      };
    } catch (error) {
      console.error("❌ AI API error:", error);
      throw error;
    }
  }

  /**
   * Get current page content using Confluence API
   * @returns {Promise<string>} Raw HTML content of the current page
   */
  async getCurrentPageContent() {
    try {
      // Extract page ID from current URL
      const pageId = this.extractPageId();

      if (!pageId) {
        console.warn(
          "⚠️ Could not extract page ID, falling back to DOM content"
        );
        return this.getFallbackContent();
      }

      console.log("🔍 Fetching page content from API for pageId:", pageId);

      // Use existing ConfluenceApi to fetch page content
      const pageData = await ConfluenceApi.fetchPageContent(pageId);

      if (pageData && pageData.content) {
        console.log(
          "📄 Page content fetched from API:",
          pageData.content.substring(0, 100) + "..."
        );
        return pageData.content; // This is the HTML view content
      }

      // Fallback to storage format if view content not available
      if (pageData && pageData.storageFormat) {
        console.log(
          "📄 Using storage format as fallback:",
          pageData.storageFormat.substring(0, 100) + "..."
        );
        return pageData.storageFormat;
      }

      console.warn("⚠️ No content found from API, falling back to DOM");
      return this.getFallbackContent();
    } catch (error) {
      console.error("❌ Error fetching page content from API:", error);
      console.log("🔄 Falling back to DOM content extraction");
      return this.getFallbackContent();
    }
  }

  /**
   * Extract page ID from current URL
   * @returns {string|null} Page ID or null if not found
   */
  extractPageId() {
    try {
      // Method 1: From URL params like /pages/viewpage.action?pageId=1933328
      const urlParams = new URLSearchParams(window.location.search);
      const pageId = urlParams.get("pageId");
      if (pageId) {
        return pageId;
      }

      // Method 2: From URL path patterns
      const pathMatches = [
        window.location.pathname.match(/\/pages\/(\d+)/),
        window.location.pathname.match(/\/display\/[^\/]+\/(\d+)/),
        window.location.href.match(/pageId=(\d+)/),
        window.location.href.match(/\/(\d+)(?:[?#]|$)/),
      ];

      for (const match of pathMatches) {
        if (match && match[1]) {
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
          return metaTag.content;
        }
      }

      // Method 4: From AJS context if available
      if (window.AJS && window.AJS.params && window.AJS.params.pageId) {
        return window.AJS.params.pageId;
      }

      return null;
    } catch (error) {
      console.error("❌ Error extracting page ID:", error);
      return null;
    }
  }

  /**
   * Fallback method to get content from DOM
   * @returns {string} HTML content from DOM
   */
  getFallbackContent() {
    try {
      const contentSelectors = [
        "#main-content .wiki-content",
        ".wiki-content",
        "#content .page-content",
        ".page-content",
        "#main-content",
        ".main-content",
      ];

      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const content = element.innerHTML;
          if (content && content.trim().length > 0) {
            console.log(
              `📄 Found fallback content from selector "${selector}"`
            );
            return content;
          }
        }
      }

      // Last resort: body content
      return document.body.innerHTML;
    } catch (error) {
      console.error("❌ Error getting fallback content:", error);
      return "";
    }
  }

  /**
   * Call AI API
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} AI response
   */
  async callAI(payload) {
    try {
      const response = await fetch("/api/ai/mermaid-edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📥 AI API response:", data);

      return data;
    } catch (error) {
      console.error("❌ AI API call failed:", error);

      // Return mock response for development/testing
      if (error.message.includes("fetch")) {
        console.log("🔧 Using mock AI response for development");
        return this.getMockResponse(payload);
      }

      throw error;
    }
  }

  /**
   * Get mock AI response for development
   * @param {Object} payload - Original request payload
   * @returns {Object} Mock response
   */
  getMockResponse(payload) {
    // Simple mock: add a comment to the diagram
    const originalDiagram = payload.diagram_content;
    const modifiedDiagram = `%% Modified by AI: ${payload.user_prompt}\n${originalDiagram}`;

    return {
      success: true,
      edited_diagram: modifiedDiagram,
      explanation: `I've added a comment to your diagram based on your request: "${payload.user_prompt}"`,
    };
  }

  /**
   * Validate user prompt
   * @param {string} prompt - User prompt to validate
   * @returns {Object} Validation result
   */
  validateUserPrompt(prompt) {
    if (!prompt || !prompt.trim()) {
      return {
        isValid: false,
        error:
          "Please enter a prompt describing how you want to modify the diagram",
      };
    }

    if (prompt.trim().length < 3) {
      return {
        isValid: false,
        error: "Prompt is too short. Please provide more details.",
      };
    }

    if (prompt.length > 1000) {
      return {
        isValid: false,
        error: "Prompt is too long. Please keep it under 1000 characters.",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Validate diagram content
   * @param {string} content - Diagram content to validate
   * @returns {Object} Validation result
   */
  validateDiagramContent(content) {
    if (!content || !content.trim()) {
      return {
        isValid: false,
        error:
          "No diagram content found. Please select a Mermaid diagram first.",
      };
    }

    // Basic Mermaid syntax validation
    const trimmed = content.trim();
    const validStarters = [
      "graph",
      "flowchart",
      "sequenceDiagram",
      "classDiagram",
      "stateDiagram",
      "erDiagram",
      "journey",
      "gantt",
      "pie",
    ];

    const hasValidStarter = validStarters.some((starter) =>
      trimmed.toLowerCase().startsWith(starter.toLowerCase())
    );

    if (!hasValidStarter) {
      return {
        isValid: false,
        error:
          "Invalid Mermaid diagram format. Please ensure it starts with a valid diagram type.",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes("fetch")) {
      return "Unable to connect to AI service. Please check your internet connection.";
    }

    if (error.message.includes("HTTP 429")) {
      return "Too many requests. Please wait a moment and try again.";
    }

    if (error.message.includes("HTTP 500")) {
      return "AI service is temporarily unavailable. Please try again later.";
    }

    return error.message || "An unexpected error occurred. Please try again.";
  }
}
