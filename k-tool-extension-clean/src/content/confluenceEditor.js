// Confluence Content Editor with Rich Text Editing
// Handles editing interface when Confluence content is returned from API

import { API_URLS } from "../shared/constants.js";
import { ContentSynchronizer } from "./utils/contentSynchronizer.js";
import { DOMHelpers } from "./utils/domHelpers.js";
import { HTMLTemplates } from "./utils/htmlTemplates.js";
import { MermaidRenderer } from "./utils/mermaidRenderer.js";
import { StorageManager } from "./utils/storageManager.js";
import { XMLFormatter } from "./utils/xmlFormatter.js";
// import { XHTMLEditor } from "./richTextEditor/XHTMLEditor.js"; // Temporarily disabled
import { LiveTextEditor } from "./liveEdit/LiveTextEditor.js";
// TipTapEditor is loaded from global scope via tiptap.js

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
    this.richTextEditor = null; // Rich Text Editor instance
    this.liveTextEditor = null; // Live Text Editor instance
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

    // 💾 ALWAYS use localStorage backup as source of truth (if available)
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
    const liveEditTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#live-edit-tab"
    );
    const richTextTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#rich-text-tab"
    );
    const mermaidTab = DOMHelpers.querySelector(
      this.editorContainer,
      "#mermaid-tab"
    );

    DOMHelpers.addEventListener(contentTab, "click", () =>
      this.switchTab("content")
    );
    DOMHelpers.addEventListener(liveEditTab, "click", () =>
      this.switchTab("live-edit")
    );
    DOMHelpers.addEventListener(richTextTab, "click", () =>
      this.switchTab("rich-text")
    );
    DOMHelpers.addEventListener(mermaidTab, "click", () =>
      this.switchTab("mermaid")
    );

    // Content tab elements - Raw editor event listener (for fallback mode)
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    if (rawEditor) {
      DOMHelpers.addEventListener(rawEditor, "input", () => {
        // Only update preview if raw editor is visible (not hidden)
        if (!rawEditor.classList.contains("hidden")) {
          this.updateContentPreview();
          this.isModified = true;
          this.storageManager.startAutoSave(() => this.saveToLocalStorage());
        }
      });
    }

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
    if (tabName === "content") {
      this.initializeContentTab();
      this.initializeMermaidTab();
    } else if (tabName === "live-edit") {
      this.initializeLiveEditTab();
      this.initializeMermaidTab();
    } else if (tabName === "rich-text") {
      this.initializeRichTextTab();
      this.initializeMermaidTab();
    } else if (tabName === "mermaid") {
      this.initializeMermaidTab();
    }

    console.log(`Switched to ${tabName} tab`);
  }

  // Initialize content tab
  async initializeContentTab() {
    const richTextContainer = DOMHelpers.querySelector(
      this.editorContainer,
      "#tiptap-editor-container"
    );
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );

    console.log("🔍 Initializing content tab...");
    console.log("Rich text container found:", !!richTextContainer);
    console.log("Raw editor found:", !!rawEditor);

    // 💾 ALWAYS load content from localStorage backup (source of truth)
    console.log(
      "💾 Loading content from localStorage backup for Content tab..."
    );
    const backupContent = this.storageManager.loadFromLocalStorage();

    if (richTextContainer && backupContent) {
      try {
        // Update currentContent to match localStorage
        this.currentContent = backupContent;

        // Get raw content and clean up ```xml markers
        let rawContent =
          backupContent.full_storage_format || backupContent.content || "";

        console.log("Raw content length:", rawContent.length);

        // Clean XML markers and format for better readability
        rawContent = XMLFormatter.cleanXMLMarkers(rawContent);
        // rawContent = XMLFormatter.formatXHTML(rawContent);

        console.log("Formatted content length:", rawContent.length);

        // Hide TipTap container, show raw editor for content tab
        richTextContainer.style.display = "none";
        if (rawEditor) {
          rawEditor.classList.remove("hidden");
          rawEditor.value = rawContent;
          DOMHelpers.setContent(rawEditor, rawContent);
        }

        console.log("✅ Raw editor initialized successfully");
        this.updateContentPreview();
      } catch (error) {
        console.error("❌ Failed to initialize Rich Text Editor:", error);

        // Fallback to raw editor
        if (rawEditor) {
          console.log("🔄 Falling back to raw editor...");
          let rawContent =
            this.currentContent.full_storage_format ||
            this.currentContent.content ||
            "";
          rawContent = XMLFormatter.cleanXMLMarkers(rawContent);
          // rawContent = XMLFormatter.formatXHTML(rawContent);

          rawEditor.value = rawContent;
          DOMHelpers.setContent(rawEditor, rawContent);

          // Show raw editor, hide rich text container (fallback mode)
          richTextContainer.style.display = "none";
          rawEditor.classList.remove("hidden");

          this.updateContentPreview();
        }
      }
    } else {
      console.warn(
        "⚠️ Cannot initialize content tab - missing container or currentContent"
      );
    }
  }

  // Setup Rich Text Editor event listeners (temporarily disabled)
  setupRichTextEditorEvents() {
    console.log("⚠️ Rich Text Editor events disabled");
    return;
  }

  // Setup toggle between Rich Text and Raw view (temporarily disabled)
  setupToggleRawView() {
    const toggleBtn = DOMHelpers.querySelector(
      this.editorContainer,
      "#toggle-raw-view"
    );

    if (toggleBtn) {
      // Hide toggle button since Rich Text Editor is disabled
      toggleBtn.style.display = "none";
    }

    console.log("⚠️ Toggle Raw View disabled");
  }

  // Get current content from active editor
  getCurrentEditorContent() {
    console.log("🔍 Getting current editor content...");

    // Check which tab is currently active
    const activeTab = DOMHelpers.querySelector(
      this.editorContainer,
      ".confluence-editor-tab.active"
    );

    console.log("🔍 Active tab:", activeTab ? activeTab.id : "none");

    if (activeTab && activeTab.id === "live-edit-tab") {
      console.log("📝 Live Edit tab is active");

      // Live Edit tab is active
      if (this.liveTextEditor && this.liveTextEditor.isReady()) {
        // Get content from Quill editor
        const content = this.liveTextEditor.getHTML() || "";
        console.log("📝 Got content from Quill editor:", {
          length: content.length,
          preview: content.substring(0, 200),
          hasContent: content.length > 0,
        });
        return content;
      } else {
        console.log("⚠️ Live Text Editor not ready, trying fallback");

        // Get content from fallback textarea
        const fallbackEditor = DOMHelpers.querySelector(
          this.editorContainer,
          "#live-edit-editor-fallback"
        );
        if (fallbackEditor) {
          const content = fallbackEditor.value || "";
          console.log(
            "📝 Got content from fallback editor:",
            content.length,
            "characters"
          );
          return content;
        }
      }
    } else if (activeTab && activeTab.id === "rich-text-tab") {
      console.log("🎨 Rich Text tab is active");

      // Rich Text tab is active
      if (this.tipTapEditor && this.tipTapEditor.isReady()) {
        // Get content from TipTap editor
        const content = this.tipTapEditor.getHTML() || "";
        console.log("🎨 Got content from TipTap editor:", {
          length: content.length,
          preview: content.substring(0, 200),
          hasContent: content.length > 0,
        });
        return content;
      } else {
        console.log("⚠️ TipTap Editor not ready, trying fallback");

        // Get content from fallback textarea
        const fallbackEditor = DOMHelpers.querySelector(
          this.editorContainer,
          "#rich-text-editor-fallback"
        );
        if (fallbackEditor) {
          const content = fallbackEditor.value || "";
          console.log(
            "🎨 Got content from Rich Text fallback editor:",
            content.length,
            "characters"
          );
          return content;
        }
      }
    }

    console.log("📝 Using raw editor content");

    // Default to raw editor
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    if (rawEditor) {
      const content = rawEditor.value || "";
      console.log(
        "📝 Got content from raw editor:",
        content.length,
        "characters"
      );
      return content;
    }

    console.warn("⚠️ No editor content found");
    return "";
  }

  // Initialize Live Edit tab
  async initializeLiveEditTab() {
    console.log("🔍 Initializing Live Edit tab...");

    const liveEditEditorContainer = DOMHelpers.querySelector(
      this.editorContainer,
      "#live-edit-editor-container"
    );
    if (!liveEditEditorContainer) {
      console.warn("⚠️ Live Edit editor container not found");
      return;
    }

    // Hide TipTap container, show raw editor for Live Edit tab
    const richTextContainer = DOMHelpers.querySelector(
      this.editorContainer,
      "#tiptap-editor-container"
    );
    if (richTextContainer) {
      richTextContainer.style.display = "none";
    }
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );
    if (rawEditor) {
      rawEditor.classList.add("hidden");
    }
    console.log("✅ TipTap container hidden for Live Edit tab");

    try {
      // Initialize Live Text Editor with Quill.js
      console.log("🎨 Initializing Live Text Editor with Quill.js...");
      this.liveTextEditor = new LiveTextEditor(liveEditEditorContainer, {
        theme: "snow",
      });

      // Wait for editor to be ready
      await this.waitForLiveTextEditor();

      // 💾 ALWAYS load content from localStorage backup (source of truth)
      console.log(
        "💾 Loading content from localStorage backup for Live Edit tab..."
      );
      const backupContent = this.storageManager.loadFromLocalStorage();

      if (backupContent) {
        // Update currentContent to match localStorage
        this.currentContent = backupContent;

        let content =
          backupContent.full_storage_format || backupContent.content || "";
        // Clean and format content for editing
        content = XMLFormatter.cleanXMLMarkers(content);

        // Process Mermaid diagrams immediately after cleaning
        content = await this.processMermaidInContentSync(content);

        // Format and clean XHTML content
        content = this.normalizeHtmlString(content);
        console.log("🎨Final content :", content);

        // Set content to Live Text Editor
        this.liveTextEditor.setHTML(content);
        console.log("✅ Live Edit content loaded from localStorage backup");
      } else {
        console.log("🔍 No backup content found for Live Edit tab");
      }

      // Setup event listeners
      this.setupLiveEditEventListeners();

      console.log("✅ Live Edit tab initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Live Text Editor:", error);

      // Fallback to simple textarea
      this.createFallbackTextEditor(liveEditEditorContainer);
    }
  }

  // Wait for Live Text Editor to be ready
  async waitForLiveTextEditor() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (!this.liveTextEditor.isReady() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!this.liveTextEditor.isReady()) {
      throw new Error("Live Text Editor failed to initialize within timeout");
    }
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

      // 💾 ALWAYS load content from localStorage backup (source of truth)
      console.log("💾 Loading content from localStorage backup...");
      const backupContent = this.storageManager.loadFromLocalStorage();

      if (backupContent) {
        console.log("💾 Found backup content, loading into Rich Text editor");
        let content =
          backupContent.full_storage_format || backupContent.content || "";
        content = XMLFormatter.cleanXMLMarkers(content);

        // Process Mermaid diagrams immediately after cleaning
        content = await this.processMermaidInContentSync(content);

        // content = XMLFormatter.formatXHTML(content);

        // Always set content from localStorage backup
        await this.tipTapEditor.setHTML(content);
        console.log("✅ Rich Text content loaded from localStorage backup");

        // Update currentContent to match localStorage
        this.currentContent = backupContent;
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
      // content = XMLFormatter.formatXHTML(content);
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
      container.addEventListener("tipTapTextChange", (event) => {
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

  // Sync Rich Text content to Raw Editor (for Save functionality)
  syncRichTextToRawEditor() {
    if (this.tipTapEditor && this.tipTapEditor.isReady()) {
      const htmlContent = this.tipTapEditor.getHTML();
      console.log(
        "🔄 Syncing Rich Text content to Raw Editor:",
        htmlContent.substring(0, 200)
      );

      // Update raw editor with Rich Text content
      const rawEditor = DOMHelpers.querySelector(
        this.editorContainer,
        "#raw-content-editor"
      );
      if (rawEditor) {
        rawEditor.value = htmlContent;
        console.log("✅ Raw editor updated with Rich Text content");
      }

      // Update current content
      if (this.currentContent) {
        this.currentContent.full_storage_format = htmlContent;
        this.currentContent.content = htmlContent;
      }

      console.log("✅ Rich Text content synced to all tabs");
    }
  }

  // Create fallback textarea editor
  createFallbackTextEditor(container) {
    console.log("🔄 Creating fallback textarea editor...");

    container.innerHTML = `
      <textarea
        class="live-edit-editor"
        id="live-edit-editor-fallback"
        placeholder="Enter your content here... Mermaid diagrams will be automatically rendered in the preview."
      ></textarea>
    `;

    const textarea = container.querySelector("#live-edit-editor-fallback");

    // Set initial content
    if (this.currentContent) {
      let content =
        this.currentContent.full_storage_format ||
        this.currentContent.content ||
        "";
      content = XMLFormatter.cleanXMLMarkers(content);
      // content = XMLFormatter.formatXHTML(content);
      textarea.value = content;
    }

    // Setup fallback event listeners
    this.setupFallbackEventListeners(textarea);
  }

  // Setup Live Edit event listeners
  setupLiveEditEventListeners() {
    if (this.liveTextEditor && this.liveTextEditor.isReady()) {
      // Setup Quill.js event listeners
      const editorContainer = DOMHelpers.querySelector(
        this.editorContainer,
        "#live-edit-editor-container"
      );

      if (editorContainer) {
        // Debounced auto-save
        const debouncedUpdate = this.debounce(() => {
          this.isModified = true;
          this.storageManager.startAutoSave(() => this.saveToLocalStorage());
        }, 500);

        // Listen to custom events from LiveTextEditor
        DOMHelpers.addEventListener(
          editorContainer,
          "liveTextChange",
          debouncedUpdate
        );

        console.log("✅ Live Edit event listeners setup for Quill.js");
      }
    }
  }

  // Setup fallback event listeners for textarea
  setupFallbackEventListeners(textarea) {
    if (!textarea) return;

    // Debounced auto-save
    const debouncedUpdate = this.debounce(() => {
      this.isModified = true;
      this.storageManager.startAutoSave(() => this.saveToLocalStorage());
    }, 500);

    // Real-time preview update
    DOMHelpers.addEventListener(textarea, "input", debouncedUpdate);
    DOMHelpers.addEventListener(textarea, "paste", () => {
      setTimeout(debouncedUpdate, 100); // Delay for paste content to be processed
    });

    console.log("✅ Fallback Live Edit event listeners setup");
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
      this.currentContent.full_storage_format = currentEditorContent;
    }

    // Always extract diagrams to ensure sync with current content
    console.log("📊 Extracting diagrams from current content...");
    this.extractMermaidDiagrams();

    // Merge with stored diagrams from localStorage to ensure all diagrams are available
    console.log("📊 Merging with stored diagrams from localStorage...");
    const storedDiagrams = this.storageManager.getMermaidDiagramMappings();
    if (storedDiagrams && storedDiagrams.size > 0) {
      storedDiagrams.forEach((storedData, diagramId) => {
        // Only add if not already in current content
        if (!this.mermaidDiagramsMap.has(diagramId)) {
          this.mermaidDiagramsMap.set(diagramId, storedData);
          console.log(
            `📊 Added stored diagram: ${storedData.title} (${storedData.type})`
          );
        }
      });
    }

    console.log("Diagrams available:", this.mermaidDiagrams.length);
    console.log(
      "DiagramsMap size (after merge):",
      this.mermaidDiagramsMap.size
    );
    this.populateMermaidSelector();
  }

  // Update Live Edit preview
  async updateLiveEditPreview() {
    const liveEditPreview = DOMHelpers.querySelector(
      this.editorContainer,
      "#live-edit-preview"
    );

    if (!liveEditPreview) return;

    // Get content from either Quill editor or fallback textarea
    let content = "";

    if (this.liveTextEditor && this.liveTextEditor.isReady()) {
      // Get content from Quill editor
      content = this.liveTextEditor.getHTML();
    } else {
      // Get content from fallback textarea
      const fallbackEditor = DOMHelpers.querySelector(
        this.editorContainer,
        "#live-edit-editor-fallback"
      );
      if (fallbackEditor) {
        content = fallbackEditor.value;
      }
    }

    // Show loading state
    liveEditPreview.classList.add("loading");

    try {
      // Process content and render Mermaid diagrams
      const processedContent = await this.processLiveEditContent(content);

      // Set processed content
      DOMHelpers.setContent(liveEditPreview, processedContent, true);

      // Render Mermaid diagrams
      await this.renderMermaidInLivePreview();

      console.log("✅ Live Edit preview updated");
    } catch (error) {
      console.error("❌ Failed to update Live Edit preview:", error);
      DOMHelpers.setContent(
        liveEditPreview,
        `<p style="color: red;">❌ Preview Error: ${error.message}</p>`,
        true
      );
    } finally {
      // Remove loading state
      liveEditPreview.classList.remove("loading");
    }
  }

  // Process Live Edit content for preview
  async processLiveEditContent(content) {
    if (!content) {
      return '<div class="preview-placeholder"><p>📝 Start typing to see live preview...</p></div>';
    }

    // Convert basic markdown-like syntax to HTML
    let processedContent = content;

    // Convert headers
    processedContent = processedContent.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    processedContent = processedContent.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    processedContent = processedContent.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Convert paragraphs
    processedContent = processedContent.replace(/\n\n/g, "</p><p>");
    processedContent = "<p>" + processedContent + "</p>";

    // Convert line breaks
    processedContent = processedContent.replace(/\n/g, "<br>");

    // Clean up empty paragraphs
    processedContent = processedContent.replace(/<p><\/p>/g, "");
    processedContent = processedContent.replace(/<p>\s*<\/p>/g, "");

    return processedContent;
  }

  // Render Mermaid diagrams in Live Edit preview
  async renderMermaidInLivePreview() {
    const liveEditPreview = DOMHelpers.querySelector(
      this.editorContainer,
      "#live-edit-preview"
    );

    if (!liveEditPreview) return;

    // Find all mermaid code blocks
    const mermaidBlocks = liveEditPreview.querySelectorAll("code");

    for (const block of mermaidBlocks) {
      const content = block.textContent.trim();

      // Check if it's a mermaid diagram
      if (this.isMermaidDiagram(content)) {
        try {
          console.log("🎨 Rendering Mermaid diagram in Live Edit preview");

          // Load Mermaid if not already loaded
          await MermaidRenderer.loadMermaidScript();

          // Create mermaid container
          const mermaidContainer = document.createElement("div");
          mermaidContainer.className = "mermaid";
          mermaidContainer.textContent = content;

          // Replace code block with mermaid container
          block.parentNode.replaceChild(mermaidContainer, block);

          // Initialize mermaid
          if (window.mermaid) {
            window.mermaid.initialize({
              startOnLoad: false,
              securityLevel: "loose",
              theme: "default",
            });

            // Render the diagram
            await window.mermaid.init(undefined, mermaidContainer);
          }
        } catch (error) {
          console.error("❌ Failed to render Mermaid diagram:", error);
          // Show error in place of diagram
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText =
            "color: red; padding: 10px; border: 1px solid red; border-radius: 4px; margin: 10px 0;";
          errorDiv.textContent = `❌ Mermaid Error: ${error.message}`;
          block.parentNode.replaceChild(errorDiv, block);
        }
      }
    }
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

  // Format Live Edit content
  formatLiveEditContent() {
    try {
      if (this.liveTextEditor && this.liveTextEditor.isReady()) {
        // Format content in Quill editor
        let content = this.liveTextEditor.getHTML();
        // content = XMLFormatter.formatXHTML(content);
        this.liveTextEditor.setHTML(content);
      } else {
        // Format content in fallback textarea
        const fallbackEditor = DOMHelpers.querySelector(
          this.editorContainer,
          "#live-edit-editor-fallback"
        );
        if (fallbackEditor) {
          let content = fallbackEditor.value;
          // content = XMLFormatter.formatXHTML(content);
          fallbackEditor.value = content;
        }
      }

      this.updateLiveEditPreview();
      console.log("✅ Live Edit content formatted");
    } catch (error) {
      console.error("❌ Failed to format Live Edit content:", error);
    }
  }

  // Sync Live Edit with Raw Content
  syncLiveEditWithRawContent() {
    const rawEditor = DOMHelpers.querySelector(
      this.editorContainer,
      "#raw-content-editor"
    );

    if (!rawEditor) return;

    try {
      // Get content from raw editor
      const rawContent = rawEditor.value;

      // Set to live edit editor
      if (this.liveTextEditor && this.liveTextEditor.isReady()) {
        // Set content to Quill editor
        this.liveTextEditor.setHTML(rawContent);
      } else {
        // Set content to fallback textarea
        const fallbackEditor = DOMHelpers.querySelector(
          this.editorContainer,
          "#live-edit-editor-fallback"
        );
        if (fallbackEditor) {
          fallbackEditor.value = rawContent;
        }
      }

      // Update preview
      this.updateLiveEditPreview();

      console.log("✅ Live Edit synced with Raw Content");
    } catch (error) {
      console.error("❌ Failed to sync Live Edit with Raw Content:", error);
    }
  }

  // Toggle Live Edit fullscreen
  toggleLiveEditFullscreen() {
    const liveEditPreview = DOMHelpers.querySelector(
      this.editorContainer,
      "#live-edit-preview"
    );

    if (!liveEditPreview) return;

    if (liveEditPreview.classList.contains("fullscreen")) {
      liveEditPreview.classList.remove("fullscreen");
      liveEditPreview.style.cssText = "";
    } else {
      liveEditPreview.classList.add("fullscreen");
      liveEditPreview.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 10001;
        background: white;
        padding: 20px;
        overflow-y: auto;
      `;
    }
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
    console.log(`📊 DiagramsMap size: ${this.mermaidDiagramsMap?.size || 0}`);
    console.log(`📊 Current options count: ${selector.options.length}`);

    // Clear ALL existing options completely
    selector.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "📊 Select diagram to edit...";
    selector.appendChild(defaultOption);

    console.log(`📊 After clear, options count: ${selector.options.length}`);

    // Try to get diagrams from current content first, then fallback to localStorage
    let diagramsToUse = this.mermaidDiagramsMap;

    // If no diagrams in current content, try to load from localStorage
    if (!diagramsToUse || diagramsToUse.size === 0) {
      console.log("📊 No diagrams in current content, trying localStorage...");
      const storedDiagrams = this.storageManager.getMermaidDiagramMappings();
      if (storedDiagrams && storedDiagrams.size > 0) {
        diagramsToUse = storedDiagrams;
        console.log(
          `📊 Using ${storedDiagrams.size} diagrams from localStorage`
        );
      }
    }

    // Only add diagrams that actually exist
    if (diagramsToUse && diagramsToUse.size > 0) {
      let addedCount = 0;

      // Create a Set to track added diagram IDs to prevent duplicates
      const addedDiagrams = new Set();

      diagramsToUse.forEach((diagramData, diagramId) => {
        // Only add if not already added and has valid content
        if (
          !addedDiagrams.has(diagramId) &&
          diagramData.content &&
          diagramData.content.trim()
        ) {
          const option = document.createElement("option");
          option.value = diagramId;
          option.textContent = `${diagramData.title} (${diagramData.type})`;
          selector.appendChild(option);
          addedDiagrams.add(diagramId);
          addedCount++;
          console.log(
            `📊 Added option ${addedCount}: ${diagramData.title} (${diagramData.type})`
          );
        }
      });

      console.log(
        `✅ Added ${addedCount} unique diagrams to selector (total options: ${selector.options.length})`
      );
    } else {
      console.warn("⚠️ No Mermaid diagrams found to populate selector");
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
      `✅ Populated ${this.mermaidDiagramsMap?.size || 0} diagrams in selector`
    );
  }

  // Select mermaid diagram
  selectMermaidDiagram(diagramId) {
    if (!diagramId) {
      this.clearMermaidEditor();
      return;
    }

    // Get diagram from current Map first
    let diagramData = this.mermaidDiagramsMap.get(diagramId);
    let diagram = this.mermaidDiagrams.find((d) => d.id === diagramId);

    // If found in current content, ensure originCode is set
    if (diagramData && diagram) {
      // Ensure diagram has originCode (use originalCode from extraction or current code)
      if (!diagram.originCode) {
        diagram.originCode = diagram.originalCode || diagram.code;
      }
    }

    // If not found in current content, try localStorage
    if (!diagramData) {
      console.log(
        `📊 Diagram ${diagramId} not found in current content, checking localStorage...`
      );
      const storedDiagrams = this.storageManager.getMermaidDiagramMappings();
      diagramData = storedDiagrams.get(diagramId);

      if (diagramData) {
        console.log(`📊 Found diagram ${diagramId} in localStorage`);
        // Create a temporary diagram object for editing
        diagram = {
          id: diagramId,
          title: diagramData.title,
          type: diagramData.type,
          code: diagramData.content,
          originCode: diagramData.originCode, // Use the stored originCode (match[0])
        };
      } else {
        console.error(
          `❌ Diagram not found in current content or localStorage: ${diagramId}`
        );
        return;
      }
    }

    // Update code editor
    const codeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    if (codeEditor) {
      codeEditor.value = diagramData.content;
      this.currentSelectedDiagram = diagram;
      this.currentSelectedDiagramId = diagramId;
      this.updateMermaidPreview().catch((error) => {
        console.error("❌ Error updating Mermaid preview:", error);
      });

      // Add event listener for code changes
      codeEditor.removeEventListener("input", this.handleMermaidCodeChange);
      this.handleMermaidCodeChange = () => {
        if (this.currentSelectedDiagram && this.currentSelectedDiagramId) {
          const newCode = codeEditor.value;
          console.log("new code", newCode);

          // Update diagram code in memory (both array and map)
          this.currentSelectedDiagram.code = newCode;

          // Update in current content map if exists
          const currentDiagramData = this.mermaidDiagramsMap.get(
            this.currentSelectedDiagramId
          );
          if (currentDiagramData) {
            currentDiagramData.content = newCode;
            // Keep originCode unchanged (it should be the original match[0])
          } else {
            // If not in current content, add it to the map
            this.mermaidDiagramsMap.set(this.currentSelectedDiagramId, {
              title: this.currentSelectedDiagram.title,
              type: this.currentSelectedDiagram.type,
              content: newCode,
              originCode: this.currentSelectedDiagram.originCode, // Use the original match[0]
            });
          }

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

          console.log(
            `📝 Updated diagram ${this.currentSelectedDiagramId} in memory and localStorage`
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
    if (!this.currentSelectedDiagram || !this.currentSelectedDiagramId) {
      this.addAIMessage(
        "ai",
        "⚠️ Please select a Mermaid diagram first to edit it."
      );
      return;
    }

    // Double-check the selected diagram exists in the map
    const diagramInMap = this.mermaidDiagramsMap.get(
      this.currentSelectedDiagramId
    );
    if (!diagramInMap) {
      this.addAIMessage(
        "ai",
        "❌ Selected diagram not found. Please select a valid diagram."
      );
      return;
    }

    console.log(`🎯 AI editing diagram: ${this.currentSelectedDiagramId}`, {
      title: diagramInMap.title,
      type: diagramInMap.type,
      currentCode: this.currentSelectedDiagram.code?.substring(0, 50) + "...",
    });

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
          const currentDiagramInMap = this.mermaidDiagramsMap.get(
            this.currentSelectedDiagramId
          );
          if (!currentDiagramInMap) {
            throw new Error("Selected diagram no longer exists");
          }

          console.log(`🔄 Updating diagram ${this.currentSelectedDiagramId}:`, {
            oldCode: this.currentSelectedDiagram.code?.substring(0, 30) + "...",
            newCode: cleanedDiagram.substring(0, 30) + "...",
          });

          // Update ONLY the selected diagram
          this.currentSelectedDiagram.code = cleanedDiagram;
          currentDiagramInMap.content = cleanedDiagram;

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

          // Mark content as modified for synchronization
          console.log(
            `🔄 Diagram ${this.currentSelectedDiagramId} updated by AI`
          );

          // Update the content will be handled by syncAllContent when saving

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

  extractMermaidDiagrams() {
    console.log("🔍 Extracting Mermaid diagrams...");

    if (!this.currentContent?.full_storage_format) {
      console.warn("⚠️ No content to extract diagrams from:", {
        hasCurrentContent: !!this.currentContent,
        hasFullStorageFormat: !!this.currentContent?.full_storage_format,
        contentLength: this.currentContent?.full_storage_format?.length || 0,
      });
      this.mermaidDiagrams = [];
      this.mermaidDiagramsMap = new Map();
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

  // Save current content to localStorage (for auto-save)
  saveToLocalStorage() {
    console.log("💾 Auto-saving to localStorage...");

    try {
      // Get current content from active editor
      const currentEditorContent = this.getCurrentEditorContent();

      if (currentEditorContent) {
        // Load existing backup or create new one
        let backupContent =
          this.storageManager.loadFromLocalStorage() ||
          this.currentContent ||
          {};

        // Update backup with latest editor content
        backupContent.full_storage_format = currentEditorContent;
        backupContent.content = currentEditorContent;

        // Save updated content to localStorage
        this.storageManager.saveToLocalStorage(backupContent);

        // Update currentContent to match localStorage
        this.currentContent = backupContent;

        console.log("✅ Content auto-saved to localStorage:", {
          contentLength: currentEditorContent.length,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (error) {
      console.error("❌ Failed to auto-save to localStorage:", error);
    }
  }

  async saveChanges() {
    console.log("💾 Saving changes...");

    try {
      // Get current content from active editor (Rich Text or Raw)
      const currentEditorContent = this.getCurrentEditorContent();

      console.log("💾 Save process - Current editor content:", {
        length: currentEditorContent.length,
        hasContent: currentEditorContent.length > 0,
        preview: currentEditorContent.substring(0, 300),
      });

      // Update current content with editor content
      if (this.currentContent && currentEditorContent) {
        console.log("💾 Before update - currentContent.full_storage_format:", {
          length: this.currentContent.full_storage_format?.length || 0,
          preview:
            this.currentContent.full_storage_format?.substring(0, 200) ||
            "empty",
        });

        this.currentContent.full_storage_format = currentEditorContent;

        console.log("💾 After update - currentContent.full_storage_format:", {
          length: this.currentContent.full_storage_format?.length || 0,
          preview:
            this.currentContent.full_storage_format?.substring(0, 200) ||
            "empty",
        });

        console.log(
          "📝 Updated content from editor:",
          currentEditorContent.length,
          "characters"
        );
      } else {
        console.warn("⚠️ Cannot update content:", {
          hasCurrentContent: !!this.currentContent,
          hasEditorContent: !!currentEditorContent,
        });
      }

      // Check which tab is active to decide sync strategy
      const activeTab = DOMHelpers.querySelector(
        this.editorContainer,
        ".confluence-editor-tab.active"
      );

      if (activeTab && activeTab.id === "live-edit-tab") {
        console.log(
          "💾 Live Edit tab active - skipping syncAllContent to preserve editor content"
        );
        // Don't sync from raw editor when Live Edit is active
        // Content was already updated from Live Text Editor above
      } else if (activeTab && activeTab.id === "rich-text-tab") {
        console.log("💾 Rich Text tab active - syncing content to other tabs");
        // Rich Text tab is active - sync content to raw editor
        this.syncRichTextToRawEditor();

        // Then sync all content sources
        this.currentContent = this.contentSynchronizer.syncAllContent(
          this.currentContent,
          this.editorContainer,
          this.mermaidDiagrams
        );
      } else {
        console.log("💾 Raw/other tab active - syncing all content sources");
        // Sync all content sources (includes raw editor sync)
        this.currentContent = this.contentSynchronizer.syncAllContent(
          this.currentContent,
          this.editorContainer,
          this.mermaidDiagrams
        );
      }

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

    // Destroy Live Text Editor
    if (this.liveTextEditor) {
      console.log("🗑️ Destroying Live Text Editor...");
      this.liveTextEditor.destroy();
      this.liveTextEditor = null;
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
    this.mermaidDiagramsMap = new Map();
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
