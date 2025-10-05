// API Client for Mermaid AI Chat
import { API_URLS } from "./constants.js";

export class ApiClient {
  /**
   * Make HTTP request to API
   * @param {string} url - API endpoint URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  static async request(url, options = {}) {
    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      console.log(`📡 Making ${config.method} request to:`, url);
      console.log("📤 Request config:", config);

      const response = await fetch(url, config);
      
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📥 Response data:", data);

      return {
        success: true,
        data: data,
        status: response.status,
      };
    } catch (error) {
      console.error("❌ API request failed:", error);
      return {
        success: false,
        error: error.message,
        status: error.status || 0,
      };
    }
  }

  /**
   * Edit Mermaid diagram using AI
   * @param {Object} payload - Edit payload
   * @returns {Promise<Object>} Edit response
   */
  static async editDiagram(payload) {
    console.log("📤 Sending diagram edit request:", payload);

    // Prepare the payload for the AI API
    const apiPayload = {
      diagram_content: payload.diagram_content,
      user_prompt: payload.user_prompt,
      context: payload.context || "mermaid_diagram_editing",
      // Add any additional context that might be helpful
      diagram_type: this.detectDiagramType(payload.diagram_content),
      timestamp: new Date().toISOString(),
    };

    return await this.request(API_URLS.EDIT_DIAGRAM, {
      method: "POST",
      body: JSON.stringify(apiPayload),
    });
  }

  /**
   * Detect the type of Mermaid diagram
   * @param {string} content - Mermaid diagram content
   * @returns {string} Diagram type
   */
  static detectDiagramType(content) {
    if (!content || typeof content !== "string") {
      return "unknown";
    }

    const trimmedContent = content.trim().toLowerCase();

    const diagramTypes = {
      graph: "flowchart",
      flowchart: "flowchart",
      sequencediagram: "sequence",
      classdiagram: "class",
      statediagram: "state",
      erdiagram: "er",
      journey: "journey",
      gantt: "gantt",
      pie: "pie",
      gitgraph: "gitgraph",
      mindmap: "mindmap",
      timeline: "timeline",
      sankey: "sankey",
    };

    for (const [keyword, type] of Object.entries(diagramTypes)) {
      if (trimmedContent.startsWith(keyword)) {
        return type;
      }
    }

    return "flowchart"; // Default to flowchart
  }

  /**
   * Validate diagram content before sending to API
   * @param {string} content - Diagram content
   * @returns {Object} Validation result
   */
  static validateDiagramContent(content) {
    if (!content || typeof content !== "string") {
      return {
        isValid: false,
        error: "Diagram content is required",
      };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        error: "Diagram content cannot be empty",
      };
    }

    if (trimmedContent.length > 10000) {
      return {
        isValid: false,
        error: "Diagram content is too long (max 10,000 characters)",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Validate user prompt before sending to API
   * @param {string} prompt - User prompt
   * @returns {Object} Validation result
   */
  static validateUserPrompt(prompt) {
    if (!prompt || typeof prompt !== "string") {
      return {
        isValid: false,
        error: "Please enter a prompt",
      };
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return {
        isValid: false,
        error: "Please enter a prompt",
      };
    }

    if (trimmedPrompt.length < 3) {
      return {
        isValid: false,
        error: "Prompt is too short (minimum 3 characters)",
      };
    }

    if (trimmedPrompt.length > 1000) {
      return {
        isValid: false,
        error: "Prompt is too long (max 1,000 characters)",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Enhanced error handling for API responses
   * @param {Object} response - API response
   * @returns {string} User-friendly error message
   */
  static getErrorMessage(response) {
    if (response.success) {
      return null;
    }

    const error = response.error || "Unknown error occurred";

    // Map common errors to user-friendly messages
    const errorMappings = {
      "HTTP 401": "🔐 Authentication required. Please check your API key.",
      "HTTP 403": "🚫 Access denied. Please check your permissions.",
      "HTTP 404": "🔍 Service not found. Please check the API endpoint.",
      "HTTP 429": "⏰ Too many requests. Please wait a moment and try again.",
      "HTTP 500": "🔧 Server error. Please try again later.",
      "Network Error":
        "🌐 Network connection error. Please check your internet connection.",
      Timeout: "⏱️ Request timeout. Please try again.",
    };

    for (const [key, message] of Object.entries(errorMappings)) {
      if (error.includes(key)) {
        return message;
      }
    }

    return `❌ ${error}`;
  }
}
