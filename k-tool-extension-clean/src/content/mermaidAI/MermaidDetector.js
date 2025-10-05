/**
 * Mermaid Diagram Detector
 * Handles detection of Mermaid diagrams on the page and click events
 */
export class MermaidDetector {
  constructor(onMermaidClick) {
    this.onMermaidClick = onMermaidClick;
    this.lastClickedElement = null;
    this.lastClickPosition = { x: 0, y: 0 };
  }

  /**
   * Setup Mermaid detection
   */
  setupDetection() {
    console.log("🔍 Setting up Mermaid detection...");
    
    // Setup main document click detection
    this.setupMainDocumentDetection();
    
    // Setup iframe detection
    this.setupIframeDetection();
    
    // Setup page change detection
    this.setupPageChangeDetection();
    
    console.log("✅ Mermaid detection setup completed");
  }

  /**
   * Setup main document click detection
   */
  setupMainDocumentDetection() {
    document.addEventListener("click", (event) => {
      this.handleClick(event);
    });

    // Observe for dynamically added Mermaid content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForMermaidElements(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Setup iframe event listeners for Confluence editor
   */
  setupIframeDetection() {
    console.log("🔍 Setting up iframe detection...");
    
    // Find all iframes
    const iframes = document.querySelectorAll("iframe");
    console.log(`🔍 Found ${iframes.length} iframes to monitor`);

    iframes.forEach((iframe, index) => {
      try {
        console.log(`🔍 IFRAME ${index}: Checking iframe:`, {
          src: iframe.src,
          id: iframe.id,
          className: iframe.className,
        });

        let iframeDoc;
        try {
          iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        } catch (crossOriginError) {
          console.log(
            `⚠️ IFRAME ${index}: Cross-origin iframe, skipping:`,
            crossOriginError.message
          );
          return;
        }

        if (!iframeDoc) {
          console.log(
            `⚠️ IFRAME ${index}: Cannot access iframe document (cross-origin?)`
          );
          return;
        }

        console.log(
          `✅ IFRAME ${index}: Iframe document accessible, adding click listeners...`
        );

        // Click handler for iframe content
        const clickHandler = (event) => {
          console.log(`🖱️ IFRAME ${index} CLICK: Element clicked:`, {
            tag: event.target.tagName,
            classes: event.target.className,
            id: event.target.id,
            src: event.target.src || "N/A",
            alt: event.target.alt || "N/A",
            element: event.target,
          });

          // Check if clicked element is an image (potential Mermaid diagram)
          if (
            event.target.tagName === "IMG" ||
            event.target.tagName === "SVG"
          ) {
            console.log(
              `🎯 SAVING: Image clicked - saving element and position`
            );
            
            // Save clicked element and position
            this.lastClickedElement = event.target;
            this.lastClickPosition = {
              x: event.clientX + iframe.offsetLeft,
              y: event.clientY + iframe.offsetTop,
            };

            console.log("🎯 SAVED:", {
              element: this.lastClickedElement,
              position: this.lastClickPosition,
            });
          }
        };

        // Add click listener to iframe document
        iframeDoc.addEventListener("click", clickHandler, true);

        console.log(`✅ IFRAME ${index}: Click listener added successfully`);
      } catch (error) {
        console.error(`❌ IFRAME ${index}: Error setting up iframe:`, error);
      }
    });
  }

  /**
   * Handle click events
   * @param {Event} event - Click event
   */
  handleClick(event) {
    // Check if clicked element is related to Mermaid
    if (this.isMermaidElement(event.target)) {
      console.log("🎯 Mermaid element clicked:", event.target);
      
      // Save click info
      this.lastClickedElement = event.target;
      this.lastClickPosition = {
        x: event.clientX,
        y: event.clientY
      };

      // Trigger callback
      if (this.onMermaidClick) {
        this.onMermaidClick(event.target, this.lastClickPosition);
      }
    }
  }

  /**
   * Check if element is a Mermaid diagram
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element is Mermaid-related
   */
  isMermaidElement(element) {
    // Check for various Mermaid indicators
    const selectors = [
      'img[src*="mermaid"]',
      'svg[id*="mermaid"]',
      '.mermaid',
      '[data-macro-name="mermaid"]',
      'ac\\:structured-macro[ac\\:name="mermaid"]'
    ];

    return selectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check for Mermaid elements in a node
   * @param {Node} node - Node to check
   */
  checkForMermaidElements(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // Check if the node itself is a Mermaid element
    if (this.isMermaidElement(node)) {
      console.log("🔍 New Mermaid element detected:", node);
    }

    // Check child elements
    const mermaidElements = node.querySelectorAll(
      'img[src*="mermaid"], svg[id*="mermaid"], .mermaid, [data-macro-name="mermaid"]'
    );
    
    if (mermaidElements.length > 0) {
      console.log(`🔍 Found ${mermaidElements.length} new Mermaid elements`);
    }
  }

  /**
   * Setup page change detection for SPA navigation
   */
  setupPageChangeDetection() {
    // Method 1: Listen for Confluence-specific events
    if (window.AJS && AJS.bind) {
      // Editor events
      AJS.bind("init.rte", () => {
        console.log("🔄 PAGE CHANGE: Confluence RTE initialized - re-setting up iframe listeners");
        setTimeout(() => this.setupIframeDetection(), 1000);
      });

      AJS.bind("rte-ready", () => {
        console.log("🔄 PAGE CHANGE: Confluence RTE ready - re-setting up iframe listeners");
        setTimeout(() => this.setupIframeDetection(), 1000);
      });

      // Page events
      AJS.bind("page.edit.ready", () => {
        console.log("🔄 PAGE CHANGE: Page edit ready - re-setting up iframe listeners");
        setTimeout(() => this.setupIframeDetection(), 1500);
      });

      AJS.bind("page.view.ready", () => {
        console.log("🔄 PAGE CHANGE: Page view ready - re-setting up iframe listeners");
        setTimeout(() => this.setupIframeDetection(), 1000);
      });
    }

    // Method 2: Watch for URL changes (SPA navigation)
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        console.log("🔄 PAGE CHANGE: URL changed from", currentUrl, "to", window.location.href);
        currentUrl = window.location.href;

        // Re-setup after URL change
        setTimeout(() => {
          console.log("🔄 PAGE CHANGE: Re-setting up iframe listeners after URL change");
          this.setupIframeDetection();
        }, 2000);
      }
    };

    // Check URL changes every 2 seconds
    setInterval(checkUrlChange, 2000);

    // Method 3: Listen for popstate events
    window.addEventListener("popstate", () => {
      console.log("🔄 PAGE CHANGE: Popstate event - re-setting up iframe listeners");
      setTimeout(() => this.setupIframeDetection(), 1000);
    });
  }

  /**
   * Get last clicked element
   * @returns {HTMLElement|null} Last clicked element
   */
  getLastClickedElement() {
    return this.lastClickedElement;
  }

  /**
   * Get last click position
   * @returns {Object} Last click position {x, y}
   */
  getLastClickPosition() {
    return this.lastClickPosition;
  }
}
