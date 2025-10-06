// Mermaid AI Chat Service for K-Tool Extension
import { MermaidExtractor } from "./MermaidExtractor.js";
import { MermaidPreview } from "./MermaidPreview.js";
import { MermaidAIService } from "./MermaidAIService.js";
import { MermaidApiClient } from "./MermaidApiClient.js";
import { CONFLUENCE_API_URLS } from "../../shared/constants.js";

export class MermaidAIChat {
  constructor($) {
    this.$ = $ || window.jQuery || window.$; // jQuery instance từ AJS hoặc fallback
    this.isPopupOpen = false;
    this.currentMermaidContent = "";

    // Initialize components
    this.preview = new MermaidPreview();
    this.aiService = new MermaidAIService();

    // ✅ Replace MermaidDetector with internal properties
    this.lastClickedElement = null;
    this.lastClickPosition = { x: 0, y: 0 };

    // ✅ Zoom functionality
    this.currentZoom = 1.0; // 100%
    this.minZoom = 0.25; // 25%
    this.maxZoom = 3.0; // 300%
    this.zoomStep = 0.25; // 25% per step
    this.isZooming = false; // Flag to prevent flicker during zoom

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

    // Initialize preview component
    this.preview.initialize();

    // ✅ Setup detection without MermaidDetector
    this.setupMermaidDetection();
    this.setupConfluencePageChangeDetection();

    // Setup ConfluenceEditor monitoring to avoid conflicts
    this.setupConfluenceEditorMonitoring();

    console.log("✅ AJS: Mermaid AI Chat ready");
  }

  /**
   * Handle Mermaid diagram click
   * @param {HTMLElement} element - Clicked element
   * @param {Object} position - Click position {x, y}
   */
  handleMermaidClick(element, position) {
    console.log("🎯 Mermaid diagram clicked:", element, position);

    // Extract content from clicked element
    // this.currentMermaidContent = MermaidExtractor.extractFromElement(element);

    // Show popup at click position
    this.showChatPopup(position.x, position.y);
  }

  setupMermaidDetection() {
    console.log("🔍 SIMPLE: Setting up iframe click detection...");

    // ✅ Sử dụng lại logic từ MermaidDetector thay vì duplicate code
    // Chỉ setup iframe event listeners với logic đơn giản
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

            console.log(
              `🔍 IFRAME ${index} CLICK: Checking if Mermaid element...`
            );
            console.log(
              `🔍 IFRAME ${index} CLICK: isMermaidElement result:`,
              this.isMermaidElement(event.target)
            );

            // ✅ Handle click directly without MermaidDetector
            if (this.isMermaidElement(event.target)) {
              console.log("🎯 Mermaid element clicked:", event.target);

              // Extract and save comprehensive diagram info
              if (event.target.src) {
                const filename = MermaidApiClient.extractFilename(
                  event.target.src
                );

                // Extract macro parameters from data attribute
                const macroParams = event.target.getAttribute(
                  "data-macro-parameters"
                );

                // Save comprehensive diagram info
                const diagramInfo = {
                  filename: filename,
                  src: event.target.src,
                  macroParameters: macroParams,
                  element: {
                    tagName: event.target.tagName,
                    className: event.target.className,
                    id: event.target.id,
                  },
                };

                // Parse macro parameters if available
                if (macroParams) {
                  try {
                    const params = this.parseMacroParameters(macroParams);
                    diagramInfo.parsedParams = params;
                    console.log(`📋 Parsed macro parameters:`, params);
                  } catch (error) {
                    console.warn(
                      "⚠️ Could not parse macro parameters:",
                      macroParams
                    );
                  }
                }

                if (filename) {
                  MermaidApiClient.saveFilename(filename);
                  // Save full diagram info
                  localStorage.setItem(
                    "mermaid_diagram_info",
                    JSON.stringify(diagramInfo)
                  );
                  console.log(`💾 Diagram info saved:`, diagramInfo);
                } else {
                  console.warn(
                    "⚠️ Could not extract filename from src:",
                    event.target.src
                  );
                }
              }

              // Save click info
              this.lastClickedElement = event.target;
              this.lastClickPosition = {
                x: event.clientX + iframe.offsetLeft,
                y: event.clientY + iframe.offsetTop,
              };

              // Trigger callback
              this.handleMermaidClick(event.target, this.lastClickPosition);
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
    // ✅ Skip if ConfluenceEditor popup is open to avoid conflict
    if (document.querySelector(".confluence-editor-overlay")) {
      console.log(
        "🚫 ConfluenceEditor popup is open, skipping AI button injection"
      );
      return;
    }

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
    aiButton.addEventListener("click", async (e) => {
      e.preventDefault();

      // ✅ Skip if ConfluenceEditor popup is open to avoid conflict
      if (document.querySelector(".confluence-editor-overlay")) {
        console.log(
          "🚫 ConfluenceEditor popup is open, ignoring AI button click"
        );
        return;
      }

      console.log("🤖 AI Button clicked - fetching Mermaid code...");

      // Get last clicked element and position
      const lastClickedElement = this.lastClickedElement;
      const lastClickPosition = this.lastClickPosition;

      console.log(
        "🔍 DEBUG AI BUTTON: this.lastClickedElement:",
        this.lastClickedElement
      );
      console.log(
        "🔍 DEBUG AI BUTTON: this.lastClickPosition:",
        this.lastClickPosition
      );
      console.log(
        "🔍 DEBUG AI BUTTON: lastClickedElement:",
        lastClickedElement
      );
      console.log("🔍 DEBUG AI BUTTON: lastClickPosition:", lastClickPosition);
      console.log(
        "🔍 DEBUG AI BUTTON: Position check:",
        lastClickPosition &&
          (lastClickPosition.x !== 0 || lastClickPosition.y !== 0)
      );

      if (
        lastClickedElement &&
        lastClickPosition &&
        (lastClickPosition.x !== 0 || lastClickPosition.y !== 0)
      ) {
        console.log(
          "🤖 Found saved element - fetching Mermaid code from API..."
        );

        try {
          // Show loading state
          const loadingMessage = "🔄 Fetching Mermaid diagram code...";
          console.log(loadingMessage);

          // Fetch Mermaid code from API using saved filename and page ID
          const mermaidCodeResponse =
            await MermaidApiClient.fetchMermaidCodeFromSaved();
          const mermaidCode = mermaidCodeResponse.data;
          console.log("✅ Mermaid code fetched successfully:", mermaidCode);

          // Update current content with fetched code
          this.currentMermaidContent = mermaidCode;

          // Show chat popup with fetched content
          this.showChatPopup(lastClickPosition.x, lastClickPosition.y);
        } catch (error) {
          console.error("❌ Error fetching Mermaid code:", error);
          alert(`❌ Error fetching Mermaid code: ${error.message}`);
        }
      } else {
        console.log(
          "⚠️ No saved element found - please click on an image first"
        );
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

  /**
   * Remove AI button when ConfluenceEditor is open
   */
  removeAIButton() {
    const aiButton = document.querySelector(
      ".macro-placeholder-property-panel-ai-button"
    );
    if (aiButton) {
      aiButton.remove();
      console.log("🗑️ AI button removed due to ConfluenceEditor popup");
    }
  }

  /**
   * Monitor ConfluenceEditor popup state and manage AI button accordingly
   */
  setupConfluenceEditorMonitoring() {
    // Monitor for ConfluenceEditor popup open/close
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.classList &&
              node.classList.contains("confluence-editor-overlay")
            ) {
              console.log(
                "🔍 ConfluenceEditor popup opened, removing AI button"
              );
              this.removeAIButton();
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.classList &&
              node.classList.contains("confluence-editor-overlay")
            ) {
              console.log(
                "🔍 ConfluenceEditor popup closed, re-injecting AI button"
              );
              // Delay to ensure DOM is ready
              setTimeout(() => {
                this.injectAIButton();
              }, 100);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: false, // Only observe direct children of body
    });

    console.log("✅ ConfluenceEditor monitoring setup completed");
  }

  /**
   * Parse macro parameters string
   * @param {string} macroParams - Macro parameters string like "filename=e3e32|format=svg|revision=5"
   * @returns {Object} Parsed parameters object
   */
  parseMacroParameters(macroParams) {
    const params = {};
    if (!macroParams) return params;

    const pairs = macroParams.split("|");
    pairs.forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key && value) {
        params[key.trim()] = value.trim();
      }
    });

    return params;
  }

  /**
   * Check if element is a Mermaid diagram
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element is Mermaid-related
   */
  isMermaidElement(element) {
    if (
      !element ||
      !element.nodeType ||
      element.nodeType !== Node.ELEMENT_NODE
    ) {
      return false;
    }

    console.log("🔍 isMermaidElement: Checking element:", {
      tag: element.tagName,
      src: element.src || "N/A",
      className: element.className || "N/A",
      id: element.id || "N/A",
    });

    // Check for various Mermaid indicators
    const checks = [
      // Image with mermaid in src
      element.tagName === "IMG" &&
        element.src &&
        element.src.includes("mermaid"),
      // SVG with mermaid in id
      element.tagName === "SVG" && element.id && element.id.includes("mermaid"),
      // Element with mermaid class
      element.classList && element.classList.contains("mermaid"),
      // Element with mermaid data attribute
      element.getAttribute &&
        element.getAttribute("data-macro-name") === "mermaid",
      // Confluence structured macro
      element.tagName === "AC:STRUCTURED-MACRO" &&
        element.getAttribute("ac:name") === "mermaid",
      // Any image (for broader detection)
      element.tagName === "IMG" && element.src,
      // Any SVG
      element.tagName === "SVG",
    ];

    const result = checks.some((check) => check);
    console.log("🔍 isMermaidElement: Result:", result);

    return result;
  }

  /**
   * Bind zoom control events
   */
  bindZoomControls() {
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    const zoomResetBtn = document.getElementById("zoom-reset-btn");
    const previewContainer = document.getElementById(
      "mermaid-preview-container"
    );

    if (!zoomInBtn || !zoomOutBtn || !zoomResetBtn || !previewContainer) {
      console.warn("⚠️ Zoom controls not found");
      return;
    }

    // Zoom In
    zoomInBtn.addEventListener("click", () => {
      this.zoomIn();
    });

    // Zoom Out
    zoomOutBtn.addEventListener("click", () => {
      this.zoomOut();
    });

    // Reset Zoom
    zoomResetBtn.addEventListener("click", () => {
      this.resetZoom();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Only work when popup is open and not typing in input fields
      if (
        !this.isPopupOpen ||
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        this.zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        this.zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        this.resetZoom();
      }
    });

    // Mouse wheel zoom (Ctrl + wheel)
    previewContainer.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    });

    console.log("✅ Zoom controls bound successfully");
  }

  /**
   * Zoom in
   */
  zoomIn() {
    if (this.currentZoom < this.maxZoom) {
      this.currentZoom = Math.min(
        this.currentZoom + this.zoomStep,
        this.maxZoom
      );
      this.applyZoom();
    }
  }

  /**
   * Zoom out
   */
  zoomOut() {
    if (this.currentZoom > this.minZoom) {
      this.currentZoom = Math.max(
        this.currentZoom - this.zoomStep,
        this.minZoom
      );
      this.applyZoom();
    }
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom() {
    this.currentZoom = 1.0;
    this.applyZoom();
  }

  /**
   * Apply zoom to preview container
   */
  applyZoom() {
    const previewContainer = document.getElementById(
      "mermaid-preview-container"
    );
    const zoomDisplay = document.getElementById("zoom-level-display");

    if (!previewContainer) return;

    // Set zoom flag to prevent flicker
    this.isZooming = true;

    // Apply transform
    previewContainer.style.transform = `scale(${this.currentZoom})`;
    previewContainer.style.transformOrigin = "center center";

    // Update zoom display
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }

    // Update button states
    this.updateZoomButtonStates();

    console.log(`🔍 Zoom applied: ${Math.round(this.currentZoom * 100)}%`);

    // Reset zoom flag after a short delay
    setTimeout(() => {
      this.isZooming = false;
    }, 100);
  }

  /**
   * Update zoom button states (enable/disable)
   */
  updateZoomButtonStates() {
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");

    if (zoomInBtn) {
      zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
      zoomInBtn.style.opacity = this.currentZoom >= this.maxZoom ? "0.5" : "1";
    }

    if (zoomOutBtn) {
      zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
      zoomOutBtn.style.opacity = this.currentZoom <= this.minZoom ? "0.5" : "1";
    }
  }

  createPopupUI() {
    const root = document.createElement("div");
    root.id = "mermaid-ai-chat-root";
    root.innerHTML = `
      <style>
        .mermaid-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          font-weight: bold;
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zoom-btn {
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .zoom-btn:hover:not(:disabled) {
          background: #e6f3ff;
          border-color: #0066cc;
        }

        .zoom-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .zoom-level {
          font-size: 12px;
          font-weight: bold;
          color: #666;
          min-width: 40px;
          text-align: center;
        }

        .zoom-icon {
          font-size: 10px;
        }

        #mermaid-preview-container {
          transition: transform 0.2s ease;
          overflow: auto;
        }

        .mermaid-chat-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .mermaid-chat-save {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .mermaid-chat-save:hover:not(:disabled) {
          background: #218838;
        }

        .mermaid-chat-save:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      </style>
      <div id="mermaid-ai-chat-popup" class="mermaid-ai-chat-popup" style="display: none;">
        <div class="mermaid-ai-chat-header">
          <h3>🤖 Mermaid AI Chat Editor</h3>
          <button class="mermaid-ai-chat-close">&times;</button>
        </div>
        <div class="mermaid-ai-chat-body">
          <!-- Left Pane: Code Editor + Chat Input -->
          <div class="mermaid-ai-chat-left-pane">
            <!-- Code Editor Section -->
            <div class="mermaid-code-section">
              <div class="mermaid-code-header">
                📝 Mermaid Code
              </div>
              <textarea
                id="mermaid-code-editor"
                class="mermaid-code-editor"
                placeholder="Mermaid diagram code will appear here..."
              ></textarea>
            </div>

            <!-- Chat Input Section -->
            <div class="mermaid-chat-section">
              <div class="mermaid-chat-input-area">
                <textarea
                  id="mermaid-ai-chat-input"
                  class="mermaid-chat-input"
                  placeholder="💬 Describe how you want to modify the diagram..."
                  rows="2"
                ></textarea>
                <div class="mermaid-chat-buttons">
                  <button id="mermaid-ai-chat-save" class="mermaid-chat-save">
                    💾 Save
                  </button>
                  <button id="mermaid-ai-chat-send" class="mermaid-chat-send">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Pane: Mermaid Preview -->
          <div class="mermaid-ai-chat-right-pane">
            <div class="mermaid-preview-section">
              <div class="mermaid-preview-header">
                <span class="preview-title">📊 Diagram Preview</span>
                <div class="zoom-controls">
                  <button id="zoom-out-btn" class="zoom-btn" title="Zoom Out (-)">
                    <span class="zoom-icon">➖</span>
                  </button>
                  <span id="zoom-level-display" class="zoom-level">100%</span>
                  <button id="zoom-in-btn" class="zoom-btn" title="Zoom In (+)">
                    <span class="zoom-icon">➕</span>
                  </button>
                  <button id="zoom-reset-btn" class="zoom-btn" title="Reset Zoom (0)">
                    <span class="zoom-icon">🔄</span>
                  </button>
                </div>
              </div>
              <div class="mermaid-preview-body">
                <div id="mermaid-preview-container" class="mermaid-preview-container">
                  <div class="mermaid-preview-placeholder">
                    Click on a Mermaid diagram to start editing
                  </div>
                </div>
              </div>
            </div>
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
    const saveBtn = document.getElementById("mermaid-ai-chat-save");
    const input = document.getElementById("mermaid-ai-chat-input");
    const codeEditor = document.getElementById("mermaid-code-editor");

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

    // Save diagram
    saveBtn.addEventListener("click", () => {
      this.saveDiagram();
    });

    // Send on Enter (Ctrl+Enter for new line)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Code editor change event - update preview
    codeEditor.addEventListener("input", () => {
      this.updateMermaidPreview();
    });

    // ✅ Zoom controls
    this.bindZoomControls();

    // Click outside to close - with proper event handling
    setTimeout(() => {
      const handleClickOutside = (e) => {
        // Skip if popup is not open
        if (!this.isPopupOpen) return;

        // Skip if clicking on AI button (to prevent immediate close)
        if (e.target.closest(".macro-placeholder-property-panel-ai-button")) {
          return;
        }

        // ✅ Skip if clicking on AI button in ConfluenceEditor popup
        if (
          e.target.closest("#ai-send-btn") &&
          document.querySelector(".confluence-editor-overlay")
        ) {
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

    // Populate code editor with current content
    const codeEditor = document.getElementById("mermaid-code-editor");
    if (codeEditor && this.currentMermaidContent) {
      codeEditor.value = this.currentMermaidContent;
      // Trigger preview update
      this.updateMermaidPreview();
    }

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
   * Update Mermaid preview from code editor
   */
  async updateMermaidPreview() {
    const codeEditor = document.getElementById("mermaid-code-editor");
    if (!codeEditor) return;

    // ✅ Skip update if currently zooming to prevent flicker
    if (this.isZooming) {
      console.log("🔍 Skipping preview update during zoom to prevent flicker");
      return;
    }

    const code = codeEditor.value.trim();

    // Update current content
    this.currentMermaidContent = code;

    // Store current zoom level
    const currentZoom = this.currentZoom;

    // Use preview component to update
    await this.preview.updatePreview(code);

    // ✅ Reapply zoom after preview update to maintain zoom level
    if (currentZoom !== 1.0) {
      setTimeout(() => {
        this.currentZoom = currentZoom;
        this.applyZoom();
      }, 50); // Small delay to ensure DOM is updated
    }
  }

  hideChatPopup() {
    const popup = document.getElementById("mermaid-ai-chat-popup");
    const messagesContainer = document.getElementById(
      "mermaid-ai-chat-messages"
    );
    const input = document.getElementById("mermaid-ai-chat-input");

    // 🧱 Kiểm tra popup tồn tại trước khi ẩn
    if (popup) {
      popup.style.display = "none";
      this.isPopupOpen = false;
    } else {
      console.warn("⚠️ Không tìm thấy phần tử popup (mermaid-ai-chat-popup)");
    }

    // 🧹 Xóa tin nhắn, giữ lại system message
    if (messagesContainer) {
      const systemMessage = messagesContainer.querySelector(".system");

      // Chỉ reset khi container tồn tại
      messagesContainer.innerHTML = "";
      if (systemMessage) {
        messagesContainer.appendChild(systemMessage);
      } else {
        console.warn("⚠️ Không tìm thấy system message trong chat container");
      }
    } else {
      console.warn(
        "⚠️ Không tìm thấy phần tử messages container (mermaid-ai-chat-messages)"
      );
    }

    // 🧽 Xóa input nếu có
    if (input) {
      input.value = "";
    } else {
      console.warn("⚠️ Không tìm thấy input (mermaid-ai-chat-input)");
    }

    console.log("✅ Chat popup closed (đã kiểm tra đầy đủ phần tử)");
  }

  async sendMessage() {
    const input = document.getElementById("mermaid-ai-chat-input");
    const codeEditor = document.getElementById("mermaid-code-editor");
    const sendBtn = document.getElementById("mermaid-ai-chat-send");
    const message = input.value.trim();

    if (!message) return;

    // Get current code from editor
    const currentCode = codeEditor.value.trim();
    if (!currentCode) {
      alert("⚠️ Please enter some Mermaid code first");
      return;
    }

    // Update current content
    this.currentMermaidContent = currentCode;

    // Disable send button and show loading
    sendBtn.disabled = true;
    sendBtn.textContent = "🤔 Thinking...";
    input.disabled = true;

    try {
      // Call AI service
      const response = await this.aiService.modifyDiagram(
        this.currentMermaidContent,
        message
      );

      // Update code editor with new diagram
      codeEditor.value = response.edited_diagram;
      this.currentMermaidContent = response.edited_diagram;

      // Update preview
      await this.updateMermaidPreview();

      // Clear input
      input.value = "";

      console.log("✅ Diagram updated successfully by AI");
    } catch (error) {
      console.error("❌ AI API error:", error);

      // Get user-friendly error message
      const errorMessage = this.aiService.getErrorMessage(error);
      alert(`❌ ${errorMessage}`);
    } finally {
      // Re-enable controls
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
      input.disabled = false;
      input.focus();
    }
  }

  /**
   * Save the current diagram back to Confluence
   */
  async saveDiagram() {
    const codeEditor = document.getElementById("mermaid-code-editor");
    const saveBtn = document.getElementById("mermaid-ai-chat-save");

    if (!codeEditor) {
      alert("❌ Code editor not found");
      return;
    }

    const currentCode = codeEditor.value.trim();
    if (!currentCode) {
      alert("⚠️ Please enter some Mermaid code first");
      return;
    }

    // Update current content
    this.currentMermaidContent = currentCode;

    // Disable save button and show loading
    saveBtn.disabled = true;
    saveBtn.textContent = "💾 Saving...";

    try {
      // Get saved diagram info from localStorage
      const diagramInfoStr = localStorage.getItem("mermaid_diagram_info");
      if (!diagramInfoStr) {
        throw new Error(
          "No diagram info found. Please click on a Mermaid image first."
        );
      }

      const diagramInfo = JSON.parse(diagramInfoStr);
      const pageId = MermaidApiClient.extractPageId();

      if (!pageId) {
        throw new Error("Could not extract page ID from current page.");
      }

      console.log(`💾 Saving diagram with info:`, diagramInfo);

      // Step 1: Update the Mermaid diagram with full data
      const updateData = await this.updateMermaidDiagram(
        diagramInfo.filename,
        pageId,
        currentCode,
        diagramInfo.parsedParams
      );
      const reversionNew = updateData?.revision ? updateData.revision : 1;
      // Step 2: Generate new placeholder image
      const newImageHtml = await this.generatePlaceholderImage(
        pageId,
        diagramInfo.parsedParams,
        reversionNew
      );

      // Step 3: Replace old image with new image in DOM
      await this.replaceImageInDOM(
        diagramInfo.parsedParams?.filename,
        newImageHtml
      );

      // Show success message
      alert("✅ Diagram saved and updated successfully!");

      // Close the popup after successful save
      this.hideChatPopup();
    } catch (error) {
      console.error("❌ Error saving diagram:", error);
      alert(`❌ Error saving diagram: ${error.message}`);
    } finally {
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save";
    }
  }

  /**
   * Update Mermaid diagram with full data (filename, data, svg, png)
   */
  async updateMermaidDiagram(filename, pageId, mermaidCode, parsedParams) {
    console.log(`🔄 Updating Mermaid diagram: ${filename} on page ${pageId}`);

    // Generate SVG and PNG from Mermaid code
    const { svg, png } = await this.generateMermaidAssets(mermaidCode);

    // Get current revision and increment it
    const currentRevision = parseInt(parsedParams?.revision || "1");

    const updateData = {
      filename: filename,
      data: mermaidCode,
      revision: currentRevision + 1,
      svg: svg,
      png: png,
    };

    console.log("📤 Sending diagram update:", {
      filename,
      revision: currentRevision + 1,
      dataLength: mermaidCode.length,
      svgLength: svg.length,
      pngLength: png.length,
    });

    const response = await fetch(
      `${CONFLUENCE_API_URLS.MERMAID_UPDATE}/${pageId}`,
      {
        method: "PUT",
        headers: {
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json; charset=utf-8",
          Pragma: "no-cache",
          Referer: CONFLUENCE_API_URLS.MERMAID_EDIT_REFERER,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": navigator.userAgent,
          "X-Requested-With": "XMLHttpRequest",
          "X-Atlassian-Token": "no-check",
          "sec-ch-ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Mermaid Update API Error: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("✅ Mermaid diagram updated successfully:", result);
    return result;
  }

  /**
   * Generate SVG and PNG assets from Mermaid code
   */
  async generateMermaidAssets(mermaidCode) {
    try {
      // Import Mermaid dynamically if not already available
      if (!window.mermaid) {
        console.log("📦 Loading Mermaid library...");
        // Try to use existing Mermaid from page or load it
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Initialize Mermaid if needed
      if (!window.mermaid.mermaidAPI) {
        window.mermaid.initialize({ startOnLoad: false });
      }

      console.log("🎨 Generating SVG from Mermaid code...");

      // Generate SVG
      const { svg } = await window.mermaid.render("temp-diagram", mermaidCode);

      console.log("✅ SVG generated successfully", svg);

      // Generate PNG from SVG using new method
      const pngDataUrl = await this.convertSvgToPngDataUrl(svg);

      if (!pngDataUrl) {
        throw new Error("Failed to convert SVG to PNG");
      }

      // Extract base64 part from data URL (remove "data:image/png;base64," prefix)
      const pngBase64 = pngDataUrl.split(",")[1];

      console.log("✅ PNG generated successfully");

      return {
        svg: svg,
        png: pngBase64,
      };
    } catch (error) {
      console.error("❌ Error generating Mermaid assets:", error);
      throw new Error(`Failed to generate Mermaid assets: ${error.message}`);
    }
  }

  /**
   * Encode SVG for API
   */
  encodeSvg(svg) {
    // Encode SVG to base64
    return btoa(
      new TextEncoder()
        .encode(svg)
        .reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
  }

  /**
   * Chuyển đổi chuỗi SVG thành chuỗi Data URL của định dạng PNG.
   * @param {string} svgString Chuỗi XML của SVG (ví dụ: <svg>...</svg>).
   * @param {number} scale Hệ số phóng đại (ví dụ: 2 để tăng gấp đôi độ phân giải).
   * @returns {Promise<string|null>} Promise trả về chuỗi Data URL (data:image/png;base64,...)
   */
  async convertSvgToPngDataUrl(svgString, scale = 2) {
    return new Promise((resolve) => {
      if (!svgString) {
        console.error("Lỗi: Chuỗi SVG đầu vào rỗng.");
        return resolve(null);
      }

      // 1. Mã hóa chuỗi SVG thành Data URL
      // Cần đảm bảo chuỗi không có ký tự đặc biệt gây lỗi.
      const svgUrl =
        "data:image/svg+xml;base64," +
        btoa(
          new TextEncoder()
            .encode(svgString)
            .reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = function () {
        // Lấy kích thước gốc của SVG
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Đặt kích thước Canvas (Áp dụng Scale để có độ phân giải cao hơn)
        canvas.width = originalWidth * scale;
        canvas.height = originalHeight * scale;

        // Quan trọng: Tối ưu hóa chất lượng hình ảnh
        ctx.scale(scale, scale);
        ctx.fillStyle = "white"; // Đặt nền trắng (PNG mặc định trong suốt nếu không set)
        ctx.fillRect(0, 0, originalWidth, originalHeight); // Phủ nền trắng

        // Vẽ ảnh SVG lên Canvas
        ctx.drawImage(img, 0, 0);

        // 3. Xuất ra chuỗi Data URL định dạng PNG
        const pngDataUrl = canvas.toDataURL("image/png");

        // Dọn dẹp
        canvas.remove();

        resolve(pngDataUrl);
      };

      img.onerror = function (err) {
        console.error("Lỗi khi tải SVG vào Image object:", err);
        // Dọn dẹp
        canvas.remove();
        resolve(null);
      };

      // Bắt đầu tải ảnh SVG đã mã hóa
      img.src = svgUrl;
    });
  }

  /**
   * Convert SVG to PNG base64 (legacy method)
   */
  async svgToPng(svg) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get base64 PNG (remove data:image/png;base64, prefix)
        const pngBase64 = canvas.toDataURL("image/png").split(",")[1];
        resolve(pngBase64);
      };

      img.onerror = (error) => {
        reject(new Error(`Failed to convert SVG to PNG: ${error}`));
      };

      // Create blob URL for SVG
      const svgBlob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    });
  }

  /**
   * Save Mermaid code to Confluence (legacy method - kept for compatibility)
   */
  async saveMermaidCode(filename, pageId, mermaidCode) {
    const response = await fetch(CONFLUENCE_API_URLS.MERMAID_SAVE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: JSON.stringify({
        pageId: pageId,
        filename: filename,
        mermaidCode: mermaidCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Mermaid Save API Error: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("✅ Mermaid code saved successfully:", result);
    return result;
  }

  /**
   * Generate new placeholder image using TinyMCE API
   */
  async generatePlaceholderImage(pageId, parsedParams, reversionNew) {
    const macroData = {
      contentId: pageId,
      macro: {
        name: "mermaid-cloud",
        params: {
          filename: parsedParams?.filename || "Diagram",
          revision: reversionNew, // Increment revision
          zoom: parsedParams?.zoom || "fit",
          toolbar: parsedParams?.toolbar || "bottom",
          format: parsedParams?.format || "svg",
        },
      },
    };

    console.log("🖼️ Generating placeholder with data:", macroData);

    const response = await fetch(CONFLUENCE_API_URLS.TINYMCE_PLACEHOLDER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "text/plain, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "X-Atlassian-Token": "no-check",
      },
      body: JSON.stringify(macroData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TinyMCE Placeholder API Error: ${response.status} - ${errorText}`
      );
    }

    const newImageHtml = await response.text();
    console.log("✅ New placeholder image generated:", newImageHtml);

    return newImageHtml;
  }

  /**
   * Replace old image with new image in DOM by filename
   */
  async replaceImageInDOM(filename, newImageHtml) {
    if (!filename || !newImageHtml) {
      console.error("❌ Missing filename or newImageHtml");
      return;
    }

    console.log(`🔄 Looking for images with filename: ${filename}`);

    // Create temporary element to parse new image HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = newImageHtml;
    const newImg = tempDiv.querySelector("img");

    if (!newImg) {
      throw new Error("Could not parse new image from HTML");
    }

    console.log("🆕 New image element:", newImg);

    // Find images by filename in data-macro-parameters
    const foundImages = this.findImagesByFilename(filename);

    console.log(`🔍 Found ${foundImages.length} images to replace`);

    foundImages.forEach((oldImg, index) => {
      console.log(`🔄 Replacing image ${index + 1}:`, oldImg);

      // Replace all attributes from new image to old image
      this.replaceImageAttributes(oldImg, newImg);

      console.log("✅ Image replaced successfully:", oldImg);
    });
  }

  /**
   * Find images by filename in data-macro-parameters
   */
  findImagesByFilename(filename) {
    const foundImages = [];

    // Search in main document
    const mainImages = document.querySelectorAll("img[data-macro-parameters]");
    mainImages.forEach((img) => {
      const macroParams = img.getAttribute("data-macro-parameters");
      if (macroParams && macroParams.includes(`filename=${filename}`)) {
        foundImages.push(img);
      }
    });

    // Search in iframes (Confluence editor)
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        const iframeImages = iframeDoc.querySelectorAll(
          "img[data-macro-parameters]"
        );

        iframeImages.forEach((img) => {
          const macroParams = img.getAttribute("data-macro-parameters");
          if (macroParams && macroParams.includes(`filename=${filename}`)) {
            foundImages.push(img);
          }
        });
      } catch (error) {
        console.warn("Could not access iframe content:", error);
      }
    });

    return foundImages;
  }

  /**
   * Replace all attributes from new image to old image
   */
  replaceImageAttributes(oldImg, newImg) {
    // Get all attributes from new image
    const newAttributes = newImg.attributes;

    // Remove all old attributes except those we want to keep
    const attributesToKeep = ["id", "class"]; // Keep these if you want
    const oldAttributes = Array.from(oldImg.attributes);

    oldAttributes.forEach((attr) => {
      if (!attributesToKeep.includes(attr.name)) {
        oldImg.removeAttribute(attr.name);
      }
    });

    // Copy all attributes from new image
    Array.from(newAttributes).forEach((attr) => {
      oldImg.setAttribute(attr.name, attr.value);
    });

    console.log("🔄 Attributes replaced:", {
      old: oldAttributes.map((a) => `${a.name}="${a.value}"`),
      new: Array.from(newAttributes).map((a) => `${a.name}="${a.value}"`),
    });
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
}

// Export for use as service in K-Tool Extension
// Initialization will be handled by the main content.js
