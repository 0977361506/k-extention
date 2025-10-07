/**
 * Live Text Editor using Quill.js
 * Professional text editor for Live Edit tab
 */

export class LiveTextEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.quill = null;
    this.isInitialized = false;

    // Store original options for reference
    this.originalOptions = options;

    this.init();
  }

  /**
   * Initialize the Live Text Editor
   */
  async init() {
    try {
      console.log("🎨 Initializing Live Text Editor...");

      // Load Quill.js (should already be loaded via content_scripts)
      await this.loadQuill();

      // Create editor container
      this.createEditorContainer();

      // Initialize Quill
      this.initializeQuill();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log("✅ Live Text Editor initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Live Text Editor:", error);
      throw error;
    }
  }

  /**
   * Load Quill.js - should already be loaded via content_scripts
   */
  async loadQuill() {
    try {
      // Log all available libraries
      console.log("🔍 Checking available libraries:");
      console.log("- Quill:", window.Quill ? "✅ Available" : "❌ Not found");
      console.log(
        "- Mermaid:",
        window.mermaid ? "✅ Available" : "❌ Not found"
      );

      // Check if Quill is already loaded via content_scripts
      if (window.Quill && typeof window.Quill === "function") {
        console.log("✅ Quill already loaded via content_scripts");
        return;
      }

      // If not loaded, wait a bit and check again
      console.log("🔄 Waiting for Quill to load...");
      await this.waitForQuill();

      if (window.Quill && typeof window.Quill === "function") {
        console.log("✅ Quill loaded successfully");
        return;
      }

      throw new Error("Quill not found after waiting");
    } catch (error) {
      console.error("❌ Failed to load Quill:", error);
      throw new Error(`Failed to load Quill.js: ${error.message}`);
    }
  }

  /**
   * Get basic Quill options without Better Table
   */
  getBasicOptions() {
    const options = {
      theme: "snow",
      modules: {
        table: true, // enable default table module
        toolbar: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        // Add clipboard module to preserve HTML
        // clipboard: {
        //   matchVisual: false,
        //   matchers: [
        //     // Custom matcher to preserve HTML tags
        //     [
        //       "ul",
        //       (node, delta) => {
        //         console.log("🔍 Processing UL node:", node);
        //         return delta;
        //       },
        //     ],
        //     [
        //       "ol",
        //       (node, delta) => {
        //         console.log("🔍 Processing OL node:", node);
        //         return delta;
        //       },
        //     ],
        //     [
        //       "li",
        //       (node, delta) => {
        //         console.log("🔍 Processing LI node:", node);
        //         return delta;
        //       },
        //     ],
        //     [
        //       "strong",
        //       (node, delta) => {
        //         console.log("🔍 Processing STRONG node:", node);
        //         return delta;
        //       },
        //     ],
        //   ],
        // },
      },
      formats: [
        "header",
        "font",
        "size",
        "bold",
        "italic",
        "underline",
        "strike",
        "color",
        "background",
        "script",
        "list",
        "bullet",
        "indent",
        "align",
        "blockquote",
        "code-block",
        "link",
        "image",
        // Add HTML tag formats
        "ul",
        "ol",
        "li",
        "p",
        "div",
        "span",
        "strong",
        "em",
        "br",
        "hr",
      ],
    };

    // Note: Using default Quill table module instead of Better Table
    // to avoid width calculation errors

    return options;
  }

  /**
   * Wait for Quill to be loaded by content_scripts
   */
  async waitForQuill() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (!window.Quill && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!window.Quill) {
      throw new Error("Quill failed to load within timeout");
    }
  }

  /**
   * Ensure container has proper dimensions for Better Table
   */
  ensureContainerDimensions() {
    if (!this.editorElement) return;

    // Force container to have explicit dimensions
    const containerStyle = this.editorElement.style;
    const computedStyle = window.getComputedStyle(this.editorElement);

    // Set minimum width if not set
    if (!containerStyle.width && computedStyle.width === "auto") {
      containerStyle.width = "100%";
    }

    // Set minimum height if not set
    if (!containerStyle.height && computedStyle.height === "auto") {
      containerStyle.minHeight = "400px";
    }

    // Force layout recalculation
    this.editorElement.offsetHeight;

    console.log("📐 Container dimensions:", {
      width: this.editorElement.offsetWidth,
      height: this.editorElement.offsetHeight,
      computedWidth: computedStyle.width,
      computedHeight: computedStyle.height,
    });
  }

  /**
   * Create editor container
   */
  createEditorContainer() {
    // Clear existing content
    this.container.innerHTML = "";

    // Create Quill container
    const editorDiv = document.createElement("div");
    editorDiv.className = "live-text-editor-quill";
    editorDiv.style.cssText = `
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    `;

    this.container.appendChild(editorDiv);
    this.editorElement = editorDiv;
  }

  /**
   * Initialize Quill editor
   */
  initializeQuill() {
    if (!window.Quill) {
      throw new Error("Quill is not loaded");
    }

    try {
      // Ensure container has proper dimensions before initializing
      this.ensureContainerDimensions();

      // Register plugins if available
      this.registerQuillPlugins();

      // Create Quill with basic options first
      this.quill = new window.Quill(this.editorElement, this.getBasicOptions());

      // Default Quill table module is already enabled

      // Set initial focus
      setTimeout(() => {
        if (this.quill) {
          this.quill.focus();
        }
      }, 100);

      console.log("✅ Quill editor initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Quill:", error);
      throw error;
    }
  }

  /**
   * Register Quill plugins
   */
  registerQuillPlugins() {
    try {
      console.log("🔍 Registering custom HTML formats for Quill...");

      // Register custom HTML formats
      this.registerCustomFormats();

      console.log("✅ Plugin registration completed");
    } catch (error) {
      console.warn("⚠️ Plugin registration failed:", error);
    }
  }

  /**
   * Register custom HTML formats that Quill should preserve
   */
  registerCustomFormats() {
    if (!window.Quill) return;

    const Inline = window.Quill.import("blots/inline");
    const Block = window.Quill.import("blots/block");
    const Container = window.Quill.import("blots/container");

    // Custom UL format
    class ULFormat extends Container {
      static create() {
        const node = super.create();
        node.setAttribute("tagName", "UL");
        return node;
      }

      static formats() {
        return true;
      }
    }
    ULFormat.blotName = "ul";
    ULFormat.tagName = "UL";

    // Custom OL format
    class OLFormat extends Container {
      static create() {
        const node = super.create();
        node.setAttribute("tagName", "OL");
        return node;
      }

      static formats() {
        return true;
      }
    }
    OLFormat.blotName = "ol";
    OLFormat.tagName = "OL";

    // Custom LI format
    class LIFormat extends Block {
      static create() {
        const node = super.create();
        node.setAttribute("tagName", "LI");
        return node;
      }

      static formats() {
        return true;
      }
    }
    LIFormat.blotName = "li";
    LIFormat.tagName = "LI";

    // Custom STRONG format
    class StrongFormat extends Inline {
      static create() {
        return super.create();
      }

      static formats() {
        return true;
      }
    }
    StrongFormat.blotName = "strong";
    StrongFormat.tagName = "STRONG";

    try {
      // Register the custom formats
      window.Quill.register(ULFormat, true);
      window.Quill.register(OLFormat, true);
      window.Quill.register(LIFormat, true);
      window.Quill.register(StrongFormat, true);

      console.log("✅ Custom HTML formats registered:", [
        "ul",
        "ol",
        "li",
        "strong",
      ]);
    } catch (error) {
      console.warn("⚠️ Failed to register custom formats:", error);
    }
  }

  /**
   * Add table support if Better Table plugin is available
   */
  addTableSupport() {
    try {
      if (window.quillBetterTable && this.quill) {
        console.log("🔄 Adding Better Table support...");

        // Better Table should already be configured in options
        // Just add the table button to toolbar
        this.addTableButton();

        // Check if Better Table module is working
        const tableModule = this.quill.getModule("better-table");
        if (tableModule) {
          console.log("✅ Better Table module is active");
        } else {
          console.warn("⚠️ Better Table module not found in Quill instance");
        }
      } else {
        console.warn("⚠️ Better Table not available");
      }
    } catch (error) {
      console.warn("⚠️ Failed to add table support:", error);
    }
  }

  addTableButton() {
    try {
      // Create table button
      const tableButton = document.createElement("button");
      tableButton.innerHTML = "📋";
      tableButton.title = "Insert Table (3x3)";
      tableButton.type = "button";
      tableButton.className = "ql-table";

      tableButton.addEventListener("click", () => {
        try {
          // Try to get Better Table module
          const tableModule = this.quill.getModule("better-table");
          if (tableModule && tableModule.insertTable) {
            tableModule.insertTable(3, 3);
            console.log("✅ Table inserted via Better Table");
          } else {
            // Fallback: insert simple HTML table
            const range = this.quill.getSelection();
            if (range) {
              const tableHTML = `
                <table>
                  <tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr>
                  <tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr>
                  <tr><td>Cell 7</td><td>Cell 8</td><td>Cell 9</td></tr>
                </table>
              `;
              this.quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
              console.log("✅ Table inserted via HTML fallback");
            }
          }
        } catch (insertError) {
          console.warn("⚠️ Table insertion failed:", insertError);
        }
      });

      // Add to toolbar
      const toolbarContainer =
        this.quill.container.querySelector(".ql-toolbar");
      if (toolbarContainer) {
        // Add after the last group
        const lastGroup = toolbarContainer.querySelector(
          ".ql-formats:last-child"
        );
        if (lastGroup) {
          lastGroup.appendChild(tableButton);
        } else {
          toolbarContainer.appendChild(tableButton);
        }
        console.log("✅ Table button added to toolbar");
      }
    } catch (error) {
      console.warn("⚠️ Failed to add table button:", error);
    }
  }

  /**
   * Setup event listeners with error handling
   */
  setupEventListeners() {
    if (!this.quill) return;

    try {
      // Text change event with validation
      this.quill.on("text-change", (delta, oldDelta, source) => {
        try {
          if (source === "user") {
            this.onTextChange(delta, oldDelta);
          }
        } catch (error) {
          console.error("❌ Error in text-change handler:", error);
        }
      });

      // Selection change event with validation
      this.quill.on("selection-change", (range, oldRange, source) => {
        try {
          this.onSelectionChange(range, oldRange, source);
        } catch (error) {
          console.error("❌ Error in selection-change handler:", error);
        }
      });

      console.log("✅ Live Text Editor event listeners setup");
    } catch (error) {
      console.error("❌ Error setting up event listeners:", error);
    }
  }

  /**
   * Handle text change
   */
  onTextChange(delta, oldDelta) {
    try {
      // Validate delta objects
      if (!delta || typeof delta !== "object") {
        console.warn("⚠️ Invalid delta object:", delta);
        return;
      }

      if (!oldDelta || typeof oldDelta !== "object") {
        console.warn("⚠️ Invalid oldDelta object:", oldDelta);
        return;
      }

      // Ensure delta has ops array
      if (!delta.ops || !Array.isArray(delta.ops)) {
        console.warn("⚠️ Delta missing ops array:", delta);
        return;
      }

      if (!oldDelta.ops || !Array.isArray(oldDelta.ops)) {
        console.warn("⚠️ OldDelta missing ops array:", oldDelta);
        return;
      }

      const event = new CustomEvent("liveTextChange", {
        detail: {
          html: this.getHTML(),
          text: this.getText(),
          delta: this.getContents(),
          changeDelta: delta,
          oldDelta: oldDelta,
        },
      });
      this.container.dispatchEvent(event);
    } catch (error) {
      console.error("❌ Error in onTextChange:", error);
    }
  }

  /**
   * Handle selection change
   */
  onSelectionChange(range, oldRange, source) {
    const event = new CustomEvent("liveTextSelectionChange", {
      detail: { range, oldRange, source },
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Get editor content as HTML
   */
  getHTML() {
    return this.quill ? this.quill.root.innerHTML : "";
  }

  /**
   * Get editor content as plain text
   */
  getText() {
    return this.quill ? this.quill.getText() : "";
  }

  /**
   * Get Quill instance
   */
  getQuill() {
    return this.quill;
  }

  /**
   * Get editor content as Delta
   */
  getContents() {
    return this.quill ? this.quill.getContents() : null;
  }

  /**
   * Set editor content from HTML (preserve all HTML tags)
   */
  setHTML(html) {
    if (!this.quill || !html) {
      console.warn("⚠️ setHTML called with invalid parameters:", {
        quill: !!this.quill,
        html: !!html,
      });
      return;
    }

    console.log("🔍 Setting HTML content:", html.substring(0, 200));

    try {
      // Method 1: Try dangerouslyPasteHTML with position parameter
      try {
        // Clear editor first
        this.quill.setText("");

        // Use position 0 to avoid index errors
        this.quill.clipboard.dangerouslyPasteHTML(0, html);
        console.log("✅ HTML set using dangerouslyPasteHTML with position");

        return;
      } catch (pasteError) {
        console.warn(
          "⚠️ dangerouslyPasteHTML with position failed:",
          pasteError
        );
      }

      // Method 2: Fallback to direct innerHTML
      this.quill.root.innerHTML = html;
      console.log("✅ HTML set using root.innerHTML fallback");
    } catch (error) {
      console.error("❌ Error setting HTML content:", error);
    }
  }

  /**
   * Set editor content from text
   */
  setText(text) {
    if (this.quill) {
      this.quill.setText(text);
    }
  }

  /**
   * Clear editor content
   */
  clear() {
    if (this.quill) {
      this.quill.setText("");
    }
  }

  /**
   * Focus the editor
   */
  focus() {
    if (this.quill) {
      this.quill.focus();
    }
  }

  /**
   * Check if editor is ready
   */
  isReady() {
    return this.isInitialized && this.quill !== null;
  }

  /**
   * Destroy the editor
   */
  destroy() {
    if (this.quill) {
      // Remove event listeners
      this.quill.off("text-change");
      this.quill.off("selection-change");

      // Clear container
      if (this.container) {
        this.container.innerHTML = "";
      }

      this.quill = null;
    }

    this.isInitialized = false;
    console.log("🗑️ Live Text Editor destroyed");
  }
}
