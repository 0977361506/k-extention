// HTML Templates for Confluence Editor
// Contains all HTML template strings and styling utilities

export class HTMLTemplates {
  /**
   * Get the main editor HTML template
   * @returns {string} HTML template string
   */
  static getEditorTemplate() {
    return `
      <div class="confluence-editor-container">
        <div class="confluence-editor-header">
          <h2 class="confluence-editor-title">
            📝 Edit Confluence Content
          </h2>
          <div class="confluence-editor-actions">
            <button class="editor-btn editor-btn-primary" id="editor-save-btn">
              💾 Save
            </button>
            <button class="editor-btn editor-btn-secondary" id="editor-close-btn">
              ✕ Close
            </button>
          </div>
        </div>

        <div class="confluence-editor-tabs">
          <button class="confluence-editor-tab active" id="rich-text-tab">
            🎨 Rich Text
          </button>
          <button class="confluence-editor-tab" id="mermaid-tab">
            📊 Edit Mermaid Code
          </button>
        </div>

        <div class="confluence-editor-body">
          ${this.getRichTextTabTemplate()}
          ${this.getMermaidTabTemplate()}
        </div>
      </div>
    `;
  }

  /**
   * Get rich text tab template
   * @returns {string} Rich text tab HTML
   */
  static getRichTextTabTemplate() {
    return `
      <!-- Rich Text Tab -->
      <div class="tab-content active" id="rich-text-tab-content">
        <div class="tiptap-layout-full">
          <!-- Full Width TipTap Rich Text Editor -->
          <div class="tiptap-editor-pane-full">
            <div class="tiptap-editor-header">
              <span>🎨 TipTap Rich Text Editor</span>
            </div>
            <div class="tiptap-editor-body">
              <div class="tiptap-editor-container" id="tiptap-editor-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get mermaid tab template
   * @returns {string} Mermaid tab HTML
   */
  static getMermaidTabTemplate() {
    return `
      <!-- Mermaid Tab -->
      <div class="tab-content" id="mermaid-tab-content">
        <div class="mermaid-editor-layout">
          <!-- Mermaid Code Editor (Left) -->
          <div class="mermaid-code-pane">
            <div class="mermaid-editor-header">
              📊 Mermaid Code
              <select id="mermaid-selector" class="mermaid-selector">
                <option value="">Select diagram...</option>
              </select>
            </div>
            <div class="mermaid-editor-body">
              <textarea class="mermaid-code-editor" id="mermaid-code-editor" placeholder="Select a Mermaid diagram to edit..."></textarea>
            </div>
          </div>

          <!-- Mermaid Preview (Center) -->
          <div class="mermaid-preview-pane">
            <div class="mermaid-editor-header">
              <span class="preview-title">📊 Diagram Preview</span>
              ${this.getZoomControlsTemplate()}
            </div>
            <div class="mermaid-editor-body">
              <div class="mermaid-preview" id="mermaid-preview">
                <div class="mermaid-placeholder">
                  Select a diagram to preview
                </div>
              </div>
            </div>
          </div>

          <!-- AI Chat (Right) -->
          <div class="mermaid-ai-pane">
            <div class="mermaid-editor-header">
              🤖 AI Assistant
            </div>
            <div class="mermaid-editor-body">
              ${this.getAIChatTemplate()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get zoom controls template
   * @returns {string} Zoom controls HTML
   */
  static getZoomControlsTemplate() {
    return `
      <div class="mermaid-zoom-controls">
        <button class="zoom-btn" id="zoom-out" title="Zoom Out">−</button>
        <div class="zoom-level" id="zoom-level">100%</div>
        <button class="zoom-btn" id="zoom-in" title="Zoom In">+</button>
        <button class="zoom-btn" id="zoom-reset" title="Reset Zoom">⌂</button>
      </div>
    `;
  }

  /**
   * Get AI chat template - Enhanced version similar to extension
   * @returns {string} AI chat HTML
   */
  static getAIChatTemplate() {
    return `
      <div class="ai-chat-container">
        <div class="ai-chat-header">
          <div class="ai-header-title">
            <span class="ai-icon">🤖</span>
            <span>AI Diagram Assistant</span>
          </div>
          <div class="ai-header-status">Ready</div>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-message">
            <div class="ai-avatar">🤖</div>
            <div class="ai-text">
              <strong>Hi! I'm your AI Diagram Assistant.</strong><br/><br/>
              I can help you modify Mermaid diagrams with natural language commands:<br/>
              • "Add a new node called 'Database'"<br/>
              • "Change the color of node A to blue"<br/>
              • "Add an arrow from A to B"<br/>
              • "Make this flowchart more detailed"<br/><br/>
              <em>Select a diagram above and describe what you want to change!</em>
            </div>
          </div>
        </div>
        <div class="ai-chat-input">
          <div class="ai-input-container">
            <textarea
              id="ai-prompt-input"
              placeholder="Describe how you want to modify the diagram..."
              rows="2"
            ></textarea>
            <button id="ai-send-btn" class="ai-send-btn" title="Send message (Enter)">
              <span class="send-icon">📤</span>
            </button>
          </div>
          <div class="ai-input-tips">
            💡 <strong>Tips:</strong> Be specific about changes you want. Press Enter to send.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Apply inline styles to HTML content for preview
   * @param {string} content - Raw HTML content
   * @returns {string} Styled HTML content
   */
  static applyPreviewStyles(content) {
    return content
      .replace(
        /<h1>/g,
        "<h1 style='color: #333; margin: 24px 0 16px 0; font-size: 1.8rem; border-bottom: 2px solid #e1e5e9; padding-bottom: 8px;'>"
      )
      .replace(
        /<h2>/g,
        "<h2 style='color: #555; margin: 20px 0 12px 0; font-size: 1.4rem;'>"
      )
      .replace(
        /<h3>/g,
        "<h3 style='color: #666; margin: 16px 0 8px 0; font-size: 1.2rem;'>"
      )
      .replace(
        /<p>/g,
        "<p style='margin: 12px 0; line-height: 1.6; color: #333;'>"
      )
      .replace(/<ul>/g, "<ul style='margin: 12px 0; padding-left: 24px;'>")
      .replace(/<li>/g, "<li style='margin: 4px 0; line-height: 1.5;'>")
      .replace(
        /<table>/g,
        "<table style='border-collapse: collapse; width: 100%; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'>"
      )
      .replace(
        /<th>/g,
        "<th style='border: 1px solid #ddd; padding: 12px; background: #f8f9fa; font-weight: 600; text-align: left;'>"
      )
      .replace(
        /<td>/g,
        "<td style='border: 1px solid #ddd; padding: 12px; vertical-align: top;'>"
      )
      .replace(/<strong>/g, "<strong style='color: #2c3e50;'>")
      .replace(
        /<code>/g,
        "<code style='background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;'>"
      );
  }

  /**
   * Create AI message HTML
   * @param {string} type - Message type ('user' or 'ai')
   * @param {string} text - Message text
   * @returns {string} AI message HTML
   */
  static createAIMessage(type, text) {
    const avatar = type === "user" ? "👤" : "🤖";
    const bgColor = type === "user" ? "#e5e7eb" : "#3b82f6";

    return `
      <div class="ai-message">
        <div class="ai-avatar" style="background: ${bgColor};">${avatar}</div>
        <div class="ai-text">${text}</div>
      </div>
    `;
  }

  /**
   * Create mermaid diagram container with styling
   * @param {number} index - Diagram index
   * @returns {HTMLElement} Mermaid container element
   */
  static createMermaidContainer(index) {
    const mermaidDiv = document.createElement("div");
    mermaidDiv.className = "mermaid-diagram";
    mermaidDiv.id = `preview-mermaid-${index}`;
    mermaidDiv.style.cssText =
      "margin: 20px 0; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;";
    return mermaidDiv;
  }
}
