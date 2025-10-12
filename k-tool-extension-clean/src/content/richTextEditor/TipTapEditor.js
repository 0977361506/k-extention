/**
 * TipTap Rich Text Editor
 * Professional rich text editor with full table and image support
 */

// Import TipTap Editor CSS styles
import "./TipTapEditor.css";

/**
 * TipTap modules are loaded via tiptap-init.js and exposed to global scope
 * This class uses the global window.TipTapModules
 */

export class TipTapEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.editor = null;
    this.isInitialized = false;
    this.options = {
      placeholder: "Start writing...",
      ...options,
    };

    this.init();
  }

  /**
   * Initialize the TipTap Editor
   */
  async init() {
    try {
      console.log("🎨 Initializing TipTap Rich Text Editor...");

      // Create editor container
      this.createEditorContainer();

      // Initialize TipTap
      this.initializeTipTap();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log("✅ TipTap Rich Text Editor initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize TipTap Editor:", error);
      throw error;
    }
  }

  /**
   * Create editor container with toolbar
   */
  createEditorContainer() {
    // Clear existing content
    this.container.innerHTML = "";

    // Create main wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "tiptap-editor-wrapper";
    wrapper.style.cssText = `
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e1e5e9;
    `;

    // Create toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "tiptap-toolbar";

    // Create editor container
    const editorDiv = document.createElement("div");
    editorDiv.className = "tiptap-editor-content";

    wrapper.appendChild(toolbar);
    wrapper.appendChild(editorDiv);
    this.container.appendChild(wrapper);

    this.toolbarElement = toolbar;
    this.editorElement = editorDiv;
  }

  /**
   * Initialize TipTap with extensions
   */
  initializeTipTap() {
    // Check if TipTap modules are available
    if (!window.TipTapModules) {
      throw new Error(
        "TipTap modules not loaded. Make sure tiptap.js is loaded before content.js"
      );
    }

    const {
      Editor,
      StarterKit,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link,
      TextAlign,
      Color,
      TextStyle,
      FontFamily,
      Underline,
      Subscript,
      Superscript,
    } = window.TipTapModules;

    this.editor = new Editor({
      element: this.editorElement,
      extensions: [
        StarterKit.configure({
          // Disable extensions that we'll add separately to avoid duplicates
          table: false,
          link: false,
          underline: false,
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              id: {
                default: null,
                parseHTML: (element) => element.getAttribute("id"),
                renderHTML: (attributes) => {
                  if (!attributes.id) {
                    return {};
                  }
                  return {
                    id: attributes.id,
                  };
                },
              },
              "data-mermaid-id": {
                default: null,
                parseHTML: (element) => element.getAttribute("data-mermaid-id"),
                renderHTML: (attributes) => {
                  if (!attributes["data-mermaid-id"]) {
                    return {};
                  }
                  return {
                    "data-mermaid-id": attributes["data-mermaid-id"],
                  };
                },
              },
              style: {
                default: null,
                parseHTML: (element) => element.getAttribute("style"),
                renderHTML: (attributes) => {
                  if (!attributes.style) {
                    return {};
                  }
                  return {
                    style: attributes.style,
                  };
                },
              },
            };
          },
          addKeyboardShortcuts() {
            return {
              // Disable Delete and Backspace for images
              Delete: ({ editor }) => {
                const { selection } = editor.state;
                const node = selection.$from.nodeAfter;
                if (node && node.type.name === "image") {
                  console.log("🚫 Image deletion disabled");
                  return true; // Prevent deletion
                }
                return false;
              },
              Backspace: ({ editor }) => {
                const { selection } = editor.state;
                const node = selection.$from.nodeBefore;
                if (node && node.type.name === "image") {
                  console.log("🚫 Image deletion disabled");
                  return true; // Prevent deletion
                }
                return false;
              },
            };
          },
          addNodeView() {
            return ({ node, HTMLAttributes }) => {
              const img = document.createElement("img");
              Object.entries(HTMLAttributes).forEach(([key, value]) => {
                img.setAttribute(key, value);
              });

              // Make image non-selectable and non-deletable
              img.style.userSelect = "none";
              img.style.pointerEvents = "none";
              img.draggable = false;

              // Add visual indicator that image is protected
              img.style.border = "2px solid #e2e8f0";
              img.style.borderRadius = "4px";
              img.title = "Image is protected from editing";

              return {
                dom: img,
                contentDOM: null,
                selectNode: () => {
                  console.log("🚫 Image selection disabled");
                },
                deselectNode: () => {},
                destroy: () => {},
              };
            };
          },
        }).configure({
          inline: true,
          allowBase64: true,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "tiptap-link",
          },
        }),
        Underline,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Color.configure({
          types: ["textStyle"],
        }),
        TextStyle,
        FontFamily.configure({
          types: ["textStyle"],
        }),
        Subscript,
        Superscript,
      ],
      content: "",
      parseOptions: {
        preserveWhitespace: "full",
      },
      editorProps: {
        attributes: {
          class: "tiptap-editor-prose",
          style: `
            outline: none;
            min-height: 200px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
          `,
        },
      },
      onUpdate: ({ editor }) => {
        this.onContentChange(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        this.onSelectionChange(editor);
      },
    });

    // Create toolbar buttons after editor is initialized
    this.createToolbarButtons();

    console.log("✅ TipTap editor initialized with extensions");
  }

  /**
   * Create toolbar buttons
   */
  createToolbarButtons() {
    const toolbar = this.toolbarElement;

    // Text formatting buttons
    const formatButtons = [
      {
        name: "bold",
        icon: "B",
        title: "Bold",
        command: () => this.editor.chain().focus().toggleBold().run(),
      },
      {
        name: "italic",
        icon: "I",
        title: "Italic",
        command: () => this.editor.chain().focus().toggleItalic().run(),
      },
      {
        name: "underline",
        icon: "U",
        title: "Underline",
        command: () => this.editor.chain().focus().toggleUnderline().run(),
      },
      {
        name: "strike",
        icon: "S",
        title: "Strike",
        command: () => this.editor.chain().focus().toggleStrike().run(),
      },
    ];

    // Heading buttons
    const headingButtons = [
      {
        name: "h1",
        icon: "H1",
        title: "Heading 1",
        command: () =>
          this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        name: "h2",
        icon: "H2",
        title: "Heading 2",
        command: () =>
          this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        name: "h3",
        icon: "H3",
        title: "Heading 3",
        command: () =>
          this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ];

    // List buttons
    const listButtons = [
      {
        name: "bulletList",
        icon: "•",
        title: "Bullet List",
        command: () => this.editor.chain().focus().toggleBulletList().run(),
      },
      {
        name: "orderedList",
        icon: "1.",
        title: "Ordered List",
        command: () => this.editor.chain().focus().toggleOrderedList().run(),
      },
    ];

    // Table buttons
    const tableButtons = [
      {
        name: "table",
        icon: "⊞",
        title: "Insert Table",
        command: () => this.insertTable(),
      },
      {
        name: "addColumnBefore",
        icon: "⊞←",
        title: "Add Column Before",
        command: () => this.editor.chain().focus().addColumnBefore().run(),
      },
      {
        name: "addColumnAfter",
        icon: "⊞→",
        title: "Add Column After",
        command: () => this.editor.chain().focus().addColumnAfter().run(),
      },
      {
        name: "deleteColumn",
        icon: "⊟",
        title: "Delete Column",
        command: () => this.editor.chain().focus().deleteColumn().run(),
      },
      {
        name: "addRowBefore",
        icon: "⊞↑",
        title: "Add Row Before",
        command: () => this.editor.chain().focus().addRowBefore().run(),
      },
      {
        name: "addRowAfter",
        icon: "⊞↓",
        title: "Add Row After",
        command: () => this.editor.chain().focus().addRowAfter().run(),
      },
      {
        name: "deleteRow",
        icon: "⊟",
        title: "Delete Row",
        command: () => this.editor.chain().focus().deleteRow().run(),
      },
      {
        name: "deleteTable",
        icon: "⊟⊞",
        title: "Delete Table",
        command: () => this.editor.chain().focus().deleteTable().run(),
      },
    ];

    // Other buttons
    const otherButtons = [
      {
        name: "blockquote",
        icon: "🧾",
        title: "Blockquote",
        command: () => this.editor.chain().focus().toggleBlockquote().run(),
      },
      {
        name: "codeBlock",
        icon: "⌨",
        title: "Code Block",
        command: () => this.editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        name: "link",
        icon: "🔗",
        title: "Link",
        command: () => this.toggleLink(),
      },
      {
        name: "image",
        icon: "🖼️",
        title: "Image",
        command: () => this.insertImage(),
      },
    ];

    // Create button groups
    this.createButtonGroup(toolbar, "Format", formatButtons);
    this.createSeparator(toolbar);
    this.createButtonGroup(toolbar, "Headings", headingButtons);
    this.createSeparator(toolbar);
    this.createButtonGroup(toolbar, "Lists", listButtons);
    this.createSeparator(toolbar);
    this.createButtonGroup(toolbar, "Table", tableButtons);
    this.createSeparator(toolbar);
    this.createButtonGroup(toolbar, "Other", otherButtons);
  }

  /**
   * Create button group
   */
  createButtonGroup(toolbar, groupName, buttons) {
    buttons.forEach((button) => {
      const btn = document.createElement("button");
      btn.className = `tiptap-btn tiptap-btn-${button.name}`;
      btn.innerHTML = button.icon;
      btn.title = button.title;
      btn.type = "button";
      // Button styles handled by CSS file

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        button.command();
        this.updateToolbarState();
      });

      toolbar.appendChild(btn);
    });
  }

  /**
   * Create separator
   */
  createSeparator(toolbar) {
    const separator = document.createElement("div");
    separator.className = "tiptap-toolbar-separator";
    toolbar.appendChild(separator);
  }

  /**
   * Insert table
   */
  insertTable() {
    this.editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  /**
   * Toggle link
   */
  toggleLink() {
    const previousUrl = this.editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      this.editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    this.editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  /**
   * Insert image
   */
  insertImage() {
    const url = window.prompt("Image URL");

    if (url) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }

  /**
   * Update toolbar state based on current selection
   */
  updateToolbarState() {
    const toolbar = this.toolbarElement;

    // Update button states based on current formatting
    const buttons = toolbar.querySelectorAll(".tiptap-btn");
    buttons.forEach((btn) => {
      const btnName = btn.className.match(/tiptap-btn-(\w+)/)?.[1];
      if (btnName) {
        const isActive = this.isFormatActive(btnName);
        btn.style.background = isActive ? "#3b82f6" : "white";
        btn.style.color = isActive ? "white" : "black";
      }
    });
  }

  /**
   * Check if format is active
   */
  isFormatActive(format) {
    switch (format) {
      case "bold":
        return this.editor.isActive("bold");
      case "italic":
        return this.editor.isActive("italic");
      case "underline":
        return this.editor.isActive("underline");
      case "strike":
        return this.editor.isActive("strike");
      case "h1":
        return this.editor.isActive("heading", { level: 1 });
      case "h2":
        return this.editor.isActive("heading", { level: 2 });
      case "h3":
        return this.editor.isActive("heading", { level: 3 });
      case "bulletList":
        return this.editor.isActive("bulletList");
      case "orderedList":
        return this.editor.isActive("orderedList");
      case "blockquote":
        return this.editor.isActive("blockquote");
      case "codeBlock":
        return this.editor.isActive("codeBlock");
      case "link":
        return this.editor.isActive("link");
      default:
        return false;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.editor) return;

    // Update toolbar state on selection change
    this.editor.on("selectionUpdate", () => {
      this.updateToolbarState();
    });

    console.log("✅ TipTap event listeners setup");
  }

  /**
   * Handle content change
   */
  onContentChange(editor) {
    const event = new CustomEvent("tipTapTextChange", {
      detail: {
        html: this.getHTML(),
        text: this.getText(),
        json: this.getJSON(),
      },
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Handle selection change
   */
  onSelectionChange(editor) {
    const event = new CustomEvent("tipTapSelectionChange", {
      detail: {
        selection: editor.state.selection,
      },
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Get editor content as HTML
   */
  getHTML() {
    return this.editor ? this.editor.getHTML() : "";
  }

  /**
   * Get editor content as plain text
   */
  getText() {
    return this.editor ? this.editor.getText() : "";
  }

  /**
   * Get editor content as JSON
   */
  getJSON() {
    return this.editor ? this.editor.getJSON() : null;
  }

  /**
   * Set editor content from HTML
   */
  setHTML(html) {
    if (this.editor && html) {
      console.log("🎨 Setting HTML content in TipTap:", html.substring(0, 500));
      // Use setContent with parseOptions to preserve custom attributes
      this.editor.commands.setContent(html, false, {
        preserveWhitespace: "full",
      });
      console.log("✅ HTML content set in TipTap editor");

      // Debug: Check what HTML was actually rendered
      const renderedHTML = this.editor.getHTML();
      console.log(
        "🔍 Rendered HTML from TipTap:",
        renderedHTML.substring(0, 500)
      );
    }
  }

  /**
   * Set editor content from JSON
   */
  setJSON(json) {
    if (this.editor && json) {
      this.editor.commands.setContent(json);
      console.log("✅ JSON content set in TipTap editor");
    }
  }

  /**
   * Clear editor content
   */
  clear() {
    if (this.editor) {
      this.editor.commands.clearContent();
    }
  }

  /**
   * Focus the editor
   */
  focus() {
    if (this.editor) {
      this.editor.commands.focus();
    }
  }

  /**
   * Check if editor is ready
   */
  isReady() {
    return this.isInitialized && this.editor !== null;
  }

  /**
   * Destroy the editor
   */
  destroy() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    if (this.container) {
      this.container.innerHTML = "";
    }

    this.isInitialized = false;
    console.log("🗑️ TipTap Rich Text Editor destroyed");
  }
}
