// Mermaid AI Chat Service for K-Tool Extension
import { ApiClient } from "../../shared/api.js";

export class MermaidAIChat {
  constructor($) {
    this.$ = $ || window.jQuery || window.$; // jQuery instance từ AJS hoặc fallback
    this.isPopupOpen = false;
    this.currentMermaidContent = "";
    this.currentMermaidElement = null;

    // Lưu element và tọa độ được click
    this.lastClickedElement = null;
    this.lastClickPosition = { x: 0, y: 0 };

    console.log("🚀 Mermaid AI Chat initializing with AJS/jQuery:", !!this.$);
    this.init();
  }

  async init() {
    console.log("🚀 AJS: Mermaid AI Chat initializing...");

    // Check if already injected
    if (document.getElementById("mermaid-ai-chat-root")) {
      console.log("🔍 AJS: Mermaid AI Chat already injected, skipping...");
      return;
    }

    // Create popup UI first
    this.createPopupUI();

    // Setup detection - AJS.toInit đảm bảo DOM ready
    this.setupMermaidDetection();

    // Setup page change detection để handle SPA navigation
    this.setupConfluencePageChangeDetection();

    console.log("✅ AJS: Mermaid AI Chat ready");
  }

  setupMermaidDetection() {
    console.log("🔍 SIMPLE: Setting up iframe click detection...");

    // Chỉ setup iframe event listeners
    this.setupIframeEventListeners();

    // Setup MutationObserver để detect iframe mới (chỉ observe DOM cha)
    this.setupMutationObserver();

    console.log("✅ SIMPLE: Setup completed");
  }

  setupIframeEventListeners() {
    console.log("🔍 IFRAME: Setting up iframe event listeners...");
    this.refreshIframeListeners();
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
            this.attachIframeListeners(iframe, `refresh-retry-${index}`);
          });
        }
      }, 1000);
    } else {
      iframes.forEach((iframe, index) => {
        console.log(
          `🔍 IFRAME REFRESH ${index}: Processing iframe:`,
          iframe.src || iframe.id || "no-src"
        );
        this.attachIframeListeners(iframe, `refresh-${index}`);
      });
    }
  }

  attachIframeListeners(iframe, index) {
    try {
      // Kiểm tra nếu iframe đã có listener để tránh duplicate
      if (iframe.dataset.mermaidListenerAttached === "true") {
        console.log(
          `⚠️ IFRAME ${index}: Listener already attached, skipping...`
        );
        return;
      }

      // Đánh dấu iframe đã có listener
      iframe.dataset.mermaidListenerAttached = "true";

      // Đợi iframe load xong
      const loadHandler = () => {
        console.log(
          `🔍 IFRAME ${index}: Iframe loaded, attaching listeners...`
        );
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;

          if (!iframeDoc) {
            console.log(
              `⚠️ IFRAME ${index}: Cannot access iframe document (cross-origin?)`
            );
            return;
          }

          console.log(
            `✅ IFRAME ${index}: Iframe document accessible, adding click listeners...`
          );

          // Click handler: Lưu element và tọa độ nếu là ảnh
          const clickHandler = (event) => {
            console.log(`🖱️ IFRAME ${index} CLICK: Element clicked:`, {
              tag: event.target.tagName,
              classes: event.target.className,
              id: event.target.id,
              src: event.target.src || "N/A",
              alt: event.target.alt || "N/A",
              element: event.target,
            });

            // Nếu click vào ảnh (IMG hoặc SVG) thì lưu lại
            if (
              event.target.tagName === "IMG" ||
              event.target.tagName === "SVG"
            ) {
              console.log(
                `🎯 SAVING: Image clicked - saving element and position`
              );

              // Lưu element
              this.lastClickedElement = event.target;

              // Lưu tọa độ click
              this.lastClickPosition = {
                x: event.clientX,
                y: event.clientY,
              };

              console.log(`🎯 SAVED: Element:`, this.lastClickedElement);
              console.log(`🎯 SAVED: Position:`, this.lastClickPosition);
            }
          };

          // Remove existing listener nếu có
          if (iframeDoc.mermaidClickHandler) {
            iframeDoc.removeEventListener(
              "click",
              iframeDoc.mermaidClickHandler,
              true
            );
          }

          // Add new listener
          const boundClickHandler = clickHandler.bind(this);
          iframeDoc.addEventListener("click", boundClickHandler, true);

          // Store reference để có thể remove sau này
          iframeDoc.mermaidClickHandler = boundClickHandler;
        } catch (e) {
          console.log(
            `❌ IFRAME ${index}: Error accessing iframe content:`,
            e.message
          );
        }
      };

      // Remove existing load listener nếu có
      if (iframe.mermaidLoadHandler) {
        iframe.removeEventListener("load", iframe.mermaidLoadHandler);
      }

      // Add load listener
      iframe.addEventListener("load", loadHandler);
      iframe.mermaidLoadHandler = loadHandler;

      // Nếu iframe đã load rồi thì gọi handler ngay
      if (
        iframe.contentDocument &&
        iframe.contentDocument.readyState === "complete"
      ) {
        loadHandler();
      }
    } catch (e) {
      console.log(
        `❌ IFRAME ${index}: Error setting up iframe listener:`,
        e.message
      );
    }
  }

  setupMutationObserver() {
    console.log(
      "🔍 MUTATION: Setting up observer to track ALL DOM changes in parent..."
    );

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation, mutationIndex) => {
        console.log(`🔍 MUTATION ${mutationIndex}: Type: ${mutation.type}`);
        if (mutation.type === "childList") {
          // Log ADDED nodes
          if (mutation.addedNodes.length > 0) {
            console.log(
              `➕ MUTATION ${mutationIndex}: ${mutation.addedNodes.length} nodes ADDED:`
            );
            mutation.addedNodes.forEach((node, nodeIndex) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                console.log(`➕ Added ${nodeIndex}: ${node.tagName}`, {
                  tag: node.tagName,
                  classes: node.className || "N/A",
                  id: node.id || "N/A",
                  textContent: node.textContent?.substring(0, 50) || "N/A",
                  element: node,
                });

                // Nếu là iframe thì attach listeners
                if (node.tagName === "IFRAME") {
                  console.log(
                    "🎯 MUTATION: IFRAME detected, attaching listeners..."
                  );
                  this.attachIframeListeners(node, "new");
                }

                this.injectAIButton();
              } else if (node.nodeType === Node.TEXT_NODE) {
                console.log(`➕ Added ${nodeIndex}: TEXT_NODE`, {
                  content: node.textContent?.substring(0, 50) || "N/A",
                });
              }
            });
          }
        }
      });
    });

    // Observe DOM cha với tất cả types
    observer.observe(document.body, {
      childList: true,
      subtree: false,
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
        setTimeout(() => this.setupIframeEventListeners(), 1000);
      });

      AJS.bind("rte-ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Confluence RTE ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.setupIframeEventListeners(), 1000);
      });

      // Page events
      AJS.bind("page.edit.ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Page edit ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.setupIframeEventListeners(), 1500);
      });

      AJS.bind("page.view.ready", () => {
        console.log(
          "🔄 PAGE CHANGE: Page view ready - re-setting up iframe listeners"
        );
        setTimeout(() => this.setupIframeEventListeners(), 1000);
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
          this.setupIframeEventListeners();
        }, 2000);
      }
    };

    setInterval(checkUrlChange, 1000);

    console.log(
      "✅ PAGE CHANGE: Confluence page change detection setup completed"
    );
  }

  injectAIButton() {
    var panel = document.getElementById("property-panel");
    if (!panel) return;

    var buttonContainer = panel.querySelector(".panel-buttons");
    if (!buttonContainer) return;

    // Kiểm tra nếu nút AI đã có
    if (
      buttonContainer.querySelector(
        ".macro-placeholder-property-panel-ai-button"
      )
    )
      return;

    console.log("✨ Thêm nút AI vào property panel...");

    // Tạo thẻ <a> mới
    var aiButton = document.createElement("a");
    aiButton.href = "#";
    aiButton.className =
      "aui-button macro-placeholder-property-panel-ai-button";
    aiButton.setAttribute("tabindex", "0");
    aiButton.setAttribute("role", "button");
    aiButton.setAttribute("aria-label", "AI");
    aiButton.style.marginRight = "4px";

    // Icon + Text
    aiButton.innerHTML = `<span class="icon"></span><span class="panel-button-text">AI</span>`;

    // Thêm sự kiện click
    aiButton.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("🤖 AI Button clicked - checking saved element...");

      // DEBUG: Kiểm tra context và values
      console.log("🔍 DEBUG AI BUTTON: this:", this);
      console.log(
        "🔍 DEBUG AI BUTTON: this.lastClickedElement:",
        this.lastClickedElement
      );
      console.log(
        "🔍 DEBUG AI BUTTON: this.lastClickPosition:",
        this.lastClickPosition
      );
      console.log(
        "🔍 DEBUG AI BUTTON: typeof this.lastClickedElement:",
        typeof this.lastClickedElement
      );
      console.log(
        "🔍 DEBUG AI BUTTON: Boolean check:",
        !!(this.lastClickedElement && this.lastClickPosition)
      );

      if (this.lastClickedElement && this.lastClickPosition) {
        console.log(
          "🤖 Found saved element - showing chat popup at position:",
          this.lastClickPosition
        );
        console.log("🤖 Saved element:", this.lastClickedElement);

        // Gọi showChatPopup với tọa độ đã lưu
        this.showChatPopup(this.lastClickPosition.x, this.lastClickPosition.y);
      } else {
        console.log(
          "⚠️ No saved element found - please click on an image first"
        );
        console.log(
          "⚠️ DEBUG: lastClickedElement is:",
          this.lastClickedElement
        );
        console.log("⚠️ DEBUG: lastClickPosition is:", this.lastClickPosition);
        alert("⚠️ Vui lòng click vào một hình ảnh trước khi sử dụng AI Chat!");
      }
    });

    // Chèn vào trước nút Remove
    var removeButton = buttonContainer.querySelector(
      ".macro-placeholder-property-panel-remove-button"
    );
    if (removeButton) {
      buttonContainer.insertBefore(aiButton, removeButton);
    } else {
      buttonContainer.appendChild(aiButton);
    }

    console.log("✅ Đã chèn nút AI thành công.");
  }

  createPopupUI() {
    const root = document.createElement("div");
    root.id = "mermaid-ai-chat-root";
    root.innerHTML = `
      <div id="mermaid-ai-chat-popup" class="mermaid-ai-chat-popup" style="display: none;">
        <div class="mermaid-ai-chat-header">
          <h3>🤖 Chat with AI about this Mermaid diagram</h3>
          <button class="mermaid-ai-chat-close">&times;</button>
        </div>
        <div class="mermaid-ai-chat-body">
          <div class="mermaid-ai-chat-messages" id="mermaid-ai-chat-messages">
            <div class="mermaid-ai-chat-message system">
              <div class="message-content">
                <p>👋 Hi! I can help you modify this Mermaid diagram. What would you like to change?</p>
              </div>
            </div>
          </div>
          <div class="mermaid-ai-chat-input-container">
            <textarea
              id="mermaid-ai-chat-input"
              class="mermaid-ai-chat-input"
              placeholder="Describe how you want to modify the diagram..."
              rows="3"
            ></textarea>
            <button id="mermaid-ai-chat-send" class="mermaid-ai-chat-send">
              📤 Send
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.bindPopupEvents();
  }

  bindPopupEvents() {
    const popup = document.getElementById("mermaid-ai-chat-popup");
    const header = popup.querySelector(".mermaid-ai-chat-header");
    const closeBtn = popup.querySelector(".mermaid-ai-chat-close");
    const sendBtn = document.getElementById("mermaid-ai-chat-send");
    const input = document.getElementById("mermaid-ai-chat-input");

    // Make popup draggable
    this.makeDraggable(popup, header);

    // Close popup
    closeBtn.addEventListener("click", () => {
      this.hideChatPopup();
    });

    // Send message
    sendBtn.addEventListener("click", () => {
      this.sendMessage();
    });

    // Send on Enter (Ctrl+Enter for new line)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Click outside to close - with proper event handling
    setTimeout(() => {
      const handleClickOutside = (e) => {
        // Skip if popup is not open
        if (!this.isPopupOpen) return;

        // Skip if clicking on AI button (to prevent immediate close)
        if (e.target.closest(".macro-placeholder-property-panel-ai-button")) {
          return;
        }

        // Skip if clicking inside popup
        if (popup.contains(e.target)) {
          return;
        }

        console.log("🖱️ Click outside popup detected, closing...");
        this.hideChatPopup();
      };

      document.addEventListener("click", handleClickOutside, true);
    }, 300); // Delay to prevent immediate close after opening
  }

  makeDraggable(popup, dragHandle) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let popupStartX = 0;
    let popupStartY = 0;

    console.log("🎯 DRAG: Setting up draggable popup...");

    // Style the drag handle
    dragHandle.style.cursor = "move";
    dragHandle.style.userSelect = "none";

    const startDrag = (e) => {
      // Don't drag if clicking on close button
      if (e.target.classList.contains("mermaid-ai-chat-close")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling

      isDragging = true;

      // Get mouse position
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      // Get popup current position (from style, not getBoundingClientRect)
      popupStartX = parseInt(popup.style.left) || 0;
      popupStartY = parseInt(popup.style.top) || 0;

      console.log("🎯 DRAG: Started", {
        mouseX: dragStartX,
        mouseY: dragStartY,
        popupX: popupStartX,
        popupY: popupStartY,
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

      // Calculate new popup position
      let newX = popupStartX + deltaX;
      let newY = popupStartY + deltaY;

      // Constrain to viewport (with some padding)
      const padding = 10;
      const maxX = window.innerWidth - 400 - padding; // 400 is popup width
      const maxY = window.innerHeight - 300 - padding; // estimated popup height

      newX = Math.max(padding, Math.min(newX, maxX));
      newY = Math.max(padding, Math.min(newY, maxY));

      // Apply position
      popup.style.left = newX + "px";
      popup.style.top = newY + "px";
    };

    const stopDrag = (e) => {
      if (!isDragging) return;

      console.log("🎯 DRAG: Stopped");
      isDragging = false;

      // Remove global event listeners
      document.removeEventListener("mousemove", onDrag, true);
      document.removeEventListener("mouseup", stopDrag, true);

      // Restore text selection
      document.body.style.userSelect = "";

      e.stopPropagation(); // Prevent click outside from firing
    };

    // Attach drag to header
    dragHandle.addEventListener("mousedown", startDrag);

    console.log("✅ DRAG: Setup completed");
  }

  showChatPopup(x, y) {
    console.log("🎉 STEP 8: showChatPopup called with coordinates:", { x, y });
    const popup = document.getElementById("mermaid-ai-chat-popup");
    console.log("🎉 STEP 8.1: Found popup element:", popup);

    if (!popup) {
      console.error("❌ STEP 8.1: Popup element not found!");
      return;
    }

    // Extract Mermaid content from the clicked element
    this.extractMermaidContentFromElement();
    console.log(
      "🎉 STEP 8.1.5: Mermaid content extracted:",
      this.currentMermaidContent.substring(0, 100) + "..."
    );

    const leftPos = Math.min(x, window.innerWidth - 400);
    const topPos = Math.min(y, window.innerHeight - 300);

    console.log("🎉 STEP 8.2: Setting popup position:", { leftPos, topPos });
    console.log("🎉 STEP 8.2: Window dimensions:", {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    popup.style.display = "block";
    popup.style.left = leftPos + "px";
    popup.style.top = topPos + "px";

    console.log("🎉 STEP 8.3: Popup styles applied:", {
      display: popup.style.display,
      left: popup.style.left,
      top: popup.style.top,
    });

    this.isPopupOpen = true;
    console.log("🎉 STEP 8.4: isPopupOpen set to:", this.isPopupOpen);

    // Focus input
    setTimeout(() => {
      const input = document.getElementById("mermaid-ai-chat-input");
      console.log("🎉 STEP 8.5: Focusing input element:", input);
      if (input) {
        input.focus();
        console.log("✅ STEP 8.5: Input focused successfully");
      } else {
        console.error("❌ STEP 8.5: Input element not found!");
      }
    }, 100);

    console.log("✅ STEP 8: showChatPopup completed");
  }

  /**
   * Extract Mermaid content from the clicked element
   */
  extractMermaidContentFromElement() {
    console.log("🔍 Extracting Mermaid content from clicked element...");

    if (!this.lastClickedElement) {
      console.warn("⚠️ No clicked element found");
      this.currentMermaidContent = "";
      return;
    }

    try {
      // Try to find Mermaid content in various ways
      let content = "";

      // Method 1: Look for structured macro with mermaid
      const mermaidMacro = this.lastClickedElement.closest(
        'ac\\:structured-macro[ac\\:name="mermaid"], [data-macro-name="mermaid"]'
      );
      if (mermaidMacro) {
        console.log("🎯 Found Mermaid macro:", mermaidMacro);

        // Try to find parameter with code
        const codeParam = mermaidMacro.querySelector(
          'ac\\:parameter[ac\\:name="code"], [data-parameter-name="code"]'
        );
        if (codeParam) {
          content = codeParam.textContent || codeParam.innerText || "";
          console.log(
            "✅ Extracted from code parameter:",
            content.substring(0, 50) + "..."
          );
        }
      }

      // Method 2: Look for data attributes
      if (!content && this.lastClickedElement.dataset) {
        if (this.lastClickedElement.dataset.mermaidCode) {
          content = this.lastClickedElement.dataset.mermaidCode;
          console.log(
            "✅ Extracted from data-mermaid-code:",
            content.substring(0, 50) + "..."
          );
        }
      }

      // Method 3: Look in parent elements for text content
      if (!content) {
        let parent = this.lastClickedElement.parentElement;
        let attempts = 0;
        while (parent && attempts < 5) {
          const textContent = parent.textContent || parent.innerText || "";
          if (
            textContent.includes("graph") ||
            textContent.includes("flowchart") ||
            textContent.includes("sequenceDiagram")
          ) {
            content = textContent.trim();
            console.log(
              "✅ Extracted from parent element:",
              content.substring(0, 50) + "..."
            );
            break;
          }
          parent = parent.parentElement;
          attempts++;
        }
      }

      // Method 4: Default fallback
      if (!content) {
        content = "graph TD\n    A[Start] --> B[End]";
        console.log("⚠️ Using fallback Mermaid content");
      }

      this.currentMermaidContent = content;
      console.log("✅ Mermaid content extraction completed:", {
        length: content.length,
        preview: content.substring(0, 100) + "...",
      });
    } catch (error) {
      console.error("❌ Error extracting Mermaid content:", error);
      this.currentMermaidContent = "graph TD\n    A[Start] --> B[End]";
    }
  }

  hideChatPopup() {
    const popup = document.getElementById("mermaid-ai-chat-popup");
    popup.style.display = "none";
    this.isPopupOpen = false;

    // Clear messages except system message
    const messagesContainer = document.getElementById(
      "mermaid-ai-chat-messages"
    );
    const systemMessage = messagesContainer.querySelector(".system");
    messagesContainer.innerHTML = "";
    messagesContainer.appendChild(systemMessage);

    // Clear input
    document.getElementById("mermaid-ai-chat-input").value = "";

    console.log("✅ Chat popup closed");
  }

  async sendMessage() {
    const input = document.getElementById("mermaid-ai-chat-input");
    const message = input.value.trim();

    // Validate user prompt
    const promptValidation = ApiClient.validateUserPrompt(message);
    if (!promptValidation.isValid) {
      this.addMessage("assistant", `⚠️ ${promptValidation.error}`);
      return;
    }

    // Validate diagram content
    const diagramValidation = ApiClient.validateDiagramContent(
      this.currentMermaidContent
    );
    if (!diagramValidation.isValid) {
      this.addMessage("assistant", `⚠️ ${diagramValidation.error}`);
      return;
    }

    // Add user message to chat
    this.addMessage("user", message);

    // Clear input
    input.value = "";

    // Show loading
    const loadingId = this.addMessage("assistant", "🤔 Thinking...");

    try {
      // Call AI API
      const response = await this.callAI(message);

      // Remove loading message
      this.removeMessage(loadingId);

      // Add AI response
      this.addMessage("assistant", response);
    } catch (error) {
      console.error("❌ AI API error:", error);

      // Remove loading message
      this.removeMessage(loadingId);

      // Get user-friendly error message
      const errorMessage = ApiClient.getErrorMessage({
        success: false,
        error: error.message,
      });
      this.addMessage("assistant", errorMessage);
    }
  }

  addMessage(type, content) {
    const messagesContainer = document.getElementById(
      "mermaid-ai-chat-messages"
    );
    const messageId = "msg-" + Date.now();

    const messageDiv = document.createElement("div");
    messageDiv.className = `mermaid-ai-chat-message ${type}`;
    messageDiv.id = messageId;
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${content}</p>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageId;
  }

  removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
      message.remove();
    }
  }

  async callAI(userPrompt) {
    // Prepare payload similar to the original extension
    const payload = {
      diagram_content: this.currentMermaidContent,
      user_prompt: userPrompt,
      context: "mermaid_diagram_editing",
    };

    console.log("📤 Sending AI request:", payload);

    // Use the API client from shared module
    const response = await ApiClient.editDiagram(payload);

    if (response.success) {
      return (
        response.data.result ||
        response.data.response ||
        "✅ Diagram updated successfully!"
      );
    } else {
      throw new Error(response.error || "Unknown error occurred");
    }
  }
}

// Export for use as service in K-Tool Extension
// Initialization will be handled by the main content.js
