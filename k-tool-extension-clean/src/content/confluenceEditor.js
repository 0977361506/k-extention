// Confluence Content Editor with Rich Text Editing
// Handles editing interface when Confluence content is returned from API

class ConfluenceEditor {
  constructor() {
    this.isEditorOpen = false;
    this.currentContent = null;
    this.originalContent = null;
    this.mermaidDiagrams = [];
    this.editorContainer = null;
    this.textEditor = null; // CodeMirror instance
    this.previewContainer = null;
    this.isPreviewMode = false;
    this.autoSaveTimer = null;
    this.isModified = false;
    // Zoom controls
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };
  }

  openEditor(content, options = {}) {
    if (this.isEditorOpen) {
      this.closeEditor();
    }

    console.log("📝 Opening Confluence Editor with content:", content);

    this.currentContent = content;
    this.originalContent = JSON.parse(JSON.stringify(content)); // Deep copy
    this.isEditorOpen = true;

    // Extract Mermaid diagrams from content
    this.extractMermaidDiagrams();

    // Create editor UI
    this.createEditorUI(options);

    // Initialize content tab (default)
    this.initializeContentTab();
  }

  createEditorUI(options = {}) {
    const overlay = document.createElement("div");
    overlay.className = "confluence-editor-overlay";

    overlay.innerHTML = `
      <div class="confluence-editor-container">
        <div class="confluence-editor-header">
          <h2 class="confluence-editor-title">
            📝 Chỉnh sửa nội dung Confluence
          </h2>
          <div class="confluence-editor-actions">
            <button class="editor-btn editor-btn-primary" id="editor-save-btn">
              💾 Lưu thay đổi
            </button>
            <button class="editor-btn editor-btn-secondary" id="editor-close-btn">
              ✕ Đóng
            </button>
          </div>
        </div>

        <div class="confluence-editor-tabs">
          <button class="confluence-editor-tab active" id="content-tab">
            📝 Chỉnh sửa nội dung
          </button>
          <button class="confluence-editor-tab" id="mermaid-tab">
            📊 Chỉnh sửa Mermaid
          </button>
        </div>

        <div class="confluence-editor-body">
          <!-- Content Tab -->
          <div class="tab-content active" id="content-tab-content">
            <div class="content-editor-layout">
              <!-- Raw XHTML Editor (Left) -->
              <div class="content-editor-pane">
                <div class="content-editor-header">
                  📝 Raw XHTML Content
                </div>
                <div class="content-editor-body">
                  <textarea class="raw-content-editor" id="raw-content-editor" placeholder="Raw XHTML content will appear here..."></textarea>
                </div>
              </div>

              <!-- Preview Pane (Right) -->
              <div class="content-preview-pane">
                <div class="content-editor-header">
                  👁️ Live Preview
                </div>
                <div class="content-editor-body">
                  <div class="content-preview" id="content-preview">
                    <!-- Preview content will be rendered here -->
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mermaid Tab -->
          <div class="tab-content" id="mermaid-tab-content">
            <div class="mermaid-editor-layout">
              <!-- Mermaid Code Editor (Left) -->
              <div class="mermaid-code-pane">
                <div class="mermaid-editor-header">
                  � Mermaid Code
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
                  📊 Diagram Preview
                  <div class="mermaid-zoom-controls">
                    <button class="zoom-btn" id="zoom-out" title="Zoom Out">−</button>
                    <div class="zoom-level" id="zoom-level">100%</div>
                    <button class="zoom-btn" id="zoom-in" title="Zoom In">+</button>
                    <button class="zoom-btn" id="zoom-reset" title="Reset Zoom">⌂</button>
                  </div>
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
                  <div class="ai-chat-container">
                    <div class="ai-chat-messages" id="ai-chat-messages">
                      <div class="ai-message">
                        <div class="ai-avatar">🤖</div>
                        <div class="ai-text">Hi! I can help you edit Mermaid diagrams. Select a diagram and ask me to modify it.</div>
                      </div>
                    </div>
                    <div class="ai-chat-input">
                      <input type="text" id="ai-prompt-input" placeholder="Describe how you want to modify the diagram..." />
                      <button id="ai-send-btn" class="ai-send-btn">Send</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.editorContainer = overlay;

    // Bind events
    this.bindEditorEvents();
  }

  bindEditorEvents() {
    if (!this.editorContainer) return;

    // Close button
    const closeBtn = this.editorContainer.querySelector("#editor-close-btn");
    closeBtn.addEventListener("click", () => this.closeEditor());

    // Save button
    const saveBtn = this.editorContainer.querySelector("#editor-save-btn");
    saveBtn.addEventListener("click", () => this.saveChanges());

    // Tab buttons
    const contentTab = this.editorContainer.querySelector("#content-tab");
    const mermaidTab = this.editorContainer.querySelector("#mermaid-tab");

    if (contentTab)
      contentTab.addEventListener("click", () => this.switchTab("content"));
    if (mermaidTab)
      mermaidTab.addEventListener("click", () => this.switchTab("mermaid"));

    // Content tab elements
    const rawEditor = this.editorContainer.querySelector("#raw-content-editor");
    if (rawEditor) {
      rawEditor.addEventListener("input", () => this.updateContentPreview());
    }

    // Mermaid tab elements
    const mermaidSelector =
      this.editorContainer.querySelector("#mermaid-selector");
    const mermaidCodeEditor = this.editorContainer.querySelector(
      "#mermaid-code-editor"
    );
    const aiSendBtn = this.editorContainer.querySelector("#ai-send-btn");
    const aiPromptInput =
      this.editorContainer.querySelector("#ai-prompt-input");

    if (mermaidSelector) {
      mermaidSelector.addEventListener("change", (e) =>
        this.selectMermaidDiagram(e.target.value)
      );
    }

    if (mermaidCodeEditor) {
      mermaidCodeEditor.addEventListener("input", () =>
        this.updateMermaidPreview()
      );
    }

    if (aiSendBtn) {
      aiSendBtn.addEventListener("click", () => this.sendAIPrompt());
    }

    if (aiPromptInput) {
      aiPromptInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendAIPrompt();
      });
    }

    // Zoom controls
    const zoomInBtn = this.editorContainer.querySelector("#zoom-in");
    const zoomOutBtn = this.editorContainer.querySelector("#zoom-out");
    const zoomResetBtn = this.editorContainer.querySelector("#zoom-reset");

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => this.zoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => this.zoomOut());
    }
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener("click", () => this.resetZoom());
    }

    // Add wheel zoom to mermaid preview
    const mermaidPreview =
      this.editorContainer.querySelector("#mermaid-preview");
    if (mermaidPreview) {
      mermaidPreview.addEventListener("wheel", (e) => this.handleWheel(e));
    }

    // Close on overlay click
    this.editorContainer.addEventListener("click", (e) => {
      if (e.target === this.editorContainer) {
        this.closeEditor();
      }
    });

    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        this.closeEditor();
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
  }

  // Switch between tabs
  switchTab(tabName) {
    // Update tab buttons
    const tabs = this.editorContainer.querySelectorAll(
      ".confluence-editor-tab"
    );
    tabs.forEach((tab) => tab.classList.remove("active"));

    const activeTab = this.editorContainer.querySelector(`#${tabName}-tab`);
    if (activeTab) activeTab.classList.add("active");

    // Update tab content
    const tabContents = this.editorContainer.querySelectorAll(".tab-content");
    tabContents.forEach((content) => content.classList.remove("active"));

    const activeContent = this.editorContainer.querySelector(
      `#${tabName}-tab-content`
    );
    if (activeContent) activeContent.classList.add("active");

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
    const rawEditor = this.editorContainer.querySelector("#raw-content-editor");
    if (rawEditor && this.currentContent) {
      // Get raw content and clean up ```xml markers
      let rawContent =
        this.currentContent.full_storage_format ||
        this.currentContent.content ||
        "";

      // Remove ```xml and ``` markers
      rawContent = rawContent.replace(/^```xml\s*\n?/gm, "");
      rawContent = rawContent.replace(/\n?```\s*$/gm, "");

      // Format for better readability
      rawContent = this.formatXHTML(rawContent);

      rawEditor.value = rawContent;
      this.updateContentPreview();
    }
  }

  // Initialize mermaid tab
  initializeMermaidTab() {
    this.extractMermaidDiagrams();
    this.populateMermaidSelector();
  }

  // Format XHTML for better readability with proper alignment

  formatXHTML(xmlString, indent = "    ") {
    // 1. Phân tích cú pháp chuỗi thành một cây DOM
    const parser = new DOMParser();

    // Bọc nội dung bằng một thẻ root tạm thời nếu nó chỉ là một fragment
    const rootTag = "xml-root-fragment";
    const wrappedXml = `<${rootTag}>${xmlString}</${rootTag}>`;

    const doc = parser.parseFromString(wrappedXml, "text/xml");

    // Kiểm tra lỗi phân tích cú pháp
    if (doc.getElementsByTagName("parsererror").length > 0) {
      console.error("Lỗi phân tích cú pháp XML/XHTML. Trả về chuỗi gốc.");
      return xmlString;
    }

    let output = "";
    let currentIndent = "";

    // Lấy thẻ root bọc ngoài (chỉ xử lý con của nó)
    const rootElement = doc.documentElement;

    /**
     * Hàm đệ quy để duyệt và xây dựng lại chuỗi
     * @param {Node} node - Node hiện tại
     * @param {string} level - Mức thụt lề hiện tại
     */
    function processNode(node, level) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE: // 1: Thẻ HTML/XML (ví dụ: <p>, <ac:structured-macro>)
          const nodeName = node.nodeName;

          // Bắt đầu thẻ (ví dụ: <p data="...">)
          let startTag = `<${nodeName}`;

          // Thêm thuộc tính
          if (node.attributes && node.attributes.length > 0) {
            for (let attr of node.attributes) {
              startTag += ` ${attr.name}="${attr.value}"`;
            }
          }
          startTag += ">";

          // Kiểm tra xem thẻ có con (trừ TextNode rỗng) hay không
          const hasSignificantChildren = Array.from(node.childNodes).some(
            (child) =>
              child.nodeType !== Node.TEXT_NODE ||
              child.textContent.trim().length > 0
          );

          if (!hasSignificantChildren) {
            // Xử lý thẻ tự đóng hoặc thẻ rỗng (ví dụ: <br />)
            // Lưu ý: Trong XHTML, thẻ <tag></tag> là phổ biến hơn <tag />
            // Ở đây ta sử dụng logic thông thường: Thẻ mở, thẻ đóng trên cùng dòng
            output += `${level}${startTag.replace(">", "/>")}\n`;
          } else {
            // Thẻ mở trên dòng mới
            output += `${level}${startTag}\n`;

            // Tăng mức thụt lề và xử lý con
            const nextLevel = level + indent;
            Array.from(node.childNodes).forEach((child) =>
              processNode(child, nextLevel)
            );

            // Thẻ đóng trên dòng mới với mức thụt lề cũ
            output += `${level}</${nodeName}>\n`;
          }
          break;

        case Node.TEXT_NODE: // 3: Nội dung văn bản
          const text = node.textContent.trim();
          if (text.length > 0) {
            // Xử lý văn bản thuần túy (ví dụ: nội dung bên trong <p>)
            // Nếu nó là văn bản thuần túy, ta thêm nó vào dòng hiện tại hoặc trên dòng mới
            output += `${level}${text}\n`;
          }
          break;

        case Node.COMMENT_NODE: // 8: Comment (ví dụ: )
          output += `${level}\n`;
          break;

        case Node.CDATA_SECTION_NODE: // 4: CDATA Section (An toàn cho code trong <ac:parameter>)
          // Đây là trường hợp quan trọng nhất cho nội dung Mermaid
          output += `${level}<![CDATA[${node.textContent}]]>\n`;
          break;

        // Bạn có thể thêm các case khác như DOCUMENT_TYPE_NODE, PROCESSING_INSTRUCTION_NODE nếu cần
      }
    }

    // Bắt đầu xử lý từ các con của thẻ root tạm thời
    Array.from(rootElement.childNodes).forEach((node) =>
      processNode(node, currentIndent)
    );

    return output.trim();
  }

  isSelfClosingTag(tag) {
    const selfClosing = [
      "br",
      "hr",
      "img",
      "input",
      "meta",
      "link",
      "source",
      "track",
      "wbr",
    ];
    return selfClosing.some((t) => tag.startsWith(`<${t}`));
  }

  // Update content preview
  updateContentPreview() {
    const rawEditor = this.editorContainer.querySelector("#raw-content-editor");
    const preview = this.editorContainer.querySelector("#content-preview");

    if (!rawEditor || !preview) return;

    const content = rawEditor.value;

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

    // Render preview (similar to existing preview logic)
    this.renderContentPreview(content, preview);
  }

  // Render content preview
  renderContentPreview(content, previewElement) {
    // Convert basic HTML with better styling first
    let processedContent = content
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

    // Set the processed content to preview element
    previewElement.innerHTML = processedContent;

    // Render Mermaid diagrams using the comprehensive logic from content.js
    this.renderMermaidDiagramsInPreview();
  }

  // Load Mermaid script dynamically (copied from content.js)
  async loadMermaidScript() {
    if (window.mermaid) {
      console.log("⚡ Mermaid already loaded");
      return window.mermaid;
    }

    const res = await fetch(chrome.runtime.getURL("lib/mermaid.min.js"));
    const text = await res.text();
    eval(text); // UMD sẽ gắn mermaid vào window
    console.log("✅ Mermaid loaded dynamically");
    return window.mermaid;
  }

  // Initialize Mermaid diagrams (copied from content.js logic)
  async initializeMermaidInPreview() {
    try {
      // Load Mermaid if not already loaded
      await this.loadMermaidScript();

      console.log("🎨 Initializing Mermaid diagrams in preview...");

      // Configure Mermaid with proper DOM context
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "Arial, sans-serif",
        // Ensure proper DOM context
        htmlLabels: true,
        flowchart: {
          htmlLabels: true,
        },
        // Set the document context explicitly
        deterministicIds: true,
        deterministicIDSeed: "mermaid-diagram-preview",
      });

      // Ensure mermaid has access to document
      if (window.mermaid.setConfig) {
        window.mermaid.setConfig({
          securityLevel: "loose",
          theme: "default",
        });
      }

      // Find all mermaid code blocks in the preview
      const previewDiv = this.editorContainer.querySelector("#content-preview");
      if (!previewDiv) return;

      // Look for Confluence Mermaid structured macros
      const mermaidElements = previewDiv.querySelectorAll(
        'ac\\:structured-macro[ac\\:name="mermaid"]'
      );

      mermaidElements.forEach((element, index) => {
        // Get the code parameter from Confluence structured macro
        const codeParam = element.querySelector(
          'ac\\:parameter[ac\\:name="code"]'
        );
        if (!codeParam) {
          console.warn("⚠️ Mermaid macro found but no code parameter");
          return;
        }

        const mermaidCode = (
          codeParam.textContent || codeParam.innerText
        ).trim();
        console.log(
          "🔍 Found Confluence Mermaid diagram:",
          mermaidCode.substring(0, 50) + "..."
        );

        // Always process Confluence mermaid macros (no need to check syntax)
        if (mermaidCode) {
          // Create a new div for the mermaid diagram
          const mermaidDiv = document.createElement("div");
          mermaidDiv.className = "mermaid-diagram";
          mermaidDiv.id = `preview-mermaid-${index}`;
          mermaidDiv.style.cssText =
            "margin: 20px 0; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;";

          // Replace the original element
          element.parentNode.replaceChild(mermaidDiv, element);

          // Render the diagram with proper DOM context
          try {
            const diagramId = `preview-mermaid-svg-${index}`;

            // Create a temporary container in the document to ensure proper DOM context
            const tempContainer = document.createElement("div");
            tempContainer.style.position = "absolute";
            tempContainer.style.left = "-9999px";
            tempContainer.style.top = "-9999px";
            document.body.appendChild(tempContainer);

            // Modern mermaid.render returns a promise
            if (
              window.mermaid.render &&
              typeof window.mermaid.render === "function"
            ) {
              try {
                // Try modern API first
                const renderResult = window.mermaid.render(
                  diagramId,
                  mermaidCode
                );

                if (renderResult && typeof renderResult.then === "function") {
                  // Promise-based API
                  renderResult
                    .then((result) => {
                      // Clean up temp container
                      if (document.body.contains(tempContainer)) {
                        document.body.removeChild(tempContainer);
                      }

                      // Handle different return formats
                      let svgCode;
                      if (typeof result === "string") {
                        svgCode = result;
                      } else if (result && result.svg) {
                        svgCode = result.svg;
                      } else {
                        svgCode = String(result);
                      }

                      mermaidDiv.innerHTML = svgCode;
                      console.log(
                        "✅ Preview Mermaid diagram rendered successfully (promise API)"
                      );
                    })
                    .catch((error) => {
                      // Clean up temp container
                      if (document.body.contains(tempContainer)) {
                        document.body.removeChild(tempContainer);
                      }
                      console.error(
                        "❌ Preview Mermaid render error (promise API):",
                        error
                      );
                      this.showMermaidError(mermaidDiv, mermaidCode, error);
                    });
                } else {
                  // Synchronous return or callback-based API
                  if (typeof renderResult === "string") {
                    // Clean up temp container
                    if (document.body.contains(tempContainer)) {
                      document.body.removeChild(tempContainer);
                    }
                    mermaidDiv.innerHTML = renderResult;
                    console.log(
                      "✅ Preview Mermaid diagram rendered successfully (sync API)"
                    );
                  } else {
                    // Try callback-based API
                    window.mermaid.render(diagramId, mermaidCode, (svgCode) => {
                      // Clean up temp container
                      if (document.body.contains(tempContainer)) {
                        document.body.removeChild(tempContainer);
                      }
                      mermaidDiv.innerHTML = svgCode;
                      console.log(
                        "✅ Preview Mermaid diagram rendered successfully (callback API)"
                      );
                    });
                  }
                }
              } catch (renderError) {
                // Clean up temp container
                if (document.body.contains(tempContainer)) {
                  document.body.removeChild(tempContainer);
                }
                throw renderError;
              }
            } else {
              throw new Error("Mermaid render function not available");
            }
          } catch (error) {
            console.error("❌ Preview Mermaid render error:", error);
            this.showMermaidError(mermaidDiv, mermaidCode, error);
          }
        }
      });
    } catch (error) {
      console.error("❌ Failed to initialize Mermaid in preview:", error);
    }
  }

  // Show Mermaid error in a nice format (copied from content.js)
  showMermaidError(container, text, error) {
    container.innerHTML = `
      <div style="color: #dc3545; padding: 15px; background: #f8d7da; border-radius: 8px; border: 1px solid #f5c6cb; font-family: Arial, sans-serif;">
        <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">⚠️</span>
          Mermaid Render Error
        </div>
        <div style="font-size: 12px; color: #721c24; margin-bottom: 10px;">
          ${error.message || "Unknown error occurred"}
        </div>
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; font-size: 12px; color: #495057;">Show diagram code</summary>
          <pre style="margin: 8px 0 0 0; padding: 8px; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; font-size: 11px; overflow-x: auto; white-space: pre-wrap;">${text}</pre>
        </details>
      </div>
    `;
  }

  // Render Mermaid diagrams in preview (updated to use new logic)
  renderMermaidDiagramsInPreview() {
    // Use the new comprehensive Mermaid initialization
    setTimeout(() => {
      this.initializeMermaidInPreview();
    }, 100);
  }

  // Populate mermaid selector using Map
  populateMermaidSelector() {
    const selector = this.editorContainer.querySelector("#mermaid-selector");
    if (!selector) {
      console.error("❌ Mermaid selector not found");
      return;
    }

    // Clear existing options
    selector.innerHTML =
      '<option value="">📊 Select diagram to edit...</option>';

    // Add diagram options from Map
    if (this.mermaidDiagramsMap && this.mermaidDiagramsMap.size > 0) {
      this.mermaidDiagramsMap.forEach((diagramData, diagramId) => {
        const option = document.createElement("option");
        option.value = diagramId;
        option.textContent = `${diagramData.title} (${diagramData.type})`;
        selector.appendChild(option);
      });
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
          // Update diagram code in memory (both array and map)
          this.currentSelectedDiagram.code = codeEditor.value;
          this.mermaidDiagramsMap.get(this.currentSelectedDiagramId).content =
            codeEditor.value;
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
    const messagesContainer =
      this.editorContainer.querySelector("#ai-chat-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = "ai-message";

    const avatar = type === "user" ? "👤" : "🤖";
    const bgColor = type === "user" ? "#e5e7eb" : "#3b82f6";

    messageDiv.innerHTML = `
      <div class="ai-avatar" style="background: ${bgColor};">${avatar}</div>
      <div class="ai-text">${text}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  extractMermaidDiagrams() {
    this.mermaidDiagrams = [];
    this.mermaidDiagramsMap = new Map();

    if (!this.currentContent?.full_storage_format) return;

    const content = this.currentContent.full_storage_format;

    // Regex để tìm tất cả <ac:structured-macro ...> ... </ac:structured-macro>
    const macroRegex =
      /<ac:structured-macro[^>]*ac:name="(mermaid|code)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi;

    let match;
    let index = 0;

    while ((match = macroRegex.exec(content)) !== null) {
      const macroName = match[1];
      const macroContent = match[2];

      // Kiểm tra code parameter
      const codeMatch = macroContent.match(
        /<ac:parameter[^>]*ac:name="code">([\s\S]*?)<\/ac:parameter>/
      );
      if (!codeMatch) continue;

      const code = codeMatch[1].trim();
      if (!code) continue;

      // Nếu là code macro, check language
      if (macroName === "code") {
        const langMatch = macroContent.match(
          /<ac:parameter[^>]*ac:name="language">([\s\S]*?)<\/ac:parameter>/
        );
        if (!langMatch || langMatch[1].trim() !== "mermaid") continue;
      }

      const type = this.detectMermaidType
        ? this.detectMermaidType(code)
        : "graph";
      const diagramId = `mermaid-diagram-${index}`;

      const diagramRecord = {
        id: diagramId,
        code: code,
        originalCode: code,
        originalMatch: match[0],
        index: index,
        type: type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Diagram ${
          index + 1
        }`,
      };

      this.mermaidDiagrams.push(diagramRecord);
      this.mermaidDiagramsMap.set(diagramId, {
        content: code,
        type: type,
        index: index,
        title: diagramRecord.title,
      });

      console.log(`✅ Extracted diagram ${index}:`, {
        type,
        code: code.substring(0, 50) + "...",
      });

      index++;
    }

    console.log("🎨 Extracted Mermaid diagrams:", this.mermaidDiagrams);
  }

  // Detect Mermaid diagram type
  detectMermaidType(code) {
    const firstLine = code.trim().split("\n")[0].toLowerCase();
    if (firstLine.includes("graph")) return "graph";
    if (firstLine.includes("flowchart")) return "flowchart";
    if (firstLine.includes("sequencediagram")) return "sequence";
    if (firstLine.includes("classDiagram")) return "class";
    if (firstLine.includes("stateDiagram")) return "state";
    if (firstLine.includes("erDiagram")) return "er";
    if (firstLine.includes("gantt")) return "gantt";
    if (firstLine.includes("pie")) return "pie";
    return "graph";
  }

  editMermaidDiagram(diagramId) {
    const diagram = this.mermaidDiagrams.find((d) => d.id === diagramId);
    if (!diagram) return;

    console.log("✏️ Editing Mermaid diagram:", diagramId);

    // TODO: Open Mermaid editor popup
    // This could integrate with the ImageAIEditor for AI-powered editing
    const newCode = prompt("Edit Mermaid code:", diagram.code);
    if (newCode && newCode !== diagram.code) {
      diagram.code = newCode;
      // Update the content directly
      this.currentContent.full_storage_format =
        this.currentContent.full_storage_format.replace(
          diagram.originalMatch,
          diagram.originalMatch.replace(diagram.originalCode, newCode)
        );
      this.updateStatus("Đã cập nhật diagram");
    }
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

  saveChanges() {
    console.log("💾 Saving changes...");

    try {
      // Sync content from raw editor
      this.syncContentFromRawEditor();

      // Sync Mermaid changes back to content
      this.syncMermaidChangesToContent();

      // Call save callback with updated content
      if (this.onSave) {
        this.onSave(this.currentContent);
      }

      // Reset modified state and update button
      this.isModified = false;
      this.updateSaveButtonState();

      this.updateStatus("Đã lưu thay đổi");
      console.log("✅ Changes saved successfully");

      // Optionally close editor after save
      setTimeout(() => {
        this.closeEditor();
      }, 1000);
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      this.updateStatus("Lỗi khi lưu thay đổi");
    }
  }

  // Sync content from raw editor
  syncContentFromRawEditor() {
    const rawEditor = this.editorContainer.querySelector("#raw-content-editor");
    if (rawEditor && rawEditor.value) {
      // Update full_storage_format with raw editor content
      this.currentContent.full_storage_format = rawEditor.value;
      console.log("📝 Synced content from raw editor");
    }
  }

  // Sync Mermaid changes back to content
  syncMermaidChangesToContent() {
    if (!this.mermaidDiagrams || this.mermaidDiagrams.length === 0) return;

    let content =
      this.currentContent.full_storage_format ||
      this.currentContent.content ||
      "";

    // Update each modified diagram in the content
    this.mermaidDiagrams.forEach((diagram) => {
      if (diagram.originalCode !== diagram.code) {
        // Find and replace the diagram code in content
        const oldPattern = new RegExp(
          `(<ac:plain-text-body><\\!\\[CDATA\\[\\s*)(${this.escapeRegex(
            diagram.originalCode
          )})(\\s*\\]\\]></ac:plain-text-body>)`,
          "g"
        );

        content = content.replace(oldPattern, `$1${diagram.code}$3`);
        console.log(`📊 Updated diagram ${diagram.id} in content`);
      }
    });

    // Update the content
    this.currentContent.full_storage_format = content;
    if (this.currentContent.content) {
      this.currentContent.content = content;
    }

    console.log("📊 Synced all Mermaid changes to content");
  }

  // Escape regex special characters
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Update save button state based on modifications
  updateSaveButtonState() {
    const saveBtn = this.editorContainer.querySelector("#editor-save-btn");
    if (!saveBtn) return;

    if (this.isModified) {
      saveBtn.innerHTML = "💾 Lưu thay đổi *";
      saveBtn.style.background = "#28a745";
      saveBtn.title = "Có thay đổi chưa lưu";
    } else {
      saveBtn.innerHTML = "💾 Lưu thay đổi";
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
    const preview = this.editorContainer.querySelector("#mermaid-preview");
    const zoomLevel = this.editorContainer.querySelector("#zoom-level");

    if (preview) {
      const mermaidContent = preview.querySelector(".mermaid, svg");
      if (mermaidContent) {
        mermaidContent.style.transform = `scale(${this.currentZoom}) translate(${this.dragOffset.x}px, ${this.dragOffset.y}px)`;
        mermaidContent.style.transformOrigin = "center center";
        mermaidContent.style.transition = "transform 0.2s ease";
      }
    }

    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.currentZoom * 100)}%`;
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
    if (this.editorContainer) {
      this.editorContainer.remove();
      this.editorContainer = null;
    }

    this.isEditorOpen = false;
    this.currentContent = null;
    this.originalContent = null;
    this.mermaidDiagrams = [];
    this.isModified = false;

    // Reset zoom state
    this.currentZoom = 1;
    this.dragOffset = { x: 0, y: 0 };

    console.log("📝 Confluence Editor closed");
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
