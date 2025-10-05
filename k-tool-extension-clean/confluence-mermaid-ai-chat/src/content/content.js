// Mermaid AI Chat functionality for K-Tool Extension
import { ApiClient } from "../shared/api.js";

export class MermaidAIChat {
  constructor() {
    this.isPopupOpen = false;
    this.currentMermaidContent = "";
    this.currentMermaidElement = null;
    this.init();
  }

  async init() {
    console.log("🎨 Mermaid AI Chat initializing...");

    // Check if already injected
    if (document.getElementById("mermaid-ai-chat-root")) {
      console.log("🔍 Mermaid AI Chat already injected, skipping...");
      return;
    }

    // Setup detection and UI
    this.setupMermaidDetection();
    this.createPopupUI();

    console.log("✅ Mermaid AI Chat ready");
  }

  setupMermaidDetection() {
    console.log("🔍 Setting up Mermaid detection...");

    // Detect clicks on Mermaid diagrams
    document.addEventListener("click", (event) => {
      this.handleClick(event);
    });

    // Also observe for dynamically added Mermaid content
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
      subtree: true,
    });
  }

  handleClick(event) {
    const clickedElement = event.target;

    // Check if clicked on Mermaid diagram
    const mermaidElement = this.findMermaidElement(clickedElement);

    if (mermaidElement) {
      console.log("🎯 Clicked on Mermaid diagram:", mermaidElement);

      // Extract Mermaid content
      const mermaidContent = this.extractMermaidContent(mermaidElement);

      if (mermaidContent) {
        console.log("📄 Extracted Mermaid content:", mermaidContent);
        this.currentMermaidContent = mermaidContent;
        this.currentMermaidElement = mermaidElement;
        this.showChatPopup(event.clientX, event.clientY);
      }
    }
  }

  findMermaidElement(element) {
    // Check if element itself is a Mermaid diagram
    if (this.isMermaidElement(element)) {
      return element;
    }

    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (this.isMermaidElement(parent)) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  isMermaidElement(element) {
    if (!element || !element.tagName) return false;

    // Check for various Mermaid indicators
    const indicators = [
      // Mermaid for Confluence plugin
      element.classList.contains("mermaid"),
      element.classList.contains("mermaid-diagram"),
      element.querySelector && element.querySelector(".mermaid"),
      element.querySelector && element.querySelector("svg[id*='mermaid']"),

      // Confluence structured macro
      element.tagName.toLowerCase() === "ac:structured-macro" &&
        element.getAttribute("ac:name") === "mermaid",

      // Check for Mermaid SVG content
      element.tagName.toLowerCase() === "svg" &&
        element.id &&
        element.id.includes("mermaid"),

      // Check for Mermaid wrapper divs
      element.classList.contains("mermaid-wrapper"),
      element.classList.contains("diagram-container"),
    ];

    return indicators.some((indicator) => indicator);
  }

  extractMermaidContent(element) {
    console.log("🔍 Extracting Mermaid content from:", element);

    // Try different methods to extract Mermaid source code

    // 1. Check for Confluence structured macro
    if (
      element.tagName &&
      element.tagName.toLowerCase() === "ac:structured-macro"
    ) {
      const codeParam = element.querySelector(
        'ac\\:parameter[ac\\:name="code"]'
      );
      if (codeParam) {
        return codeParam.textContent || codeParam.innerText;
      }
    }

    // 2. Check for data attributes
    if (element.dataset && element.dataset.mermaid) {
      return element.dataset.mermaid;
    }

    // 3. Check for script tags with Mermaid content
    const scriptTag = element.querySelector('script[type="text/mermaid"]');
    if (scriptTag) {
      return scriptTag.textContent || scriptTag.innerText;
    }

    // 4. Check for pre/code tags with Mermaid content
    const codeTag = element.querySelector("pre code, code");
    if (codeTag) {
      const content = codeTag.textContent || codeTag.innerText;
      if (this.isMermaidSyntax(content)) {
        return content;
      }
    }

    // 5. Try to extract from SVG title or description
    const svg =
      element.querySelector("svg") ||
      (element.tagName === "SVG" ? element : null);
    if (svg) {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");

      if (title && this.isMermaidSyntax(title.textContent)) {
        return title.textContent;
      }
      if (desc && this.isMermaidSyntax(desc.textContent)) {
        return desc.textContent;
      }
    }

    // 6. Fallback: return a generic message
    return "graph TD\n    A[Current Diagram] --> B[AI Enhanced]\n    B --> C[Updated Diagram]";
  }

  isMermaidSyntax(text) {
    if (!text || typeof text !== "string") return false;

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
      "sankey",
    ];

    const trimmedText = text.trim().toLowerCase();
    return mermaidKeywords.some((keyword) => trimmedText.startsWith(keyword));
  }

  checkForMermaidElements(node) {
    if (this.isMermaidElement(node)) {
      console.log("🆕 New Mermaid element detected:", node);
    }

    // Check child elements
    if (node.querySelectorAll) {
      const mermaidElements = node.querySelectorAll(
        ".mermaid, [ac\\:name='mermaid'], svg[id*='mermaid']"
      );
      mermaidElements.forEach((element) => {
        console.log("🆕 New Mermaid child element detected:", element);
      });
    }
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
    const closeBtn = popup.querySelector(".mermaid-ai-chat-close");
    const sendBtn = document.getElementById("mermaid-ai-chat-send");
    const input = document.getElementById("mermaid-ai-chat-input");

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

    // Close on outside click
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        this.hideChatPopup();
      }
    });
  }

  showChatPopup(x, y) {
    const popup = document.getElementById("mermaid-ai-chat-popup");
    popup.style.display = "block";
    popup.style.left = Math.min(x, window.innerWidth - 400) + "px";
    popup.style.top = Math.min(y, window.innerHeight - 300) + "px";

    this.isPopupOpen = true;

    // Focus input
    setTimeout(() => {
      const input = document.getElementById("mermaid-ai-chat-input");
      input.focus();
    }, 100);
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

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.mermaidAIChat = new MermaidAIChat();
  });
} else {
  window.mermaidAIChat = new MermaidAIChat();
}
