// Confluence Content Editor with Rich Text Editing
// Handles editing interface when Confluence content is returned from API

import { API_URLS } from "../shared/constants.js";
import { ContentSynchronizer } from "./utils/contentSynchronizer.js";
import { DOMHelpers } from "./utils/domHelpers.js";
import { HTMLTemplates } from "./utils/htmlTemplates.js";
import { MermaidRenderer } from "./utils/mermaidRenderer.js";
import { StorageManager } from "./utils/storageManager.js";
import { XMLFormatter } from "./utils/xmlFormatter.js";
// TipTapEditor is loaded from global scope via tiptap.js

class ConfluenceEditor {
  constructor() {
    this.isEditorOpen = false;
    this.currentContent = null;
    this.originalContent = null;
    this.onSave = null;
    this.mermaidDiagrams = [];
    this.currentSelectedDiagram = null;
    this.currentSelectedDiagramId = null;
    this.editorContainer = null;
    this.textEditor = null; // CodeMirror instance
    this.richTextEditor = null; // Rich Text Editor instance

    this.tipTapEditor = null; // TipTap Rich Text Editor instance
    this.previewContainer = null;
    this.isPreviewMode = false;
    this.autoSaveTimer = null;
    this.isModified = false;

    // Zoom controls
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };

    // ✅ Anti-flicker properties
    this.isZooming = false;
    this.zoomStep = 0.25;
    this.minZoom = 0.25;
    this.maxZoom = 3.0;

    // ✅ Debouncing for preview updates
    this.previewUpdateTimeout = null;
    this.isUpdatingPreview = false; // Prevent concurrent updates

    // Initialize utility classes
    this.storageManager = new StorageManager();
    this.contentSynchronizer = new ContentSynchronizer();
  }

  openEditor(content, options = {}) {
    if (this.isEditorOpen) {
      this.closeEditor();
    }

    console.log("📝 Opening Confluence Editor with content:", content);

    // � Check if draft exists first (priority over backup)
    const draft = this.storageManager.loadFromDraft();
    if (draft && options.allowBackupRestore !== false) {
      this.currentContent = draft;
      console.log("📝 Using existing draft as source of truth");
      console.log(
        "📝 Draft content length:",
        draft.full_storage_format?.length || 0
      );
    } else {
      // No draft - use localStorage backup as source of truth (if available)
      const backup = this.storageManager.loadFromLocalStorage();
      if (backup && options.allowBackupRestore !== false) {
        this.currentContent = backup;
        console.log("💾 Using localStorage backup as source of truth");
        console.log(
          "💾 Backup content length:",
          backup.full_storage_format?.length || 0
        );
      } else {
        // No backup found - use provided content and save it as backup
        this.currentContent = content;
        console.log(
          "💾 No backup found, using provided content and saving as backup"
        );

        // Save provided content as initial backup
        if (content) {
          this.storageManager.saveToLocalStorage(content);
          console.log("� Initial content saved to localStorage backup");
        }
      }
    }

    this.originalContent = JSON.parse(JSON.stringify(content)); // Deep copy of original
    this.isEditorOpen = true;

    // 📝 Create draft from backup content for editing (if not already exists)
    if (!this.storageManager.hasDraft()) {
      console.log("📝 Creating draft for editing...");
      const draftContent = this.storageManager.createDraftFromBackup();
      if (draftContent) {
        console.log(
          "✅ Draft created successfully - all edits will be saved to draft"
        );
      } else {
        console.warn(
          "⚠️ Failed to create draft - using backup content directly"
        );
      }
    } else {
      console.log("📝 Draft already exists - using existing draft for editing");
    }

    // 📝 Create Mermaid diagram mappings draft (if not already exists)
    if (!this.storageManager.hasMermaidDiagramMappingsDraft()) {
      console.log("📝 Creating Mermaid diagram mappings draft...");
      const draftMappings =
        this.storageManager.createMermaidDiagramMappingsDraft();
      if (draftMappings) {
        console.log("✅ Mermaid diagram mappings draft created successfully");
      } else {
        console.warn("⚠️ Failed to create Mermaid diagram mappings draft");
      }
    } else {
      console.log("📝 Mermaid diagram mappings draft already exists");
    }

    // Extract Mermaid diagrams from content
    this.extractMermaidDiagrams();

    // Create editor UI
    this.createEditorUI(options);

    // Initialize Rich Text tab (default)
    this.initializeRichTextTab();
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
    const richTextTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#rich-text-tab"
    );
    const mermaidTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-tab"
    );

    DOMHelpers.addEventListener(richTextTab, "click", () =>
      this.switchTab("rich-text")
    );
    DOMHelpers.addEventListener(mermaidTab, "click", () =>
      this.switchTab("mermaid")
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

    DOMHelpers.addEventListener(mermaidCodeEditor, "input", () => {
      this.debouncedUpdateMermaidPreview();
    });

    DOMHelpers.addEventListener(aiSendBtn, "click", () => this.sendAIPrompt());

    DOMHelpers.addEventListener(aiPromptInput, "keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendAIPrompt();
      }
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
    if (tabName === "rich-text") {
      this.initializeRichTextTab();
      this.initializeMermaidTab();
    } else if (tabName === "mermaid") {
      this.initializeMermaidTab();
    }

    console.log(`Switched to ${tabName} tab`);
  }

  // Get current content from TipTap Rich Text editor
  getCurrentEditorContent() {
    console.log("🔍 Getting current editor content from TipTap...");

    // Only use TipTap Rich Text editor
    if (this.tipTapEditor && this.tipTapEditor.isReady()) {
      const content = this.tipTapEditor.getHTML() || "";
      console.log("🎨 Got content from TipTap editor:", {
        length: content.length,
        preview: content.substring(0, 200),
        hasContent: content.length > 0,
      });
      return content;
    }

    console.warn("⚠️ TipTap editor not ready or not found");
    return "";
  }

  // Initialize Rich Text tab
  async initializeRichTextTab() {
    console.log("🎨 Initializing Rich Text tab...");
    console.log("🎨 Current content:", this.currentContent);

    const richTextEditorContainer = DOMHelpers.querySelector(
      this.editorContainer,
      "#tiptap-editor-container"
    );
    if (!richTextEditorContainer) {
      console.warn("⚠️ Rich Text editor container not found");
      return;
    }

    console.log("🎨 Rich Text container found:", richTextEditorContainer);
    console.log(
      "🎨 Container innerHTML before:",
      richTextEditorContainer.innerHTML
    );

    // Show TipTap container, hide raw editor for Rich Text tab
    richTextEditorContainer.style.display = "block";
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    if (rawEditor) {
      rawEditor.classList.add("hidden");
    }
    console.log(
      "✅ TipTap container shown, raw editor hidden for Rich Text tab"
    );

    try {
      // Check if TipTapEditor is available in global scope
      if (!window.TipTapEditor) {
        throw new Error(
          "TipTapEditor not found in global scope. Make sure tiptap.js is loaded."
        );
      }

      // Only initialize TipTap editor if it doesn't exist or isn't ready
      if (!this.tipTapEditor || !this.tipTapEditor.isReady()) {
        console.log("🎨 Initializing TipTap Rich Text Editor...");
        this.tipTapEditor = new window.TipTapEditor(richTextEditorContainer, {
          placeholder: "Start writing your rich content...",
        });

        // Wait for editor to be ready
        await this.waitForTipTapEditor();

        console.log("✅ TipTap editor created and ready");
        console.log(
          "🎨 Container innerHTML after editor creation:",
          richTextEditorContainer.innerHTML
        );
      } else {
        console.log(
          "🔍 TipTap editor already exists and is ready, reusing existing instance"
        );
        console.log(
          "🎨 Container innerHTML (existing):",
          richTextEditorContainer.innerHTML
        );
      }

      // � ALWAYS load content from draft first (if exists), then backup
      console.log("� Loading content from draft or backup...");
      let contentToLoad = this.storageManager.loadFromDraft();
      let contentSource = "draft";

      if (!contentToLoad) {
        contentToLoad = this.storageManager.loadFromLocalStorage();
        contentSource = "backup";
      }

      if (contentToLoad) {
        console.log(
          `� Found ${contentSource} content, loading into Rich Text editor`
        );
        let content =
          contentToLoad.full_storage_format || contentToLoad.content || "";
        content = XMLFormatter.cleanXMLMarkers(content);

        // Process Mermaid diagrams immediately after cleaning
        content = await this.processMermaidInContentSync(content);

        // Always set content from draft/backup (force reload even if editor exists)
        console.log("🔄 Force reloading content into TipTap editor...");
        await this.tipTapEditor.setHTML(content);
        console.log(`✅ Rich Text content loaded from ${contentSource}`);

        // Update currentContent to match loaded content
        this.currentContent = contentToLoad;
      } else {
        console.log(
          "🔍 Editor already has content, preserving existing content:",
          currentEditorContent.substring(0, 100)
        );
      }

      // Setup Rich Text event listeners
      this.setupRichTextEventListeners();

      console.log("✅ Rich Text tab initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Rich Text tab:", error);
      this.createFallbackRichTextEditor(richTextEditorContainer);
    }
  }

  // Wait for TipTap Editor to be ready
  async waitForTipTapEditor() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (!this.tipTapEditor.isReady() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!this.tipTapEditor.isReady()) {
      throw new Error("TipTap Editor failed to initialize within timeout");
    }
  }

  // Create fallback rich text editor
  createFallbackRichTextEditor(container) {
    console.log("🔄 Creating fallback rich text editor...");

    container.innerHTML = `
      <div class="rich-text-fallback">
        <div class="fallback-notice">
          ⚠️ TipTap editor failed to load. Using fallback editor.
        </div>
        <textarea
          class="rich-text-editor-fallback"
          id="rich-text-editor-fallback"
          placeholder="Enter your rich content here... (HTML supported)"
        ></textarea>
      </div>
    `;

    const textarea = container.querySelector("#rich-text-editor-fallback");

    // Set initial content
    if (this.currentContent) {
      let content =
        this.currentContent.full_storage_format ||
        this.currentContent.content ||
        "";
      content = XMLFormatter.cleanXMLMarkers(content);

      textarea.value = content;
    }

    // Setup fallback event listeners
    this.setupRichTextFallbackEventListeners(textarea);
  }

  // Setup Rich Text event listeners
  setupRichTextEventListeners() {
    if (this.tipTapEditor && this.tipTapEditor.isReady()) {
      console.log("🔗 Setting up Rich Text event listeners...");

      // Listen for content changes
      const container = this.tipTapEditor.container;
      container.addEventListener("tipTapTextChange", () => {
        console.log("📝 Rich Text content changed");
        this.isModified = true;
        this.storageManager.startAutoSave(() => this.saveToLocalStorage());
      });

      // No sync/clear buttons - removed per user request

      console.log("✅ Rich Text event listeners setup complete");
    } else {
      console.warn(
        "⚠️ Cannot setup Rich Text event listeners - editor not ready"
      );
    }
  }

  // Setup Rich Text fallback event listeners
  setupRichTextFallbackEventListeners(textarea) {
    textarea.addEventListener("input", () => {
      this.isModified = true;
      this.storageManager.startAutoSave(() => this.saveToLocalStorage());
    });
  }

  // Initialize mermaid tab
  initializeMermaidTab() {
    console.log("🔍 Initializing mermaid tab...");

    // Sync content from active editor first before extracting diagrams
    console.log("📊 Syncing content from active editor before extraction...");
    const currentEditorContent = this.getCurrentEditorContent();
    if (this.currentContent && currentEditorContent) {
      console.log("📊 Updating currentContent with latest editor content:", {
        oldLength: this.currentContent.full_storage_format?.length || 0,
        newLength: currentEditorContent.length,
        contentChanged:
          this.currentContent.full_storage_format !== currentEditorContent,
      });

      // Update currentContent and save to draft
      this.currentContent.full_storage_format = currentEditorContent;

      // Save to draft to preserve changes
      console.log("📝 Saving updated content to draft...");
      this.storageManager.saveToDraft(this.currentContent);
    }

    // Always extract diagrams to ensure sync with current content
    console.log("📊 Extracting diagrams from current content...");
    this.extractMermaidDiagrams();

    console.log("Diagrams available:", this.mermaidDiagrams.length);

    // Populate selector directly from localStorage
    this.populateMermaidSelector();
  }

  // Check if content is a Mermaid diagram
  isMermaidDiagram(content) {
    const mermaidKeywords = [
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
    ];

    const firstLine = content.split("\n")[0].trim().toLowerCase();
    return mermaidKeywords.some((keyword) => firstLine.includes(keyword));
  }

  // Debounce utility function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Update content preview
  updateContentPreview() {
    const preview = DOMHelpers.querySelector(
      this.editorContainer,
      "#content-preview"
    );

    if (!preview) return;

    // Get content from the currently active editor
    const content = this.getCurrentEditorContent();

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

          // Validate parent node before replacing
          if (!element.parentNode) {
            console.error(
              "❌ Cannot replace Mermaid element in preview: no parent node"
            );
            console.error(
              "❌ Mermaid code:",
              mermaidCode.substring(0, 100) + "..."
            );
            return;
          }

          // Replace the original element
          try {
            element.parentNode.replaceChild(mermaidDiv, element);
          } catch (replaceError) {
            console.error(
              "❌ Failed to replace Mermaid element in preview:",
              replaceError
            );
            console.error(
              "❌ Mermaid code:",
              mermaidCode.substring(0, 100) + "..."
            );
            return;
          }

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

    // Clear ALL existing options completely
    selector.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "📊 Select diagram to edit...";
    selector.appendChild(defaultOption);

    // Get diagrams from draft first, then main MERMAID_DIAGRAM_MAPPINGS
    const mermaidMappings =
      this.storageManager.getMermaidDiagramMappingsWithDraft();
    console.log(
      `📊 Found ${
        mermaidMappings?.size || 0
      } diagrams in Mermaid diagram mappings (draft or main)`
    );

    // Only add diagrams that actually exist
    if (mermaidMappings && mermaidMappings.size > 0) {
      let addedCount = 0;

      mermaidMappings.forEach((diagramData, diagramId) => {
        // Only add if has valid content
        if (diagramData.content && diagramData.content.trim()) {
          const option = document.createElement("option");
          option.value = diagramId;
          option.textContent = `${diagramData.title} (${diagramData.type})`;
          selector.appendChild(option);
          addedCount++;
          console.log(
            `📊 Added option ${addedCount}: ${diagramData.title} (${diagramData.type})`
          );
        }
      });

      console.log(
        `✅ Added ${addedCount} diagrams to selector (total options: ${selector.options.length})`
      );
    } else {
      console.warn("⚠️ No Mermaid diagrams found in MERMAID_DIAGRAM_MAPPINGS");
    }

    // Remove existing event listener to prevent duplicates
    if (this.handleMermaidSelectorChange) {
      selector.removeEventListener("change", this.handleMermaidSelectorChange);
    }

    // Add fresh event listener
    this.handleMermaidSelectorChange = (e) => {
      const selectedId = e.target.value;
      console.log(`🎯 Selected diagram: ${selectedId}`);
      this.selectMermaidDiagram(selectedId);
    };
    selector.addEventListener("change", this.handleMermaidSelectorChange);

    console.log(
      `✅ Populated ${mermaidMappings?.size || 0} diagrams in selector`
    );
  }

  // Select mermaid diagram
  selectMermaidDiagram(diagramId) {
    console.log(`🎯 selectMermaidDiagram called with ID: ${diagramId}`);

    if (!diagramId) {
      console.log("🔄 No diagram ID provided, clearing editor");
      this.clearMermaidEditor();
      return;
    }

    // Get diagram from draft first, then main MERMAID_DIAGRAM_MAPPINGS
    console.log(
      `📊 Loading diagram ${diagramId} from Mermaid diagram mappings...`
    );
    const mermaidMappings =
      this.storageManager.getMermaidDiagramMappingsWithDraft();
    const diagramData = mermaidMappings?.get(diagramId);

    if (!diagramData) {
      console.error(
        `❌ Diagram not found in Mermaid diagram mappings: ${diagramId}`
      );
      return;
    }

    console.log(`📊 Found diagram ${diagramId} in Mermaid diagram mappings`);

    // Create diagram object for editing
    const diagram = {
      id: diagramId,
      title: diagramData.title,
      type: diagramData.type,
      code: diagramData.content,
      originCode: diagramData.originCode, // Use the stored originCode (match[0])
    };

    // Update code editor
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    if (codeEditor) {
      codeEditor.value = diagramData.content;
      this.currentSelectedDiagram = diagram;
      this.currentSelectedDiagramId = diagramId;

      console.log(`✅ Diagram selected successfully:`, {
        diagramId: this.currentSelectedDiagramId,
        diagramTitle: diagram?.title,
        diagramType: diagram?.type,
        hasContent: !!diagramData.content,
        contentLength: diagramData.content?.length || 0,
      });

      this.updateMermaidPreview().catch((error) => {
        console.error("❌ Error updating Mermaid preview:", error);
      });

      // Add event listener for code changes
      codeEditor.removeEventListener("input", this.handleMermaidCodeChange);
      this.handleMermaidCodeChange = () => {
        if (this.currentSelectedDiagram && this.currentSelectedDiagramId) {
          const newCode = codeEditor.value;
          console.log("new code", newCode);

          // Update diagram code in memory
          this.currentSelectedDiagram.code = newCode;

          // Update in draft MERMAID_DIAGRAM_MAPPINGS
          const mermaidMappings =
            this.storageManager.getMermaidDiagramMappingsWithDraft();
          const currentDiagramData = mermaidMappings.get(
            this.currentSelectedDiagramId
          );

          if (currentDiagramData) {
            // Update existing diagram with new code AND new originCode
            currentDiagramData.content = newCode;
            // Generate new originCode from updated content for Confluence page creation
            currentDiagramData.originCode = `<ac:structured-macro ac:name="mermaid" ac:schema-version="1">
  <ac:parameter ac:name="code">
${newCode}
  </ac:parameter>
</ac:structured-macro>`;
            mermaidMappings.set(
              this.currentSelectedDiagramId,
              currentDiagramData
            );
            console.log(
              `📝 Updated diagram ${this.currentSelectedDiagramId} in draft mappings with new originCode`
            );
          } else {
            // Add new diagram to draft mappings
            mermaidMappings.set(this.currentSelectedDiagramId, {
              title: this.currentSelectedDiagram.title,
              type: this.currentSelectedDiagram.type,
              content: newCode,
              originCode: this.currentSelectedDiagram.originCode,
            });
            console.log(
              `📝 Added new diagram ${this.currentSelectedDiagramId} to draft mappings`
            );
          }

          // Save back to draft localStorage
          this.storageManager.saveMermaidDiagramMappingsToDraft(
            mermaidMappings
          );

          // Note: MERMAID_DIAGRAM_MAPPINGS should only be created when generating document
          // Individual diagram edits should not affect the original mappings
          // The mappings are used for replacing images back to original code when creating pages

          // Track the change for synchronization
          this.contentSynchronizer.trackDiagramChange(
            this.currentSelectedDiagramId,
            newCode
          );

          // Update preview with debouncing
          this.debouncedUpdateMermaidPreview();

          // Mark as modified
          this.isModified = true;
          this.updateSaveButtonState();

          // Sync with draft content
          console.log("🔄 DEBUG: About to sync diagram with draft content...");
          this.syncDiagramWithDraftContent(
            this.currentSelectedDiagramId,
            newCode
          );

          console.log(
            `📝 Updated diagram ${this.currentSelectedDiagramId} in draft mappings and synced with draft content`
          );
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

  // ✅ Simple debounced update - no anti-flicker interference
  debouncedUpdateMermaidPreview() {
    // Only skip if actively zooming (not if just updated recently)
    if (this.isZooming) {
      return;
    }

    // Clear existing timeout
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
    }

    // Set new timeout
    this.previewUpdateTimeout = setTimeout(() => {
      if (!this.isZooming && !this.isUpdatingPreview) {
        this.updateMermaidPreview().catch((error) => {
          console.error("❌ Error updating Mermaid preview:", error);
        });
      }
    }, 300); // Increased debounce for stability
  }

  // Update mermaid preview
  async updateMermaidPreview() {
    // ✅ Skip update if currently zooming to prevent flicker
    if (this.isZooming) {
      return;
    }

    // ✅ Skip if already updating to prevent concurrent updates
    if (this.isUpdatingPreview) {
      return;
    }

    // ✅ Set updating flag
    this.isUpdatingPreview = true;

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

    // ✅ Store current zoom level
    const currentZoom = this.currentZoom;

    // Update current diagram
    if (this.currentSelectedDiagram) {
      this.currentSelectedDiagram.code = code;
    }

    // Render mermaid using MermaidRenderer to avoid SVG error appending
    try {
      // Clear preview first
      preview.innerHTML =
        '<div class="mermaid-placeholder">Rendering diagram...</div>';

      // Create unique diagram ID
      const diagramId = `mermaid-editor-preview-${Date.now()}`;

      // Use MermaidRenderer to safely render the diagram
      await MermaidRenderer.renderDiagram(diagramId, code, preview);

      // ✅ Reapply zoom after rendering to maintain zoom level
      setTimeout(() => {
        if (currentZoom !== 1) {
          this.currentZoom = currentZoom;
        }
        this.updateZoom();
      }, 100);
    } catch (error) {
      console.error("❌ Error rendering Mermaid in editor preview:", error);
      preview.innerHTML = `
        <div class="mermaid-placeholder" style="color: #dc3545;">
          ❌ Error rendering diagram:<br>
          <small>${error.message}</small>
        </div>
      `;
    } finally {
      // ✅ Always reset updating flag
      this.isUpdatingPreview = false;
    }
  }

  // Send AI prompt - EXACT copy from extension logic
  async sendAIPrompt() {
    const promptInput = this.editorContainer.querySelector("#ai-prompt-input");
    const messagesContainer =
      this.editorContainer.querySelector("#ai-chat-messages");

    if (!promptInput || !messagesContainer) return;

    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // Check if a diagram is selected and validate it
    const mermaidSelector = this.editorContainer.querySelector(
      "#mermaid-diagram-selector"
    );
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    const selectedDiagramId = mermaidSelector?.value;
    const currentCode = codeEditor?.value?.trim();

    const mermaidMappings = this.storageManager.getMermaidDiagramMappings();

    console.log("🔍 AI Prompt Debug:", {
      hasCurrentSelectedDiagram: !!this.currentSelectedDiagram,
      currentSelectedDiagramId: this.currentSelectedDiagramId,
      selectedDiagramIdFromUI: selectedDiagramId,
      hasCodeInEditor: !!currentCode,
      codeLength: currentCode?.length || 0,
      mermaidMappingsSize: mermaidMappings?.size || 0,
    });

    // Try to get diagram from UI if currentSelectedDiagram is not set
    if (
      (!this.currentSelectedDiagram || !this.currentSelectedDiagramId) &&
      selectedDiagramId &&
      currentCode
    ) {
      console.log("🔄 Attempting to recover diagram selection from UI...");

      // Try to find diagram in MERMAID_DIAGRAM_MAPPINGS
      console.log("🔄 Checking MERMAID_DIAGRAM_MAPPINGS for diagram...");
      const diagramData = mermaidMappings?.get(selectedDiagramId);

      if (diagramData) {
        console.log("✅ Found diagram data, recovering selection...");
        this.currentSelectedDiagramId = selectedDiagramId;
        this.currentSelectedDiagram = {
          id: selectedDiagramId,
          title: diagramData.title,
          type: diagramData.type,
          code: currentCode,
          originCode: diagramData.originCode,
        };
      } else if (selectedDiagramId && currentCode) {
        // Last resort: create temporary diagram from UI state
        console.log("🔄 Creating temporary diagram from UI state...");
        this.currentSelectedDiagramId = selectedDiagramId;
        this.currentSelectedDiagram = {
          id: selectedDiagramId,
          title: `Diagram ${selectedDiagramId}`,
          type: "unknown",
          code: currentCode,
          originCode: currentCode,
        };
      }
    }

    if (!this.currentSelectedDiagram || !this.currentSelectedDiagramId) {
      console.warn("❌ No diagram selected for AI editing");
      this.addAIMessage(
        "ai",
        "⚠️ Please select a Mermaid diagram first to edit it."
      );
      return;
    }

    // Double-check the selected diagram exists in MERMAID_DIAGRAM_MAPPINGS
    const diagramInMappings = mermaidMappings?.get(
      this.currentSelectedDiagramId
    );
    if (!diagramInMappings) {
      this.addAIMessage(
        "ai",
        "❌ Selected diagram not found. Please select a valid diagram."
      );
      return;
    }

    // Add user message
    this.addAIMessage("user", prompt);

    // Clear input and show loading
    promptInput.value = "";
    this.addAIMessage("ai", "🤖 Processing your request...");

    try {
      // Get current settings for AI model
      const settings = await StorageManager.getSettings();

      // Prepare request payload similar to extension
      const requestBody = {
        content: this.currentContent?.full_storage_format || "",
        diagram_code: this.currentSelectedDiagram.code,
        user_request: prompt,
        selectedModel: settings.selectedModel || "sonar-pro",
      };

      console.log("🤖 Sending AI request:", requestBody);

      // Call AI API (same endpoint as extension)
      const response = await fetch(API_URLS.EDIT_DIAGRAM, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.edited_diagram) {
        // Clean and validate the AI response
        const cleanedDiagram = this.cleanAIResponse(data.edited_diagram);

        if (cleanedDiagram && cleanedDiagram.trim()) {
          // Validate we're still editing the same diagram
          const mermaidMappings =
            this.storageManager.getMermaidDiagramMappingsWithDraft();
          const currentDiagramInMappings = mermaidMappings.get(
            this.currentSelectedDiagramId
          );
          if (!currentDiagramInMappings) {
            throw new Error("Selected diagram no longer exists");
          }

          console.log(`🔄 Updating diagram ${this.currentSelectedDiagramId}:`, {
            oldCode: this.currentSelectedDiagram.code?.substring(0, 30) + "...",
            newCode: cleanedDiagram.substring(0, 30) + "...",
          });

          // Update ONLY the selected diagram with new code AND new originCode
          this.currentSelectedDiagram.code = cleanedDiagram;
          currentDiagramInMappings.content = cleanedDiagram;
          // Generate new originCode from AI-updated content for Confluence page creation
          currentDiagramInMappings.originCode = `<ac:structured-macro ac:name="mermaid" ac:schema-version="1">
  <ac:parameter ac:name="code">
${cleanedDiagram}
  </ac:parameter>
</ac:structured-macro>`;

          // Save back to draft MERMAID_DIAGRAM_MAPPINGS
          mermaidMappings.set(
            this.currentSelectedDiagramId,
            currentDiagramInMappings
          );
          this.storageManager.saveMermaidDiagramMappingsToDraft(
            mermaidMappings
          );
          console.log(
            `✅ AI updated diagram saved to draft mappings with new originCode`
          );

          // Update the code editor to reflect the change
          const codeEditor = this.editorContainer.querySelector(
            "#mermaid-code-editor"
          );
          if (codeEditor) {
            codeEditor.value = cleanedDiagram;
            console.log("✅ Code editor updated with AI response");
          }

          // Update preview for this specific diagram
          this.updateMermaidPreview().catch((error) => {
            console.error("❌ Error updating Mermaid preview:", error);
          });

          // Sync updated diagram with draft content
          await this.syncDiagramWithDraftContent(
            this.currentSelectedDiagramId,
            cleanedDiagram
          );

          // Mark content as modified for synchronization
          console.log(
            `🔄 Diagram ${this.currentSelectedDiagramId} updated by AI and synced with backup content`
          );

          // Remove loading message and add success message
          this.removeLastAIMessage();
          this.addAIMessage("ai", `✅ Updated diagram: ${prompt}`);

          // Show success notification
          if (
            typeof window !== "undefined" &&
            window["KToolNotificationUtils"]
          ) {
            window["KToolNotificationUtils"].success(
              "AI Assistant",
              "Diagram updated successfully!"
            );
          }
        } else {
          throw new Error("Invalid Mermaid syntax in AI response");
        }
      } else {
        throw new Error("Invalid response format or missing edited_diagram");
      }
    } catch (error) {
      console.error("❌ AI API Error:", error);

      // Remove loading message and add error message
      this.removeLastAIMessage();
      this.addAIMessage(
        "ai",
        `❌ Error: ${error.message}\n\n🔄 Please try again or adjust your request.`
      );

      // Show error notification
      if (typeof window !== "undefined" && window["KToolNotificationUtils"]) {
        window["KToolNotificationUtils"].error(
          "AI Assistant",
          `Error: ${error.message}`
        );
      }
    }
  }

  // Clean AI response - enhanced validation
  cleanAIResponse(response) {
    if (!response) return "";

    console.log("🧹 Cleaning AI response:", response.substring(0, 100) + "...");

    // Remove markdown code blocks and common AI response patterns
    let cleaned = response
      .replace(/```mermaid\n?/gi, "")
      .replace(/```\n?/g, "")
      .replace(/^Here's the updated.*?:\s*/i, "")
      .replace(/^Updated diagram.*?:\s*/i, "")
      .replace(/^The modified.*?:\s*/i, "");

    // Remove extra whitespace and newlines at start/end
    cleaned = cleaned.trim();

    // Split by lines and remove empty lines at start/end
    const lines = cleaned.split("\n");
    const nonEmptyStart = lines.findIndex((line) => line.trim() !== "");
    const nonEmptyEnd = lines
      .slice()
      .reverse()
      .findIndex((line) => line.trim() !== "");

    if (nonEmptyStart !== -1 && nonEmptyEnd !== -1) {
      cleaned = lines
        .slice(nonEmptyStart, lines.length - nonEmptyEnd)
        .join("\n");
    }

    // Basic validation - should start with a mermaid diagram type
    const validStarts = [
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
    ];

    const firstLine = cleaned.split("\n")[0].trim().toLowerCase();
    const hasValidStart = validStarts.some((start) =>
      firstLine.startsWith(start.toLowerCase())
    );

    if (!hasValidStart) {
      console.warn(
        "⚠️ AI response may not be valid Mermaid syntax:",
        firstLine
      );
      console.warn("Expected to start with one of:", validStarts.join(", "));
    }

    console.log("✅ Cleaned AI response:", cleaned.substring(0, 100) + "...");
    return cleaned;
  }

  // Remove last AI message (for loading states)
  removeLastAIMessage() {
    const messagesContainer =
      this.editorContainer.querySelector("#ai-chat-messages");
    if (!messagesContainer) return;

    const messages = messagesContainer.querySelectorAll(".ai-message");
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.querySelector(".ai-text").textContent.includes("Processing")
      ) {
        lastMessage.remove();
      }
    }
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

  // Sync updated diagram with draft content (for real-time editing)
  async syncDiagramWithDraftContent(diagramId, newCode) {
    try {
      console.log(`🔄 Syncing diagram ${diagramId} with draft content...`);

      // Get diagram data from draft MERMAID_DIAGRAM_MAPPINGS
      const mermaidMappings =
        this.storageManager.getMermaidDiagramMappingsWithDraft();
      const diagramData = mermaidMappings.get(diagramId);

      if (!diagramData) {
        console.error(`❌ Diagram ${diagramId} not found in draft mappings`);
        return;
      }

      // Generate new base64 image from updated code
      console.log(`🖼️ Generating new image for diagram ${diagramId}...`);
      const imageBase64 = await this.generateMermaidImage(newCode);

      if (!imageBase64) {
        console.error(`❌ Failed to generate image for diagram ${diagramId}`);
        return;
      }

      // Get current draft content (or backup if no draft)
      let currentContent = this.storageManager.loadFromDraft();
      if (!currentContent) {
        console.log("📝 No draft found, using backup content");
        currentContent = this.storageManager.loadFromLocalStorage();
      }

      if (!currentContent || !currentContent.full_storage_format) {
        console.error(`❌ No content found to sync with`);
        return;
      }

      // Replace old image with new image in content
      let updatedContent = currentContent.full_storage_format;

      // Find and replace the image using diagram ID (simple approach)
      const oldImageRegex = new RegExp(`<img[^>]*id="${diagramId}"[^>]*>`, "g");

      const newImageTag = `<img id="${diagramId}" src="${imageBase64}" alt="Mermaid Diagram" style="max-width: 100%; height: auto;" data-mermaid-id="${diagramId}" />`;

      console.log(
        `🎨 Generated new image HTML for diagram ${diagramId}:`,
        newImageTag
      );

      updatedContent = updatedContent.replace(oldImageRegex, newImageTag);

      console.log(
        `✅ Replaced image for diagram ${diagramId} in draft content`
      );

      // Update content and save to draft
      currentContent.full_storage_format = updatedContent;
      this.storageManager.saveToDraft(currentContent);

      // Also update currentContent if it exists
      if (this.currentContent) {
        this.currentContent.full_storage_format = updatedContent;
      }

      console.log(
        `✅ Successfully synced diagram ${diagramId} with draft content`
      );

      // Refresh Rich Text tab if it's currently active
      this.refreshRichTextTabIfActive();
    } catch (error) {
      console.error(
        `❌ Error syncing diagram ${diagramId} with draft content:`,
        error
      );
    }
  }

  // Refresh Rich Text tab if it's currently active
  async refreshRichTextTabIfActive() {
    try {
      // Check if Rich Text tab is currently active
      const richTextTab = this.editorContainer.querySelector("#rich-text-tab");
      const richTextContent = this.editorContainer.querySelector(
        "#rich-text-tab-content"
      );

      if (
        richTextTab &&
        richTextContent &&
        richTextTab.classList.contains("active") &&
        richTextContent.classList.contains("active")
      ) {
        console.log(
          "🔄 Refreshing Rich Text tab with updated draft content..."
        );

        // Load latest draft content
        const draftContent = this.storageManager.loadFromDraft();
        if (draftContent && this.tipTapEditor && this.tipTapEditor.isReady()) {
          let content =
            draftContent.full_storage_format || draftContent.content || "";
          content = XMLFormatter.cleanXMLMarkers(content);

          // Process Mermaid diagrams
          content = await this.processMermaidInContentSync(content);

          // Update TipTap editor content
          await this.tipTapEditor.setHTML(content);

          console.log("✅ Rich Text tab refreshed with updated content");
        }
      }
    } catch (error) {
      console.error("❌ Error refreshing Rich Text tab:", error);
    }
  }

  // Sync updated diagram with confluence_content_backup
  async syncDiagramWithBackupContent(diagramId, newCode) {
    try {
      console.log(`🔄 Syncing diagram ${diagramId} with backup content...`);

      // Get diagram data from MERMAID_DIAGRAM_MAPPINGS
      const mermaidMappings = this.storageManager.getMermaidDiagramMappings();
      const diagramData = mermaidMappings.get(diagramId);

      if (!diagramData) {
        console.error(`❌ Diagram ${diagramId} not found in mappings`);
        return;
      }

      // Generate new base64 image from updated code
      console.log(`🖼️ Generating new image for diagram ${diagramId}...`);
      const imageBase64 = await this.generateMermaidImage(newCode);

      if (!imageBase64) {
        console.error(`❌ Failed to generate image for diagram ${diagramId}`);
        return;
      }

      // Get current draft content (or backup if no draft)
      let currentContent = this.storageManager.loadFromDraft();
      if (!currentContent) {
        console.log("📝 No draft found, using backup content");
        currentContent = this.storageManager.loadFromLocalStorage();
      }

      if (!currentContent || !currentContent.full_storage_format) {
        console.error(`❌ No content found to sync with`);
        return;
      }

      // Replace old image with new image in content
      let updatedContent = currentContent.full_storage_format;

      // Find and replace the image using diagram ID (simple approach)
      const oldImageRegex = new RegExp(`<img[^>]*id="${diagramId}"[^>]*>`, "g");

      const newImageTag = `<img id="${diagramId}" src="${imageBase64}" alt="Mermaid Diagram" style="max-width: 100%; height: auto;" data-mermaid-id="${diagramId}" />`;

      console.log(
        `🎨 Generated new image HTML for diagram ${diagramId}:`,
        newImageTag
      );

      updatedContent = updatedContent.replace(oldImageRegex, newImageTag);

      console.log(`✅ Replaced image for diagram ${diagramId} in content`);

      // Update content and save to draft
      currentContent.full_storage_format = updatedContent;
      this.storageManager.saveToDraft(currentContent);

      // Also update currentContent if it exists
      if (this.currentContent) {
        this.currentContent.full_storage_format = updatedContent;
      }

      console.log(
        `✅ Successfully synced diagram ${diagramId} with draft content`
      );
    } catch (error) {
      console.error(
        `❌ Error syncing diagram ${diagramId} with backup content:`,
        error
      );
    }
  }

  extractMermaidDiagrams() {
    console.log("🔍 Extracting Mermaid diagrams...");

    if (!this.currentContent?.full_storage_format) {
      console.warn("⚠️ No content to extract diagrams from:", {
        hasCurrentContent: !!this.currentContent,
        hasFullStorageFormat: !!this.currentContent?.full_storage_format,
        contentLength: this.currentContent?.full_storage_format?.length || 0,
      });
      this.mermaidDiagrams = [];
      return;
    }

    console.log("📊 Extracting from content:", {
      contentLength: this.currentContent.full_storage_format.length,
      contentPreview: this.currentContent.full_storage_format.substring(0, 300),
      hasMermaidKeyword:
        this.currentContent.full_storage_format.includes("mermaid"),
    });

    const { diagrams, diagramsMap } = MermaidRenderer.extractMermaidDiagrams(
      this.currentContent.full_storage_format
    );

    console.log("📊 Extraction results:", {
      diagramsCount: diagrams.length,
      diagramsMapSize: diagramsMap.size,
      diagramTitles: diagrams.map((d) => d.title),
    });

    this.mermaidDiagrams = diagrams;

    // Merge with existing MERMAID_DIAGRAM_MAPPINGS instead of overwriting
    const existingMappings = this.storageManager.getMermaidDiagramMappings();

    // Only add new diagrams, don't overwrite existing ones (preserve edits)
    diagramsMap.forEach((diagramData, diagramId) => {
      if (!existingMappings.has(diagramId)) {
        console.log(`📊 Adding new diagram to mappings: ${diagramData.title}`);
        existingMappings.set(diagramId, diagramData);
      } else {
        console.log(`📊 Preserving existing diagram: ${diagramData.title}`);
      }
    });

    // Save merged mappings back
    this.storageManager.saveMermaidDiagramMappings(existingMappings);
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

  // Save current content to draft (for auto-save)
  saveToLocalStorage() {
    console.log("💾 Auto-saving to draft...");

    try {
      // Get current content from active editor
      const currentEditorContent = this.getCurrentEditorContent();

      if (currentEditorContent) {
        // Load existing draft or backup content
        let draftContent = this.storageManager.loadFromDraft();
        if (!draftContent) {
          draftContent =
            this.storageManager.loadFromLocalStorage() ||
            this.currentContent ||
            {};
        }

        // Update draft with latest editor content
        draftContent.full_storage_format = currentEditorContent;
        draftContent.content = currentEditorContent;

        // Save to draft
        this.storageManager.saveToDraft(draftContent);

        // Update currentContent to match draft
        this.currentContent = draftContent;

        console.log("✅ Content auto-saved to draft:", {
          contentLength: currentEditorContent.length,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (error) {
      console.error("❌ Failed to auto-save to draft:", error);
    }
  }

  async saveChanges() {
    console.log("💾 Saving changes...");

    try {
      // 📝 First, ensure current editor content is saved to draft
      console.log("📝 Ensuring current editor content is saved to draft...");
      this.saveToLocalStorage(); // Save current editor state to draft

      // 📝 Then, commit draft to backup (make changes permanent)
      console.log("📝 Committing draft to backup...");
      const commitSuccess = this.storageManager.commitDraftToBackup();
      if (commitSuccess) {
        console.log("✅ Draft committed to backup successfully");

        // Load the committed backup as current content
        this.currentContent = this.storageManager.loadFromLocalStorage();
        console.log("✅ Current content updated from committed backup");
      } else {
        console.warn("⚠️ Failed to commit draft to backup");
        return; // Don't proceed if commit failed
      }

      // 📝 Commit Mermaid diagram mappings draft to main
      console.log("📝 Committing Mermaid diagram mappings draft to main...");
      const mappingsCommitSuccess =
        this.storageManager.commitMermaidDiagramMappingsDraftToMain();
      if (mappingsCommitSuccess) {
        console.log(
          "✅ Mermaid diagram mappings draft committed to main successfully"
        );
      } else {
        console.warn("⚠️ Failed to commit Mermaid diagram mappings draft");
      }

      // Sync all content sources (for Mermaid diagrams)
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
      console.log("💾 Saving content with localStorage backup enabled");
      console.log("💾 Final content being saved:", {
        length: this.currentContent.full_storage_format?.length || 0,
        preview:
          this.currentContent.full_storage_format?.substring(0, 200) || "empty",
      });

      const saveResults = await this.storageManager.saveContent(
        this.currentContent,
        this.onSave,
        {
          enableLocalStorage: true,
          enableCallback: true,
          showNotification: true,
        }
      );

      console.log("💾 Save results:", saveResults);

      // Note: MERMAID_DIAGRAM_MAPPINGS is only created when generating document
      // Save operations should not affect these mappings

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
      DOMHelpers.setContent(saveBtn, "💾 Save *");
      saveBtn.style.background = "#28a745";
      saveBtn.title = "Có thay đổi chưa lưu";
    } else {
      DOMHelpers.setContent(saveBtn, "💾 Save");
      saveBtn.style.background = "#007bff";
      saveBtn.title = "Save";
    }
  }

  // ✅ Stop all preview updates for zoom
  stopAllPreviewUpdates() {
    // Clear timeout
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
      this.previewUpdateTimeout = null;
    }

    // Set flags
    this.isZooming = true;
    this.isUpdatingPreview = false;
  }

  // Zoom controls methods
  zoomIn() {
    if (this.currentZoom < this.maxZoom) {
      this.stopAllPreviewUpdates(); // ✅ Stop updates first
      this.currentZoom = Math.min(
        this.currentZoom + this.zoomStep,
        this.maxZoom
      );
      this.applyZoom();
    }
  }

  zoomOut() {
    if (this.currentZoom > this.minZoom) {
      this.stopAllPreviewUpdates(); // ✅ Stop updates first
      this.currentZoom = Math.max(
        this.currentZoom - this.zoomStep,
        this.minZoom
      );
      this.applyZoom();
    }
  }

  resetZoom() {
    this.stopAllPreviewUpdates(); // ✅ Stop updates first
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };
    this.applyZoom();
  }

  // ✅ Apply zoom with anti-flicker
  applyZoom() {
    // Set zoom flag to prevent flicker
    this.isZooming = true;

    // Clear any pending preview updates
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
      this.previewUpdateTimeout = null;
    }

    // Apply zoom
    this.updateZoom();

    // Reset zoom flag
    setTimeout(() => {
      this.isZooming = false;
    }, 100);
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

    // Destroy TipTap Rich Text Editor
    if (this.tipTapEditor) {
      console.log("🗑️ Destroying TipTap Rich Text Editor...");
      if (this.tipTapEditor.destroy) {
        this.tipTapEditor.destroy();
      }
      this.tipTapEditor = null;
    }

    // Legacy Rich Text Editor (if exists)
    if (this.richTextEditor) {
      console.log("🗑️ Destroying Legacy Rich Text Editor...");
      this.richTextEditor.destroy();
      this.richTextEditor = null;
    }

    if (this.editorContainer) {
      DOMHelpers.removeElement(this.editorContainer);
      this.editorContainer = null;
    }

    this.isEditorOpen = false;
    // DON'T clear currentContent and originalContent - keep them for next edit session
    // this.currentContent = null;
    // this.originalContent = null;
    this.mermaidDiagrams = [];
    this.currentSelectedDiagram = null;
    this.currentSelectedDiagramId = null;
    this.isModified = false;

    console.log("🔍 Content preserved after close:", {
      hasCurrentContent: !!this.currentContent,
      hasOriginalContent: !!this.originalContent,
      currentContentLength:
        this.currentContent?.full_storage_format?.length || 0,
    });

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

  /**
   * Format and clean XHTML content (remove whitespace, normalize structure)
   */
  normalizeHtmlString(html) {
    if (!html || typeof html !== "string") {
      return html;
    }

    // 1. Loại bỏ các dòng trống đầu/cuối chuỗi
    let cleanedHtml = html.trim();

    // 2. Thay thế tất cả các khoảng trắng, tab, và dòng mới liên tiếp (ví dụ: \n\t  )
    // bên trong các thẻ HTML hoặc giữa các thẻ
    // thành MỘT khoảng trắng duy nhất.
    // [ \t\n\r]+ là regex bắt tất cả các loại khoảng trắng
    cleanedHtml = cleanedHtml.replace(/[ \t\n\r]+/g, " ");

    // 3. Xóa khoảng trắng ngay trước và sau các thẻ HTML
    // (Điều này thường loại bỏ khoảng trắng giữa các thẻ block như </div> <div>)
    cleanedHtml = cleanedHtml.replace(/> </g, "><");

    // 4. (Tùy chọn) Thêm lại các dấu xuống dòng hợp lí sau các thẻ BLOCK
    // Ví dụ: sau </div> hoặc </p> để giữ cấu trúc dễ đọc.
    // Nếu không cần cấu trúc block, bạn có thể bỏ qua bước này.
    // cleanedHtml = cleanedHtml.replace(/></g, '>\n<');

    return cleanedHtml;
  }

  /**
   * Process Mermaid diagrams in content synchronously (convert to img tags)
   */
  async processMermaidInContentSync(content) {
    try {
      console.log("🔍 Processing Mermaid diagrams in content (sync)...");

      // Use extractMermaidDiagrams to find all Mermaid content
      const { diagrams } = MermaidRenderer.extractMermaidDiagrams(content);

      if (diagrams.length === 0) {
        console.log("ℹ️ No Mermaid diagrams found in content");
        return content;
      }

      let processedContent = content;
      console.log(`🎨 Found ${diagrams.length} Mermaid diagrams to process`);

      // Prepare diagram mapping for storage
      const diagramMappings = {};

      // Process each diagram
      for (let i = 0; i < diagrams.length; i++) {
        const diagram = diagrams[i];
        console.log(
          `🎨 Processing Mermaid diagram ${i + 1}/${diagrams.length}:`,
          diagram.code.substring(0, 100)
        );

        try {
          // Generate real Mermaid diagram as base64 image
          const imageBase64 = await this.generateMermaidImage(diagram.code);

          if (imageBase64) {
            // Create image with diagram ID for later replacement
            const imageHtml = `<img id="${diagram.id}" src="${imageBase64}" alt="Mermaid Diagram" style="max-width: 100%; height: auto;" data-mermaid-id="${diagram.id}" />`;
            console.log(
              `🎨 Generated image HTML for diagram ${diagram.id}:`,
              imageHtml
            );
            processedContent = processedContent.replace(
              diagram.originalMatch,
              imageHtml
            );

            // Store diagram mapping for later use
            diagramMappings[diagram.id] = {
              originalCode: diagram.originalMatch,
              imageId: diagram.id,
              code: diagram.code,
              type: diagram.type,
            };

            console.log(
              `✅ Mermaid diagram ${i + 1} converted to real image with ID: ${
                diagram.id
              }`
            );
          } else {
            // Fallback to placeholder if generation fails
            const placeholderImg = `<img id="${diagram.id}" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1lcm1haWQgRGlhZ3JhbTwvdGV4dD48L3N2Zz4=" alt="Mermaid Diagram (Placeholder)" style="max-width: 100%; height: auto; border: 1px dashed #ccc;" data-mermaid-id="${diagram.id}" />`;
            processedContent = processedContent.replace(
              diagram.originalMatch,
              placeholderImg
            );

            // Store diagram mapping even for placeholder
            diagramMappings[diagram.id] = {
              originalCode: diagram.originalMatch,
              imageId: diagram.id,
              code: diagram.code,
              type: diagram.type,
            };

            console.log(
              `⚠️ Mermaid diagram ${i + 1} replaced with placeholder with ID: ${
                diagram.id
              }`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process Mermaid diagram ${i + 1}:`, error);
          // Keep original macro if conversion fails
        }
      }

      // Note: This method only converts diagrams to images for display
      // MERMAID_DIAGRAM_MAPPINGS should only be created when generating document

      console.log(
        `🎨 Processed ${diagrams.length} Mermaid diagrams in content`,
        processedContent
      );
      return processedContent;
    } catch (error) {
      console.error("❌ Error processing Mermaid in content:", error);
      return content; // Return original content if processing fails
    }
  }
  /**
   * Generate Mermaid diagram as base64 image
   */
  async generateMermaidImage(mermaidCode) {
    try {
      if (!window.mermaid) {
        console.warn("⚠️ Mermaid not available");
        return null;
      }

      // Create temporary container
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = "800px";
      tempContainer.style.height = "600px";
      document.body.appendChild(tempContainer);

      try {
        // Generate unique ID
        const diagramId = `mermaid-temp-${Date.now()}`;

        // Render Mermaid diagram
        const { svg } = await window.mermaid.render(diagramId, mermaidCode);

        // Convert SVG to base64
        const base64 =
          "data:image/svg+xml;base64," +
          btoa(
            encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) =>
              String.fromCharCode(parseInt(p1, 16))
            )
          );

        return base64;
      } finally {
        // Clean up temporary container
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error("❌ Failed to generate Mermaid image:", error);
      return null;
    }
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
