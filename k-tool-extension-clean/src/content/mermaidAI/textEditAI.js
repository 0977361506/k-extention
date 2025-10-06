// Text Edit AI Service for K-Tool Extension

export class TextEditAI {
  constructor() {
    this.isPopupOpen = false;
    this.selectedText = "";
    this.selectedElement = null;
    this.selectedDocument = document; // Track which document the selection came from
    this.editButton = null;

    console.log("🚀 TextEditAI initializing...");
    this.init();
  }

  async init() {
    console.log("🚀 TextEditAI initializing...");

    // Check if already injected
    if (document.getElementById("text-edit-ai-root")) {
      console.log("🔍 TextEditAI already injected, skipping...");
      return;
    }

    // Load CSS
    this.loadCSS();

    // Create popup UI
    this.createPopupUI();

    // Setup text selection detection
    this.setupTextSelectionDetection();

    console.log("✅ TextEditAI ready");
  }

  loadCSS() {
    // Skip external CSS loading - we use inline CSS now
    console.log("📄 CSS: Using inline CSS instead of external file");
  }

  setupTextSelectionDetection() {
    console.log("🔍 Setting up text selection detection...");

    // Listen for text selection events on main document
    this.attachSelectionListeners(document);

    // Also listen for iframe events
    this.setupIframeSelectionListeners();

    // Global click handler for hiding edit button only
    document.addEventListener("click", (e) => {
      // Hide edit button when clicking elsewhere (but not on popup)
      if (
        !e.target.closest(".text-edit-button") &&
        !e.target.closest("#text-edit-ai-popup")
      ) {
        this.hideEditButton();
      }
    });
  }

  attachSelectionListeners(doc) {
    const docType = doc === document ? "main document" : "iframe document";
    console.log(`🎯 LISTENERS: Attaching selection listeners to ${docType}`);
    console.log(`🎯 LISTENERS: Document title:`, doc.title || "no title");
    console.log(`🎯 LISTENERS: Document URL:`, doc.URL || "no URL");

    // Remove existing listeners if any (prevent duplicates)
    if (doc._textEditListenersAttached) {
      console.log(`⚠️ LISTENERS: ${docType} already has listeners, skipping`);
      return;
    }

    const mouseupHandler = (e) => {
      console.log(`🖱️ MOUSEUP: Event fired in ${docType}`);
      this.handleTextSelection(e, doc);
    };

    const keyupHandler = (e) => {
      // Handle keyboard selection (Shift + Arrow keys, Ctrl+A, etc.)
      if (e.shiftKey || e.ctrlKey) {
        console.log(`⌨️ KEYUP: Selection event fired in ${docType}`, e.key);
        this.handleTextSelection(e, doc);
      }
    };

    // Use capture=true for better event handling (like mermaidAIChat)
    doc.addEventListener("mouseup", mouseupHandler, true);
    doc.addEventListener("keyup", keyupHandler, true);

    // Mark as attached to prevent duplicates
    doc._textEditListenersAttached = true;
    doc._textEditMouseupHandler = mouseupHandler;
    doc._textEditKeyupHandler = keyupHandler;

    console.log(`✅ LISTENERS: Selection listeners attached to ${docType}`);
  }

  setupIframeSelectionListeners() {
    console.log("🔍 Setting up iframe selection listeners...");

    // Find existing iframes
    this.refreshIframeListeners();

    // Setup Confluence page change detection like mermaidAIChat
    this.setupConfluencePageChangeDetection();

    // Watch for new iframes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "IFRAME") {
              this.attachToIframe(node);
            }
            // Also check for iframes inside added nodes
            const iframes =
              node.querySelectorAll && node.querySelectorAll("iframe");
            if (iframes) {
              iframes.forEach((iframe) => this.attachToIframe(iframe));
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupConfluencePageChangeDetection() {
    console.log(
      "🔍 PAGE CHANGE: Setting up Confluence page change detection..."
    );

    // Method 1: Listen for Confluence-specific events
    if (window.AJS && AJS.bind) {
      // Editor events
      AJS.bind("init.rte", () => {
        console.log(
          "🔄 PAGE CHANGE: Confluence RTE initialized - re-setting up iframe listeners"
        );
        setTimeout(() => this.refreshIframeListeners(), 1000);
      });

      AJS.bind("rte-ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Confluence RTE ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.refreshIframeListeners(), 1000);
      });

      // Page events
      AJS.bind("page.edit.ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Page edit ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.refreshIframeListeners(), 1500);
      });

      AJS.bind("page.view.ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Page view ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.refreshIframeListeners(), 1000);
      });
    }

    // Method 2: Watch for URL changes (SPA navigation)
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        console.log(
          "🔄 PAGE CHANGE: URL changed from",
          currentUrl,
          "to",
          window.location.href
        );
        currentUrl = window.location.href;

        // Re-setup after URL change
        setTimeout(() => {
          console.log(
            "🔄 PAGE CHANGE: Re-setting up iframe listeners after URL change"
          );
          this.refreshIframeListeners();
        }, 2000);
      }
    };

    setInterval(checkUrlChange, 1000);

    console.log(
      "✅ PAGE CHANGE: Confluence page change detection setup completed"
    );
  }

  refreshIframeListeners() {
    // Tìm tất cả iframes hiện tại
    const iframes = document.querySelectorAll("iframe");
    console.log("🔍 IFRAME REFRESH: Found", iframes.length, "iframes");

    if (iframes.length === 0) {
      console.log("⚠️ IFRAME REFRESH: No iframes found on page");
      console.log(
        "⚠️ IFRAME REFRESH: Document ready state:",
        document.readyState
      );

      // Try again after a delay
      setTimeout(() => {
        console.log("🔍 IFRAME REFRESH: Retrying iframe search after delay...");
        const retryIframes = document.querySelectorAll("iframe");
        console.log(
          "🔍 IFRAME REFRESH: Retry found",
          retryIframes.length,
          "iframes"
        );
        if (retryIframes.length > 0) {
          retryIframes.forEach((iframe, index) => {
            console.log(
              `🔍 IFRAME REFRESH RETRY ${index}: Processing iframe:`,
              iframe.src || iframe.id || "no-src"
            );
            this.attachToIframe(iframe, `refresh-retry-${index}`);
          });
        }
      }, 1000);
    } else {
      iframes.forEach((iframe, index) => {
        console.log(
          `🔍 IFRAME REFRESH ${index}: Processing iframe:`,
          iframe.src || iframe.id || "no-src"
        );
        this.attachToIframe(iframe, `refresh-${index}`);
      });
    }
  }

  attachToExistingIframes() {
    // This method is now replaced by refreshIframeListeners
    // Keep for backward compatibility but delegate to the new method
    this.refreshIframeListeners();
  }

  attachToIframe(iframe, id = "new") {
    try {
      // Skip if already attached
      if (iframe.dataset.textEditListenerAttached === "true") {
        console.log(`⏭️ Iframe ${id} already has listeners attached`);
        return;
      }

      console.log(
        `🔍 IFRAME ${id}: Attaching to iframe:`,
        iframe.src || iframe.id || iframe.className || "no-identifier"
      );

      const attachListeners = () => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document;

          if (!iframeDoc) {
            console.log(
              `⚠️ IFRAME ${id}: Cannot access iframe document (cross-origin or not loaded)`
            );
            return false;
          }

          console.log(
            `✅ IFRAME ${id}: Document accessible, ready state:`,
            iframeDoc.readyState
          );
          console.log(`✅ IFRAME ${id}: Document URL:`, iframeDoc.URL);
          console.log(`✅ IFRAME ${id}: Document body:`, !!iframeDoc.body);

          // Wait for body to be available
          if (!iframeDoc.body) {
            console.log(`⏳ IFRAME ${id}: Body not ready, waiting...`);
            setTimeout(() => attachListeners(), 100);
            return false;
          }

          console.log(
            `🎯 IFRAME ${id}: Attaching selection listeners to iframe document`
          );

          // Selection handlers: Handle text selection events in iframe
          const mouseupHandler = (event) => {
            console.log(`🖱️ IFRAME ${id} MOUSEUP: Event fired in iframe`);
            this.handleTextSelection(event, iframeDoc);
          };

          const keyupHandler = (event) => {
            // Handle keyboard selection (Shift + Arrow keys, Ctrl+A, etc.)
            if (event.shiftKey || event.ctrlKey) {
              console.log(
                `⌨️ IFRAME ${id} KEYUP: Selection event fired in iframe`,
                event.key
              );
              this.handleTextSelection(event, iframeDoc);
            }
          };

          // Remove existing listeners if any
          if (iframeDoc.textEditMouseupHandler) {
            iframeDoc.removeEventListener(
              "mouseup",
              iframeDoc.textEditMouseupHandler,
              true
            );
          }
          if (iframeDoc.textEditKeyupHandler) {
            iframeDoc.removeEventListener(
              "keyup",
              iframeDoc.textEditKeyupHandler,
              true
            );
          }

          // Add new listeners with capture=true to catch events early
          iframeDoc.addEventListener("mouseup", mouseupHandler, true);
          iframeDoc.addEventListener("keyup", keyupHandler, true);

          // Store references to remove later if needed
          iframeDoc.textEditMouseupHandler = mouseupHandler;
          iframeDoc.textEditKeyupHandler = keyupHandler;
          iframeDoc._textEditListenersAttached = true;

          // Mark iframe as attached
          iframe.dataset.textEditListenerAttached = "true";
          console.log(
            `✅ IFRAME ${id}: Selection listeners attached successfully`
          );
          return true;
        } catch (e) {
          console.log(
            `❌ IFRAME ${id}: Error accessing iframe content:`,
            e.message
          );
          return false;
        }
      };

      // Remove existing load listener if any (like mermaidAIChat)
      if (iframe.textEditLoadHandler) {
        iframe.removeEventListener("load", iframe.textEditLoadHandler);
      }

      // Create load handler
      const loadHandler = () => {
        console.log(`🔍 IFRAME ${id}: Iframe loaded, attaching listeners...`);
        setTimeout(attachListeners, 100); // Small delay to ensure DOM is ready
      };

      // Add load listener
      iframe.addEventListener("load", loadHandler);
      iframe.textEditLoadHandler = loadHandler;

      // If iframe is already loaded, call handler immediately
      if (
        iframe.contentDocument &&
        iframe.contentDocument.readyState === "complete"
      ) {
        console.log(`� IFRAME ${id}: Already loaded, attaching immediately`);
        loadHandler();
      } else {
        console.log(`⏳ IFRAME ${id}: Waiting for iframe to load...`);
      }
    } catch (error) {
      console.log(
        `❌ IFRAME ${id}: Error setting up iframe listener:`,
        error.message
      );
    }
  }

  handleTextSelection(_e, doc = document) {
    const docType = doc === document ? "main document" : "iframe document";
    console.log(`🔍 SELECTION: Handling text selection in ${docType}`);

    // Small delay to ensure selection is complete
    setTimeout(() => {
      try {
        // Get selection from the appropriate document/window
        const selection =
          doc === document ? window.getSelection() : doc.getSelection();

        if (!selection) {
          console.log(`⚠️ SELECTION: No selection API available in ${docType}`);
          return;
        }

        const selectedText = selection.toString().trim();
        console.log(
          `📝 SELECTION: Selected text length: ${selectedText.length} in ${docType}`
        );

        if (selectedText.length > 0) {
          console.log(
            `📝 SELECTION: Text selected: "${selectedText.substring(0, 50)}${
              selectedText.length > 50 ? "..." : ""
            }"`
          );

          // Check if we're in Confluence edit mode
          const isEditMode = this.isInConfluenceEditMode();
          console.log(`📝 SELECTION: Edit mode check result:`, isEditMode);

          if (isEditMode) {
            console.log(
              `✅ SELECTION: In edit mode, showing button for ${docType} selection`
            );

            this.selectedText = selectedText;
            this.selectedElement = selection.getRangeAt(0);
            this.selectedDocument = doc; // Store which document the selection came from
            this.showEditButton();
          } else {
            console.log(`❌ SELECTION: Not in edit mode, hiding button`);
            this.hideEditButton();
          }
        } else {
          console.log(
            `📝 SELECTION: No text selected in ${docType}, hiding button`
          );
          this.hideEditButton();
        }
      } catch (error) {
        console.error(
          `❌ SELECTION: Error handling selection in ${docType}:`,
          error
        );
      }
    }, 100);
  }

  isInConfluenceEditMode() {
    // Check various indicators that we're in Confluence edit mode
    const editIndicators = [
      // Confluence editor iframe
      document.querySelector('iframe[id*="editor"]'),
      // Edit mode class on body
      document.body.classList.contains("edit-mode"),
      // Confluence editor toolbar
      document.querySelector(".confluence-editor-toolbar"),
      // Edit page URL pattern
      window.location.href.includes("/pages/editpage.action"),
      window.location.href.includes("/pages/resumedraft.action"),
      window.location.href.includes("mode=edit"),
      // TinyMCE editor
      document.querySelector(".mce-tinymce"),
      // Modern Confluence editor
      document.querySelector('[data-testid="editor"]'),
      // Confluence content editable areas
      document.querySelector('[contenteditable="true"]'),
      // Atlassian editor
      document.querySelector(".ak-editor-content-area"),
      // Legacy Confluence editor
      document.querySelector("#wysiwygTextarea_ifr"),
      // Check if we're inside an iframe that might be an editor
      window.parent !== window &&
        window.frameElement &&
        (window.frameElement.id.includes("editor") ||
          window.frameElement.src.includes("editor")),
    ];

    const isEditMode = editIndicators.some((indicator) => indicator);
    console.log("🔍 Confluence edit mode check:", isEditMode);
    return isEditMode;
  }

  showEditButton() {
    // Remove existing button
    this.hideEditButton();

    // Create edit button
    this.editButton = document.createElement("button");
    this.editButton.className = "text-edit-button";
    this.editButton.innerHTML = "✏️ Edit with AI";
    this.editButton.style.cssText = `
      position: absolute;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s;
    `;

    // Position button near the selection - get selection range for better positioning
    try {
      const doc = this.selectedDocument || document;
      const selection =
        doc === document ? window.getSelection() : doc.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate position relative to viewport
        let left = rect.left + rect.width / 2 - 60; // Center button on selection
        let top = rect.bottom + 5; // Position below selection

        // Adjust if button would go off screen
        const buttonWidth = 120;
        const buttonHeight = 32;

        if (left + buttonWidth > window.innerWidth) {
          left = window.innerWidth - buttonWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }

        if (top + buttonHeight > window.innerHeight) {
          top = rect.top - buttonHeight - 5; // Position above selection
        }

        this.editButton.style.left = left + "px";
        this.editButton.style.top = top + "px";

        console.log("📍 Button positioned at:", { left, top, rect });
      }
    } catch (error) {
      console.error("❌ Error positioning button:", error);
      // Fallback positioning
      this.editButton.style.left = "50px";
      this.editButton.style.top = "50px";
    }

    // Add hover effect
    this.editButton.addEventListener("mouseenter", () => {
      this.editButton.style.background = "#0052a3";
      this.editButton.style.transform = "scale(1.05)";
    });

    this.editButton.addEventListener("mouseleave", () => {
      this.editButton.style.background = "#0066cc";
      this.editButton.style.transform = "scale(1)";
    });

    // Add click handler
    this.editButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showEditPopup();
    });

    document.body.appendChild(this.editButton);
  }

  hideEditButton() {
    if (this.editButton) {
      this.editButton.remove();
      this.editButton = null;
    }
  }

  showEditPopup() {
    console.log("🔓 SHOW: Attempting to show popup...");

    // Ensure popup exists
    let popup = document.getElementById("text-edit-ai-popup");
    if (!popup) {
      console.log("🔧 SHOW: Popup not found, creating...");
      this.createPopupUI();
      popup = document.getElementById("text-edit-ai-popup");
      if (!popup) {
        console.error("❌ SHOW: Failed to create popup!");
        return;
      }
    }

    // Populate the selected text in the popup
    const selectedTextDisplay = document.getElementById(
      "selected-text-display"
    );
    if (selectedTextDisplay) {
      selectedTextDisplay.textContent = this.selectedText;
    }

    // Clear previous input
    const promptInput = document.getElementById("edit-prompt-input");
    if (promptInput) {
      promptInput.value = "";
    }

    // Position popup in center of screen
    popup.style.display = "flex";
    popup.style.visibility = "visible";
    popup.style.left = "50%";
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";

    this.isPopupOpen = true;
    console.log("✅ SHOW: Popup shown successfully");
    console.log("🔍 SHOW: isPopupOpen =", this.isPopupOpen);

    // Focus on input
    setTimeout(() => {
      if (promptInput) {
        promptInput.focus();
      }
    }, 100);

    // Hide edit button
    this.hideEditButton();
  }

  hideEditPopup() {
    console.log("🔒 HIDE: Attempting to hide popup...");
    const popup = document.getElementById("text-edit-ai-popup");

    if (popup) {
      popup.style.display = "none";
      this.isPopupOpen = false;
      console.log("✅ HIDE: Popup hidden successfully");
    } else {
      console.error("❌ HIDE: Popup element not found!");
    }

    console.log("🔍 HIDE: isPopupOpen =", this.isPopupOpen);
  }

  // Force close popup - emergency method
  forceClosePopup() {
    console.log("🚨 FORCE CLOSE: Emergency popup close...");
    const root = document.getElementById("text-edit-ai-root");
    if (root) {
      root.remove();
      console.log("🗑️ FORCE CLOSE: Root element removed");
    }
    this.isPopupOpen = false;
    console.log("✅ FORCE CLOSE: Popup force closed");
  }

  createPopupUI() {
    // Check if popup already exists
    const existingRoot = document.getElementById("text-edit-ai-root");
    if (existingRoot) {
      console.log("✅ Popup already exists, skipping creation");
      return;
    }

    console.log("🔧 Creating popup UI...");
    const root = document.createElement("div");
    root.id = "text-edit-ai-root";
    root.innerHTML = `
      <style>
        .text-edit-ai-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          max-width: 90vw;
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
          border: none;
          display: flex;
          flex-direction: column;
        }

        .text-edit-ai-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
        }

        .text-edit-ai-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .text-edit-ai-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .text-edit-ai-close:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .text-edit-ai-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          max-height: 70vh;
        }

        .selected-text-section {
          margin-bottom: 20px;
        }

        .selected-text-display {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          line-height: 1.5;
          color: #495057;
          max-height: 120px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .prompt-section {
          margin-bottom: 20px;
        }

        .prompt-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #495057;
          font-size: 14px;
        }
        .edit-prompt-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .edit-prompt-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .quick-action-btn {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #495057;
        }

        .quick-action-btn:hover {
          background: #e9ecef;
          border-color: #667eea;
          color: #667eea;
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }

        .edit-cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .edit-cancel-btn:hover {
          background: #5a6268;
        }

        .edit-send-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .edit-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .edit-send-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
        }
      </style>

      <div id="text-edit-ai-popup" class="text-edit-ai-popup" style="display: none;">
        <div class="text-edit-ai-header">
          <h3>✏️ Edit Text with AI</h3>
          <button class="text-edit-ai-close">&times;</button>
        </div>
        <div class="text-edit-ai-body">
          <div class="selected-text-section">
            <div id="selected-text-display" class="selected-text-display"></div>
          </div>

          <div class="prompt-section">
            <label for="edit-prompt-input">How would you like to edit this text?</label>
            <textarea
              id="edit-prompt-input"
              class="edit-prompt-input"
              placeholder="Enter your editing instructions..."
              rows="3"
            ></textarea>
          </div>

          <div class="edit-actions">
            <button id="edit-cancel-btn" class="edit-cancel-btn">Cancel</button>
            <button id="edit-send-btn" class="edit-send-btn">Send</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.bindPopupEvents();
  }

  bindPopupEvents() {
    const popup = document.getElementById("text-edit-ai-popup");
    const header = popup.querySelector(".text-edit-ai-header");
    const closeBtn = popup.querySelector(".text-edit-ai-close");
    const cancelBtn = document.getElementById("edit-cancel-btn");
    const sendBtn = document.getElementById("edit-send-btn");
    const promptInput = document.getElementById("edit-prompt-input");

    // Check if events already bound
    if (popup._textEditEventsBound) {
      console.log("🔗 BIND: Events already bound, skipping...");
      return;
    }

    console.log("🔗 BIND: Binding popup events...");
    console.log("🔗 BIND: Elements found:", {
      popup: !!popup,
      header: !!header,
      closeBtn: !!closeBtn,
      cancelBtn: !!cancelBtn,
      sendBtn: !!sendBtn,
      promptInput: !!promptInput,
    });

    // Make popup draggable
    this.makeDraggable(popup, header);

    // Close popup events with logging
    closeBtn.addEventListener("click", (e) => {
      console.log("❌ CLOSE: Close button clicked");
      e.preventDefault();
      e.stopPropagation();
      this.hideEditPopup();
    });

    cancelBtn.addEventListener("click", (e) => {
      console.log("❌ CANCEL: Cancel button clicked");
      e.preventDefault();
      e.stopPropagation();
      this.hideEditPopup();
    });

    // Send button
    sendBtn.addEventListener("click", () => {
      this.handleSendEdit();
    });

    // Enter to send (Ctrl+Enter for new line)
    promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        this.handleSendEdit();
      }
    });

    // ESC to close popup
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isPopupOpen) {
        console.log("⌨️ ESC: Escape key pressed, closing popup");
        e.preventDefault();
        e.stopPropagation();
        this.hideEditPopup();
      }
    });

    // Click outside to close - with proper event handling (like mermaidAIChat.js)
    setTimeout(() => {
      const handleClickOutside = (e) => {
        // Skip if popup is not open
        if (!this.isPopupOpen) return;

        // Skip if clicking on edit button (to prevent immediate close)
        if (e.target.closest(".text-edit-button")) {
          return;
        }

        // Skip if clicking inside popup
        if (popup.contains(e.target)) {
          return;
        }

        console.log("🖱️ Click outside popup detected, closing...");
        this.hideEditPopup();
      };

      document.addEventListener("click", handleClickOutside, true);
    }, 300); // Delay to prevent immediate close after opening

    // Mark events as bound
    popup._textEditEventsBound = true;
    console.log("✅ BIND: All events bound successfully");
  }

  async handleSendEdit() {
    const promptInput = document.getElementById("edit-prompt-input");
    const sendBtn = document.getElementById("edit-send-btn");
    const prompt = promptInput.value.trim();

    if (!prompt) {
      alert("Please enter your editing instructions!");
      return;
    }

    // Disable send button and show loading
    sendBtn.disabled = true;
    sendBtn.textContent = "🤔 Processing...";

    try {
      // Simulate API call with mock data
      const editedText = await this.callEditAPI(this.selectedText, prompt);

      // Replace selected text with edited text
      this.replaceSelectedText(editedText);

      // Show success message
      this.showNotification("Text edited successfully!", "success");

      // Close popup
      this.hideEditPopup();
    } catch (error) {
      console.error("❌ Edit API error:", error);
      alert(`❌ Error editing text: ${error.message}`);
    } finally {
      // Re-enable send button
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }

  async callEditAPI(originalText, prompt) {
    console.log("🤖 Calling Text Edit API...", { originalText, prompt });

    try {
      // In a real implementation, you would call your actual AI API here
      // For now, we'll simulate with more sophisticated mock responses

      // Simulate API call delay
      await new Promise((resolve) =>
        setTimeout(resolve, 1500 + Math.random() * 1000)
      );

      // More sophisticated mock responses based on prompt analysis
      const lowerPrompt = prompt.toLowerCase();
      let response = originalText;

      if (
        lowerPrompt.includes("formal") ||
        lowerPrompt.includes("professional")
      ) {
        response = this.makeFormal(originalText);
      } else if (
        lowerPrompt.includes("grammar") ||
        lowerPrompt.includes("correct")
      ) {
        response = this.fixGrammar(originalText);
      } else if (
        lowerPrompt.includes("translate") &&
        lowerPrompt.includes("vietnamese")
      ) {
        response = "Bản dịch tiếng Việt: " + originalText;
      } else if (
        lowerPrompt.includes("translate") &&
        lowerPrompt.includes("english")
      ) {
        response = "English translation: " + originalText;
      } else if (
        lowerPrompt.includes("summarize") ||
        lowerPrompt.includes("summary")
      ) {
        response = this.summarizeText(originalText);
      } else if (
        lowerPrompt.includes("expand") ||
        lowerPrompt.includes("elaborate")
      ) {
        response = this.expandText(originalText);
      } else if (
        lowerPrompt.includes("bullet") ||
        lowerPrompt.includes("list")
      ) {
        response = this.convertToBulletPoints(originalText);
      } else {
        // Generic improvement
        response = this.improveText(originalText, prompt);
      }

      console.log("✅ Text Edit API response:", response);
      return response;
    } catch (error) {
      console.error("❌ Text Edit API error:", error);
      throw new Error("Failed to process text edit request. Please try again.");
    }
  }

  makeFormal(text) {
    return text
      .replace(/\bcan't\b/g, "cannot")
      .replace(/\bwon't\b/g, "will not")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\bisn't\b/g, "is not")
      .replace(/\baren't\b/g, "are not")
      .replace(/\bi'm\b/g, "I am")
      .replace(/\byou're\b/g, "you are")
      .replace(/\bit's\b/g, "it is");
  }

  fixGrammar(text) {
    // Simple grammar fixes - in real implementation, use proper grammar checking
    return (
      text.replace(/\bi\b/g, "I").replace(/\s+/g, " ").trim() +
      " [Grammar checked]"
    );
  }

  summarizeText(text) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length <= 1) {
      return "Summary: " + text;
    }
    return "Summary: " + sentences[0].trim() + ".";
  }

  expandText(text) {
    return (
      text +
      " This concept can be further elaborated with additional context, examples, and detailed explanations to provide a more comprehensive understanding of the topic."
    );
  }

  convertToBulletPoints(text) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    // Return HTML for bullet points
    const bulletItems = sentences
      .map((sentence) => `<li>${sentence.trim()}</li>`)
      .join("");
    return `<ul>${bulletItems}</ul>`;
  }

  improveText(text, prompt) {
    return `Improved based on "${prompt}": ${text}`;
  }

  replaceSelectedText(newContent) {
    try {
      // Use the stored selection and document
      const doc = this.selectedDocument || document;
      const selection =
        doc === document ? window.getSelection() : doc.getSelection();

      console.log(
        "🔄 Replacing content in:",
        doc === document ? "main document" : "iframe document"
      );
      console.log(
        "🔄 New content type:",
        this.isHTML(newContent) ? "HTML" : "Text"
      );

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Check if newContent is HTML or plain text
        if (this.isHTML(newContent)) {
          console.log("📝 Inserting HTML content");
          // Create a temporary container to parse HTML
          const tempDiv = doc.createElement("div");
          tempDiv.innerHTML = newContent;

          // Insert all child nodes from the temp container
          const fragment = doc.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          range.insertNode(fragment);
        } else {
          console.log("📝 Inserting plain text content");
          // Insert as plain text
          range.insertNode(doc.createTextNode(newContent));
        }

        // Clear selection
        selection.removeAllRanges();

        console.log("✅ Content replaced successfully");
      } else {
        throw new Error("No selection range found");
      }
    } catch (error) {
      console.error("❌ Error replacing content:", error);
      // Fallback: copy to clipboard
      navigator.clipboard
        .writeText(newContent)
        .then(() => {
          alert(
            "Could not replace content directly. The edited content has been copied to clipboard."
          );
        })
        .catch(() => {
          // If clipboard also fails, show the content in an alert
          alert(
            `Could not replace content or copy to clipboard. Here's the edited content:\n\n${newContent}`
          );
        });
    }
  }

  // Helper method to detect if content is HTML
  isHTML(str) {
    // Simple HTML detection - check for HTML tags
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(str);
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "success"
          ? "#28a745"
          : type === "error"
          ? "#dc3545"
          : "#007bff"
      };
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10002;
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  makeDraggable(element, dragHandle) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;

    console.log("🎯 DRAG: Setting up draggable element...");

    // Style the drag handle
    dragHandle.style.cursor = "move";
    dragHandle.style.userSelect = "none";

    const startDrag = (e) => {
      // Don't drag if clicking on close button
      if (e.target.classList.contains("text-edit-ai-close")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      isDragging = true;

      // Get mouse position
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      // Get element current position
      elementStartX = parseInt(element.style.left) || 0;
      elementStartY = parseInt(element.style.top) || 0;

      console.log("🎯 DRAG: Started", {
        mouseX: dragStartX,
        mouseY: dragStartY,
        elementX: elementStartX,
        elementY: elementStartY,
      });

      // Add global event listeners
      document.addEventListener("mousemove", onDrag, true);
      document.addEventListener("mouseup", stopDrag, true);

      // Prevent text selection during drag
      document.body.style.userSelect = "none";
    };

    const onDrag = (e) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate mouse movement
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      // Calculate new position
      const newX = elementStartX + deltaX;
      const newY = elementStartY + deltaY;

      // Keep element within viewport bounds
      const elementRect = element.getBoundingClientRect();
      const maxX = window.innerWidth - elementRect.width;
      const maxY = window.innerHeight - elementRect.height;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      // Update element position
      element.style.left = boundedX + "px";
      element.style.top = boundedY + "px";
      element.style.transform = "none"; // Remove center transform when dragging
    };

    const stopDrag = (e) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      isDragging = false;

      console.log("🎯 DRAG: Stopped");

      // Remove global event listeners
      document.removeEventListener("mousemove", onDrag, true);
      document.removeEventListener("mouseup", stopDrag, true);

      // Restore text selection
      document.body.style.userSelect = "";

      // Prevent click outside from firing (like mermaidAIChat.js)
      e.stopPropagation();
    };

    // Bind drag events
    dragHandle.addEventListener("mousedown", startDrag);

    console.log("✅ DRAG: Setup completed");
  }
}
