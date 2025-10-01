// Confluence Content Editor with Rich Text Editing
// Handles editing interface when Confluence content is returned from API

import { ContentSynchronizer } from "./utils/contentSynchronizer.js";
import { DOMHelpers } from "./utils/domHelpers.js";
import { HTMLTemplates } from "./utils/htmlTemplates.js";
import { MermaidRenderer } from "./utils/mermaidRenderer.js";
import { StorageManager } from "./utils/storageManager.js";
import { XMLFormatter } from "./utils/xmlFormatter.js";

class ConfluenceEditor {
  constructor() {
    this.isEditorOpen = false;
    this.currentContent = null;
    this.originalContent = null;
    this.onSave = null;
    this.mermaidDiagrams = [];
    this.mermaidDiagramsMap = new Map();
    this.currentSelectedDiagram = null;
    this.currentSelectedDiagramId = null;
    this.editorContainer = null;
    this.textEditor = null; // CodeMirror instance
    this.previewContainer = null;
    this.isPreviewMode = false;
    this.autoSaveTimer = null;
    this.isModified = false;

    // Zoom controls
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };

    // Initialize utility classes
    this.storageManager = new StorageManager();
    this.contentSynchronizer = new ContentSynchronizer();
  }

  openEditor(content, options = {}) {
    if (this.isEditorOpen) {
      this.closeEditor();
    }

    console.log("📝 Opening Confluence Editor with content:", content);

    // Auto-restore from localStorage backup if available (no confirm)
    const backup = this.storageManager.loadFromLocalStorage();
    if (backup && options.allowBackupRestore !== false) {
      const backupInfo = this.storageManager.getBackupInfo();
      const ageMinutes = Math.floor(backupInfo.age / (1000 * 60));

      // Auto-restore if backup is recent (less than 30 minutes)
      if (ageMinutes < 30) {
        this.currentContent = backup;
        console.log(
          `📦 Auto-restored content from backup (${ageMinutes} minutes old)`
        );
      } else {
        this.currentContent = content;
        this.storageManager.clearLocalStorage();
        console.log(
          `📦 Backup too old (${ageMinutes} minutes), using original content`
        );
      }
    } else {
      this.currentContent = content;
    }

    this.originalContent = JSON.parse(JSON.stringify(content)); // Deep copy of original
    this.isEditorOpen = true;

    // Extract Mermaid diagrams from content
    this.extractMermaidDiagrams();

    // Create editor UI
    this.createEditorUI(options);

    // Initialize content tab (default)
    this.initializeContentTab();
  }

  createEditorUI() {
    const overlay = DOMHelpers.createElement("div", {
      className: "confluence-editor-overlay",
    });

    DOMHelpers.setContent(overlay, HTMLTemplates.getEditorTemplate(), true);
    document.body.appendChild(overlay);
    this.editorContainer = overlay;

    // Bind events
    this.bindEditorEvents();
  }

  bindEditorEvents() {
    if (!this.editorContainer) return;

    // Close button
    const closeBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#editor-close-btn"
    );
    console.log("🔍 Close button found:", !!closeBtn);
    if (closeBtn) {
      DOMHelpers.addEventListener(closeBtn, "click", () => {
        console.log("🔄 Close button clicked");
        this.closeEditor();
      });
    } else {
      console.error("❌ Close button not found!");
    }

    // Save button
    const saveBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#editor-save-btn"
    );
    console.log("🔍 Save button found:", !!saveBtn);
    if (saveBtn) {
      DOMHelpers.addEventListener(saveBtn, "click", () => {
        console.log("💾 Save button clicked");
        this.saveChanges();
      });
    } else {
      console.error("❌ Save button not found!");
    }

    // Tab buttons
    const contentTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#content-tab"
    );
    const mermaidTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-tab"
    );

    DOMHelpers.addEventListener(contentTab, "click", () =>
      this.switchTab("content")
    );
    DOMHelpers.addEventListener(mermaidTab, "click", () =>
      this.switchTab("mermaid")
    );

    // Content tab elements
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    DOMHelpers.addEventListener(rawEditor, "input", () =>
      this.updateContentPreview()
    );

    // Mermaid tab elements
    const mermaidSelector = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-selector"
    );
    const mermaidCodeEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-code-editor"
    );
    const aiSendBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#ai-send-btn"
    );
    const aiPromptInput = DOMHelpers.querySelector(
      this.editorContainer,
      "#ai-prompt-input"
    );

    DOMHelpers.addEventListener(mermaidSelector, "change", (e) =>
      this.selectMermaidDiagram(e.target.value)
    );

    DOMHelpers.addEventListener(mermaidCodeEditor, "input", () =>
      this.updateMermaidPreview()
    );

    DOMHelpers.addEventListener(aiSendBtn, "click", () => this.sendAIPrompt());

    DOMHelpers.addEventListener(aiPromptInput, "keypress", (e) => {
      if (e.key === "Enter") this.sendAIPrompt();
    });

    // Zoom controls
    const zoomInBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#zoom-in"
    );
    const zoomOutBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#zoom-out"
    );
    const zoomResetBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#zoom-reset"
    );

    DOMHelpers.addEventListener(zoomInBtn, "click", () => this.zoomIn());
    DOMHelpers.addEventListener(zoomOutBtn, "click", () => this.zoomOut());
    DOMHelpers.addEventListener(zoomResetBtn, "click", () => this.resetZoom());

    // Add wheel zoom to mermaid preview
    const mermaidPreview = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-preview"
    );
    DOMHelpers.addEventListener(mermaidPreview, "wheel", (e) =>
      this.handleWheel(e)
    );

    // Close on overlay click
    DOMHelpers.addEventListener(this.editorContainer, "click", (e) => {
      if (e.target === this.editorContainer) {
        this.closeEditor();
      }
    });

    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        this.closeEditor();
        DOMHelpers.removeEventListener(document, "keydown", handleEsc);
      }
    };
    DOMHelpers.addEventListener(document, "keydown", handleEsc);
  }

  // Switch between tabs
  switchTab(tabName) {
    // Update tab buttons
    const tabs = DOMHelpers.querySelectorAll(
      this.editorContainer,
      ".confluence-editor-tab"
    );
    tabs.forEach((tab) => DOMHelpers.removeClass(tab, "active"));

    const activeTab = DOMHelpers.querySelector(
      this.editorContainer,
      `#${tabName}-tab`
    );
    DOMHelpers.addClass(activeTab, "active");

    // Update tab content
    const tabContents = DOMHelpers.querySelectorAll(
      this.editorContainer,
      ".tab-content"
    );
    tabContents.forEach((content) => DOMHelpers.removeClass(content, "active"));

    const activeContent = DOMHelpers.querySelector(
      this.editorContainer,
      `#${tabName}-tab-content`
    );
    DOMHelpers.addClass(activeContent, "active");

    // Initialize tab-specific content
    if (tabName === "content") {
      this.initializeContentTab();
    } else if (tabName === "mermaid") {
      this.initializeMermaidTab();
    }

    console.log(`Switched to ${tabName} tab`);
  }

  // Initialize content tab
  initializeContentTab() {
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );

    console.log("🔍 Initializing content tab...");
    console.log("Raw editor found:", !!rawEditor);
    console.log("Current content exists:", !!this.currentContent);

    if (rawEditor && this.currentContent) {
      // Get raw content and clean up ```xml markers
      let rawContent =
        this.currentContent.full_storage_format ||
        this.currentContent.content ||
        "";

      console.log("Raw content length:", rawContent.length);

      // Clean XML markers and format for better readability
      rawContent = XMLFormatter.cleanXMLMarkers(rawContent);
      rawContent = XMLFormatter.formatXHTML(rawContent);

      console.log("Formatted content length:", rawContent.length);

      // Set content using direct assignment and DOMHelpers
      rawEditor.value = rawContent;
      DOMHelpers.setContent(rawEditor, rawContent);

      console.log("✅ Content set to raw editor");
      this.updateContentPreview();
    } else {
      console.warn(
        "⚠️ Cannot initialize content tab - missing rawEditor or currentContent"
      );
    }
  }

  // Initialize mermaid tab
  initializeMermaidTab() {
    console.log("🔍 Initializing mermaid tab...");

    // Always extract diagrams to ensure sync with current content
    console.log("📊 Extracting diagrams from current content...");
    this.extractMermaidDiagrams();

    console.log("Diagrams available:", this.mermaidDiagrams.length);
    console.log("DiagramsMap size:", this.mermaidDiagramsMap.size);
    this.populateMermaidSelector();
  }

  // Update content preview
  updateContentPreview() {
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    const preview = DOMHelpers.querySelector(
      this.editorContainer,
      "#content-preview"
    );

    if (!rawEditor || !preview) return;

    const content = DOMHelpers.getContent(rawEditor);

    // Update current content
    if (this.currentContent) {
      this.currentContent.full_storage_format = content;
      // Mark as modified if content changed
      if (
        this.originalContent &&
        content !== this.originalContent.full_storage_format
      ) {
        this.isModified = true;
        this.updateSaveButtonState();
      }
    }

    // Render preview
    this.renderContentPreview(content, preview);
  }

  // Render content preview
  renderContentPreview(content, previewElement) {
    // Apply inline styles for preview
    const processedContent = HTMLTemplates.applyPreviewStyles(content);

    // Set the processed content to preview element
    DOMHelpers.setContent(previewElement, processedContent, true);

    // Render Mermaid diagrams
    this.renderMermaidDiagramsInPreview();
  }

  // Render Mermaid diagrams in preview
  renderMermaidDiagramsInPreview() {
    // Use the new comprehensive Mermaid initialization
    setTimeout(() => {
      this.initializeMermaidInPreview();
    }, 100);
  }

  // Initialize Mermaid diagrams in preview
  async initializeMermaidInPreview() {
    try {
      // Initialize Mermaid
      await MermaidRenderer.initializeMermaid();

      console.log("🎨 Initializing Mermaid diagrams in preview...");

      // Find all mermaid code blocks in the preview
      const previewDiv = DOMHelpers.querySelector(
        this.editorContainer,
        "#content-preview"
      );
      if (!previewDiv) return;

      // Look for Confluence Mermaid structured macros
      const mermaidElements = DOMHelpers.querySelectorAll(
        previewDiv,
        'ac\\:structured-macro[ac\\:name="mermaid"]'
      );

      mermaidElements.forEach(async (element, index) => {
        // Get the code parameter from Confluence structured macro
        const codeParam = DOMHelpers.querySelector(
          element,
          'ac\\:parameter[ac\\:name="code"]'
        );
        if (!codeParam) {
          console.warn("⚠️ Mermaid macro found but no code parameter");
          return;
        }

        const mermaidCode = DOMHelpers.getContent(codeParam).trim();
        console.log(
          "🔍 Found Confluence Mermaid diagram:",
          mermaidCode.substring(0, 50) + "..."
        );

        // Always process Confluence mermaid macros
        if (mermaidCode) {
          // Create a new div for the mermaid diagram
          const mermaidDiv = HTMLTemplates.createMermaidContainer(index);

          // Replace the original element
          element.parentNode.replaceChild(mermaidDiv, element);

          // Render the diagram
          const diagramId = `preview-mermaid-svg-${index}`;
          await MermaidRenderer.renderDiagram(
            diagramId,
            mermaidCode,
            mermaidDiv
          );
        }
      });
    } catch (error) {
      console.error("❌ Failed to initialize Mermaid in preview:", error);
    }
  }

  // Populate mermaid selector using Map
  populateMermaidSelector() {
    const selector = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-selector"
    );
    if (!selector) {
      console.error("❌ Mermaid selector not found");
      return;
    }

    console.log("🔄 Populating Mermaid selector...");
    console.log(`📊 DiagramsMap size: ${this.mermaidDiagramsMap?.size || 0}`);
    console.log(`📊 Current options count: ${selector.options.length}`);

    // Clear existing options
    DOMHelpers.setContent(
      selector,
      '<option value="">📊 Select diagram to edit...</option>',
      true
    );

    console.log(`📊 After clear, options count: ${selector.options.length}`);

    // Add diagram options from Map
    if (this.mermaidDiagramsMap && this.mermaidDiagramsMap.size > 0) {
      let addedCount = 0;
      this.mermaidDiagramsMap.forEach((diagramData, diagramId) => {
        const option = document.createElement("option");
        option.value = diagramId;
        option.textContent = `${diagramData.title} (${diagramData.type})`;
        selector.appendChild(option);
        addedCount++;
        console.log(
          `📊 Added option ${addedCount}: ${diagramData.title} (${diagramData.type})`
        );
      });

      console.log(
        `✅ Added ${addedCount} diagrams to selector (total options: ${selector.options.length})`
      );
    } else {
      console.warn("⚠️ No Mermaid diagrams found to populate selector");
    }

    // Add event listener for selector change
    selector.removeEventListener("change", this.handleMermaidSelectorChange);
    this.handleMermaidSelectorChange = (e) => {
      const selectedId = e.target.value;
      console.log(`🎯 Selected diagram: ${selectedId}`);
      this.selectMermaidDiagram(selectedId);
    };
    selector.addEventListener("change", this.handleMermaidSelectorChange);

    console.log(
      `✅ Populated ${this.mermaidDiagramsMap?.size || 0} diagrams in selector`
    );
  }

  // Select mermaid diagram
  selectMermaidDiagram(diagramId) {
    if (!diagramId) {
      this.clearMermaidEditor();
      return;
    }

    // Get diagram from Map
    const diagramData = this.mermaidDiagramsMap.get(diagramId);
    if (!diagramData) {
      console.error(`❌ Diagram not found in map: ${diagramId}`);
      return;
    }

    // Find full diagram record from array
    const diagram = this.mermaidDiagrams.find((d) => d.id === diagramId);
    if (!diagram) {
      console.error(`❌ Diagram not found in array: ${diagramId}`);
      return;
    }

    // Update code editor
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    if (codeEditor) {
      codeEditor.value = diagramData.content;
      this.currentSelectedDiagram = diagram;
      this.currentSelectedDiagramId = diagramId;
      this.updateMermaidPreview();

      // Add event listener for code changes
      codeEditor.removeEventListener("input", this.handleMermaidCodeChange);
      this.handleMermaidCodeChange = () => {
        if (this.currentSelectedDiagram && this.currentSelectedDiagramId) {
          const newCode = codeEditor.value;
          console.log("new code", newCode);
          // Update diagram code in memory (both array and map)
          this.currentSelectedDiagram.code = newCode;
          this.mermaidDiagramsMap.get(this.currentSelectedDiagramId).content =
            newCode;

          // Track the change for synchronization
          this.contentSynchronizer.trackDiagramChange(
            this.currentSelectedDiagramId,
            newCode
          );

          // Update preview
          this.updateMermaidPreview();

          // Mark as modified
          this.isModified = true;
          this.updateSaveButtonState();

          console.log(`📝 Updated diagram ${this.currentSelectedDiagramId}`);
        }
      };
      codeEditor.addEventListener("input", this.handleMermaidCodeChange);
    }

    console.log(`✅ Selected diagram: ${diagramId} (${diagramData.type})`);
  }

  // Clear mermaid editor
  clearMermaidEditor() {
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    const preview = this.editorContainer.querySelector("#mermaid-preview");

    if (codeEditor) codeEditor.value = "";
    if (preview) {
      preview.innerHTML =
        '<div class="mermaid-placeholder">Select a diagram to preview</div>';
    }

    this.currentSelectedDiagram = null;
  }

  // Update mermaid preview
  updateMermaidPreview() {
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    const preview = this.editorContainer.querySelector("#mermaid-preview");

    if (!codeEditor || !preview) return;

    const code = codeEditor.value.trim();
    if (!code) {
      preview.innerHTML =
        '<div class="mermaid-placeholder">Enter Mermaid code to preview</div>';
      return;
    }

    // Update current diagram
    if (this.currentSelectedDiagram) {
      this.currentSelectedDiagram.code = code;
    }

    // Render mermaid
    preview.innerHTML = `<div class="mermaid">${code}</div>`;

    // Initialize mermaid rendering
    if (window.mermaid) {
      window.mermaid.init(undefined, preview.querySelector(".mermaid"));
      // Apply current zoom after rendering
      setTimeout(() => {
        this.updateZoom();
      }, 100);
    }
  }

  // Send AI prompt
  sendAIPrompt() {
    const promptInput = this.editorContainer.querySelector("#ai-prompt-input");
    const messagesContainer =
      this.editorContainer.querySelector("#ai-chat-messages");

    if (!promptInput || !messagesContainer) return;

    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // Add user message
    this.addAIMessage("user", prompt);

    // Clear input
    promptInput.value = "";

    // TODO: Integrate with AI API
    // For now, show a placeholder response
    setTimeout(() => {
      this.addAIMessage(
        "ai",
        "AI integration coming soon! I will help you modify Mermaid diagrams based on your prompts."
      );
    }, 1000);
  }

  // Add AI message
  addAIMessage(type, text) {
    const messagesContainer = DOMHelpers.querySelector(
      this.editorContainer,
      "#ai-chat-messages"
    );
    if (!messagesContainer) return;

    const messageHTML = HTMLTemplates.createAIMessage(type, text);
    DOMHelpers.setContent(
      messagesContainer,
      DOMHelpers.getContent(messagesContainer) + messageHTML,
      true
    );
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  extractMermaidDiagrams() {
    if (!this.currentContent?.full_storage_format) {
      this.mermaidDiagrams = [];
      this.mermaidDiagramsMap = new Map();
      return;
    }

    const { diagrams, diagramsMap } = MermaidRenderer.extractMermaidDiagrams(
      this.currentContent.full_storage_format
    );

    this.mermaidDiagrams = diagrams;
    this.mermaidDiagramsMap = diagramsMap;
  }

  updateStatus(message) {
    const status = this.editorContainer?.querySelector("#editor-status");
    if (status) {
      status.textContent = message;
      setTimeout(() => {
        status.textContent = "Sẵn sàng";
      }, 3000);
    }
  }

  async saveChanges() {
    console.log("💾 Saving changes...");

    try {
      // Sync all content sources
      this.currentContent = this.contentSynchronizer.syncAllContent(
        this.currentContent,
        this.editorContainer,
        this.mermaidDiagrams
      );

      // Validate content before saving
      const validation = this.contentSynchronizer.validateContent(
        this.currentContent
      );
      if (!validation.isValid) {
        throw new Error(
          `Content validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Save using storage manager (supports both callback and localStorage)
      const saveResults = await this.storageManager.saveContent(
        this.currentContent,
        this.onSave,
        {
          enableLocalStorage: true,
          enableCallback: true,
          showNotification: true,
        }
      );

      // Reset modified state and update button
      this.isModified = false;
      this.updateSaveButtonState();

      // Update original content to new saved state
      this.originalContent = JSON.parse(JSON.stringify(this.currentContent));

      // Don't re-extract diagrams after save to avoid duplicates
      console.log("✅ Skipping diagram re-extraction to prevent duplicates");

      console.log("✅ Changes saved successfully", saveResults);

      // Save completed - auto close editor immediately
      console.log("💾 Save completed - closing editor...");
      this.closeEditor();
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      this.storageManager.showNotification(
        `❌ Lỗi khi lưu: ${error.message}`,
        "error"
      );
    }
  }

  // Update save button state based on modifications
  updateSaveButtonState() {
    const saveBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#editor-save-btn"
    );
    if (!saveBtn) return;

    if (this.isModified) {
      DOMHelpers.setContent(saveBtn, "💾 Lưu thay đổi *");
      saveBtn.style.background = "#28a745";
      saveBtn.title = "Có thay đổi chưa lưu";
    } else {
      DOMHelpers.setContent(saveBtn, "💾 Lưu thay đổi");
      saveBtn.style.background = "#007bff";
      saveBtn.title = "Lưu thay đổi";
    }
  }

  // Zoom controls methods
  zoomIn() {
    this.currentZoom = Math.min(this.currentZoom * 1.2, 3);
    this.updateZoom();
  }

  zoomOut() {
    this.currentZoom = Math.max(this.currentZoom / 1.2, 0.3);
    this.updateZoom();
  }

  resetZoom() {
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };
    this.updateZoom();
  }

  updateZoom() {
    const preview = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-preview"
    );
    const zoomLevel = DOMHelpers.querySelector(
      this.editorContainer,
      "#zoom-level"
    );

    if (preview) {
      const mermaidContent = DOMHelpers.querySelector(preview, ".mermaid, svg");
      if (mermaidContent) {
        mermaidContent.style.transform = `scale(${this.currentZoom}) translate(${this.dragOffset.x}px, ${this.dragOffset.y}px)`;
        mermaidContent.style.transformOrigin = "center center";
        mermaidContent.style.transition = "transform 0.2s ease";
      }
    }

    if (zoomLevel) {
      DOMHelpers.setContent(
        zoomLevel,
        `${Math.round(this.currentZoom * 100)}%`
      );
    }
  }

  handleWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  closeEditor() {
    console.log("🔄 Closing editor...");

    // Stop auto-save
    this.storageManager.stopAutoSave();

    if (this.editorContainer) {
      DOMHelpers.removeElement(this.editorContainer);
      this.editorContainer = null;
    }

    this.isEditorOpen = false;
    this.currentContent = null;
    this.originalContent = null;
    this.mermaidDiagrams = [];
    this.mermaidDiagramsMap = new Map();
    this.currentSelectedDiagram = null;
    this.currentSelectedDiagramId = null;
    this.isModified = false;

    // Reset zoom state
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };

    console.log("✅ Editor closed");
  }

  // Public method to set save callback
  setSaveCallback(callback) {
    this.onSave = callback;
  }

  // Check if editor is currently open
  isOpen() {
    return this.isEditorOpen;
  }

  // Get current content
  getCurrentContent() {
    if (this.textEditor) {
      // Update content from editor
      const editorContent = this.textEditor.getValue();
      if (this.currentContent) {
        this.currentContent.full_storage_format = editorContent;
      }
    }
    return this.currentContent;
  }
}

// Export for use in content.js
export { ConfluenceEditor };
