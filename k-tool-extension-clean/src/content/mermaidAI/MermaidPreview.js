/**
 * Mermaid Preview Handler
 * Handles rendering and updating of Mermaid diagram previews
 */
import { MermaidRenderer } from "../utils/mermaidRenderer.js";

export class MermaidPreview {
  constructor() {
    this.previewContainer = null;
  }

  /**
   * Initialize preview container
   */
  initialize() {
    this.previewContainer = document.getElementById(
      "mermaid-preview-container"
    );
    if (!this.previewContainer) {
      console.error("❌ Preview container not found");
      return false;
    }
    return true;
  }

  /**
   * Update Mermaid preview from code
   * @param {string} code - Mermaid diagram code
   */
  async updatePreview(code) {
    if (!this.previewContainer) {
      console.error("❌ Preview container not initialized");
      return;
    }

    if (!code || !code.trim()) {
      this.showPlaceholder("Enter Mermaid code to preview");
      return;
    }

    try {
      // Clean and validate code
      const cleanCode = this.cleanMermaidCode(code);
      console.log("🧹 Cleaned Mermaid code:", cleanCode);

      // Validate code
      const validation = this.validateMermaidCode(cleanCode);
      if (!validation.isValid) {
        this.showError(`Invalid Mermaid syntax: ${validation.error}`);
        return;
      }

      // Initialize Mermaid if needed
      await MermaidRenderer.initializeMermaid();

      // Create unique diagram ID
      const diagramId = `mermaid-ai-chat-preview-${Date.now()}`;

      // Show loading
      this.showPlaceholder("Rendering diagram...");

      // Render diagram
      await MermaidRenderer.renderDiagram(
        diagramId,
        cleanCode,
        this.previewContainer
      );

      console.log("✅ Mermaid preview updated successfully");
    } catch (error) {
      console.error("❌ Error updating Mermaid preview:", error);
      this.showError(error.message);
    }
  }

  /**
   * Show placeholder message
   * @param {string} message - Placeholder message
   */
  showPlaceholder(message) {
    if (
      this.previewContainer &&
      this.previewContainer.nodeType === Node.ELEMENT_NODE &&
      document.contains(this.previewContainer)
    ) {
      this.previewContainer.innerHTML = `
        <div class="mermaid-preview-placeholder">
          ${message}
        </div>
      `;
    } else {
      console.error("❌ Invalid or detached preview container for placeholder");
    }
  }

  /**
   * Show error message
   * @param {string} errorMessage - Error message to display
   */
  showError(errorMessage) {
    if (
      this.previewContainer &&
      this.previewContainer.nodeType === Node.ELEMENT_NODE &&
      document.contains(this.previewContainer)
    ) {
      this.previewContainer.innerHTML = `
        <div class="mermaid-preview-placeholder" style="color: #dc3545;">
          ❌ Error rendering diagram:<br>
          <small>${errorMessage}</small>
        </div>
      `;
    } else {
      console.error(
        "❌ Invalid or detached preview container for error display"
      );
      console.error("❌ Error message:", errorMessage);
    }
  }

  /**
   * Clear preview
   */
  clear() {
    this.showPlaceholder("Click on a Mermaid diagram to start editing");
  }

  /**
   * Get current preview content
   * @returns {string} Current preview HTML content
   */
  getCurrentContent() {
    return this.previewContainer ? this.previewContainer.innerHTML : "";
  }

  /**
   * Clean Mermaid code - remove unwanted characters and normalize
   * @param {string} code - Raw Mermaid code
   * @returns {string} Cleaned code
   */
  cleanMermaidCode(code) {
    if (!code) return "";

    // Remove HTML entities
    let cleaned = code
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove CDATA sections
    cleaned = cleaned.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "");

    // Normalize whitespace
    cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Remove excessive whitespace but preserve structure
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n");

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Validate Mermaid code syntax
   * @param {string} code - Mermaid code to validate
   * @returns {Object} Validation result
   */
  validateMermaidCode(code) {
    if (!code || !code.trim()) {
      return {
        isValid: false,
        error: "Code is empty",
      };
    }

    const trimmed = code.trim();

    // Check for valid Mermaid diagram types
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
      "gitgraph",
      "mindmap",
      "timeline",
      "sankey",
      "requirement",
    ];

    const hasValidStarter = validStarters.some((starter) =>
      trimmed.toLowerCase().startsWith(starter.toLowerCase())
    );

    if (!hasValidStarter) {
      return {
        isValid: false,
        error: `Must start with a valid diagram type: ${validStarters.join(
          ", "
        )}`,
      };
    }

    // Check for common syntax issues
    if (trimmed.includes("undefined") || trimmed.includes("null")) {
      return {
        isValid: false,
        error: "Contains undefined or null values",
      };
    }

    // Check for unbalanced brackets
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return {
        isValid: false,
        error: "Unbalanced square brackets",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }
}
