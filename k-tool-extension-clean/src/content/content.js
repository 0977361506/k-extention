// K-Tool Extension Content Script
import { ApiClient, ConfluenceApi } from "../shared/api.js";
import { PROGRESS_STEPS } from "../shared/constants.js";
import { StorageManager } from "../shared/storage.js";
import { ConfluenceEditor } from "./confluenceEditor.js";

class KToolContent {
  constructor() {
    this.settings = {};
    this.isModalOpen = false;
    this.currentTab = "generate";
    this.generationJob = null;
    this.progressSteps = [...PROGRESS_STEPS];
    this.confluenceEditor = null;
    this.init();
  }

  async init() {
    console.log("🚀 K-Tool Content Script initializing...");

    // Check if already injected
    if (document.getElementById("ktool-root")) {
      console.log("🔍 K-Tool already injected, skipping...");
      return;
    }

    // Load settings
    await this.loadSettings();

    // Inject UI
    this.injectUI();

    // Bind events
    this.bindEvents();

    // Initialize Confluence Editor
    try {
      console.log("🔧 Initializing ConfluenceEditor...");
      this.confluenceEditor = new ConfluenceEditor();
      console.log("✅ ConfluenceEditor initialized:", this.confluenceEditor);
    } catch (error) {
      console.error("❌ Error initializing ConfluenceEditor:", error);
      this.confluenceEditor = null;
    }

    // Make available globally for debugging
    window.ktoolContent = this;

    console.log("✅ K-Tool Content Script ready");
  }

  async loadSettings() {
    try {
      this.settings = await StorageManager.getSettings();
      console.log("⚙️ Settings loaded:", this.settings);
    } catch (error) {
      console.error("❌ Error loading settings:", error);
    }
  }

  injectUI() {
    // Create root container
    const root = document.createElement("div");
    root.id = "ktool-root";
    document.body.appendChild(root);

    // Create bubble button
    const bubble = this.createBubble();
    root.appendChild(bubble);

    // Create modal (initially hidden)
    const modal = this.createModal();
    root.appendChild(modal);
  }

  createBubble() {
    const bubble = document.createElement("div");
    bubble.className = `ktool-bubble ${
      !this.settings.isEnabled ? "disabled" : ""
    }`;

    bubble.innerHTML = `
      <div class="ktool-bubble-icon">K</div>
      <div class="ktool-tooltip">
        ${
          this.settings.isEnabled
            ? "🚀 K-Tool Document Generator<br/>Click để mở công cụ sinh tài liệu"
            : "⚠️ K-Tool đã tắt<br/>Vui lòng bật trong settings"
        }
      </div>
    `;

    bubble.addEventListener("click", () => {
      if (this.settings.isEnabled) {
        this.openModal();
      } else {
        this.showNotification(
          "K-Tool đã tắt. Vui lòng bật trong extension settings.",
          "warning"
        );
      }
    });

    return bubble;
  }

  createModal() {
    const overlay = document.createElement("div");
    overlay.className = "ktool-modal-overlay";

    overlay.innerHTML = `
      <div class="ktool-modal">
        <div class="ktool-modal-header">
          <h2 class="ktool-modal-title">K-Tool Document Generator</h2>
          <button class="ktool-modal-close" type="button">&times;</button>
        </div>
        <div class="ktool-modal-body">
          <div class="ktool-tabs">
            <button class="ktool-tab active" data-tab="generate">📄 Sinh tài liệu</button>
            <button class="ktool-tab" data-tab="preview">👁️ Preview</button>
            <button class="ktool-tab" data-tab="settings">⚙️ Settings</button>
          </div>
          
          <!-- Generate Tab -->
          <div class="ktool-tab-content active" data-tab="generate">
            ${this.createGenerateTab()}
          </div>
          
          <!-- Preview Tab -->
          <div class="ktool-tab-content" data-tab="preview" id="previewTab">
            ${this.createPreviewTab()}
          </div>
          
          <!-- Settings Tab -->
          <div class="ktool-tab-content" data-tab="settings">
            ${this.createSettingsTab()}
          </div>
        </div>
      </div>
    `;

    return overlay;
  }

  createGenerateTab() {
    return `
      <div class="ktool-form">
        <div class="ktool-form-group">
          <label class="ktool-form-label">URL tài liệu BA *</label>
          <input 
            type="url" 
            class="ktool-form-input" 
            id="baDocUrl" 
            placeholder="https://confluence.com/pages/123456"
            value="${window.location.href}"
          >
        </div>
        
        <div class="ktool-form-group">
          <label class="ktool-form-label">Ghi chú thêm (tùy chọn)</label>
          <textarea 
            class="ktool-form-textarea" 
            id="additionalNotes" 
            placeholder="Thêm ghi chú hoặc yêu cầu đặc biệt..."
            rows="3"
          ></textarea>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button class="ktool-btn ktool-btn-primary" id="generateBtn">
            🔧 Tạo tài liệu
          </button>
          <button class="ktool-btn ktool-btn-secondary" id="resetBtn">
            🔄 Reset
          </button>
        </div>
      </div>
      
      <!-- Progress Section -->
      <div class="ktool-progress" id="progressSection" style="display: none;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px;">Tiến trình sinh tài liệu:</h3>
        <div id="progressSteps"></div>
      </div>
    `;
  }

  createPreviewTab() {
    return `
      <div class="ktool-form">
        <div style="text-align: center; padding: 40px; color: #6c757d;">
          <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
          <h3 style="margin: 0 0 8px 0;">Chưa có nội dung để preview</h3>
          <p style="margin: 0;">Vui lòng sinh tài liệu trước khi preview.</p>
        </div>
      </div>
    `;
  }

  createSettingsTab() {
    return `
      <div class="ktool-form">
        <div style="text-align: center; padding: 40px; color: #6c757d;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
          <h3 style="margin: 0 0 8px 0;">Cài đặt Extension</h3>
          <p style="margin: 0 0 16px 0;">Click vào icon extension trên toolbar để cài đặt.</p>
          <button class="ktool-btn ktool-btn-primary" onclick="chrome.runtime.openOptionsPage?.() || alert('Vui lòng click vào icon K-Tool trên toolbar để cài đặt')">
            🔧 Mở Settings
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const modal = document.querySelector(".ktool-modal-overlay");

    // Close modal events
    modal.querySelector(".ktool-modal-close").addEventListener("click", () => {
      this.closeModal();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    // Tab switching
    const tabs = modal.querySelectorAll(".ktool-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Generate button
    const generateBtn = modal.querySelector("#generateBtn");
    generateBtn.addEventListener("click", () => {
      this.handleGenerate();
    });

    // Reset button
    const resetBtn = modal.querySelector("#resetBtn");
    resetBtn.addEventListener("click", () => {
      this.handleReset();
    });

    // Listen for settings changes from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "settingsChanged") {
        this.settings = request.settings;
        this.updateBubbleState();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to close modal
      if (e.key === "Escape" && this.isModalOpen) {
        this.closeModal();
      }

      // Ctrl/Cmd + K to open modal
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && !this.isModalOpen) {
        e.preventDefault();
        if (this.settings.isEnabled) {
          this.openModal();
        }
      }
    });
  }

  openModal() {
    const modal = document.querySelector(".ktool-modal-overlay");
    modal.classList.add("show");
    this.isModalOpen = true;

    // Focus first input
    setTimeout(() => {
      const firstInput = modal.querySelector(".ktool-form-input");
      if (firstInput) firstInput.focus();
    }, 300);
  }

  closeModal() {
    const modal = document.querySelector(".ktool-modal-overlay");
    modal.classList.remove("show");
    this.isModalOpen = false;
  }

  switchTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll(".ktool-tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Update tab content
    const contents = document.querySelectorAll(".ktool-tab-content");
    contents.forEach((content) => {
      content.classList.toggle("active", content.dataset.tab === tabName);
    });

    this.currentTab = tabName;
  }

  updateBubbleState() {
    const bubble = document.querySelector(".ktool-bubble");
    const tooltip = bubble.querySelector(".ktool-tooltip");

    if (this.settings.isEnabled) {
      bubble.classList.remove("disabled");
      tooltip.innerHTML =
        "🚀 K-Tool Document Generator<br/>Click để mở công cụ sinh tài liệu";
    } else {
      bubble.classList.add("disabled");
      tooltip.innerHTML = "⚠️ K-Tool đã tắt<br/>Vui lòng bật trong settings";
    }
  }

  async handleGenerate() {
    const baDocUrl = document.getElementById("baDocUrl").value.trim();
    const additionalNotes = document
      .getElementById("additionalNotes")
      .value.trim();

    if (!baDocUrl) {
      this.showNotification("Vui lòng nhập URL tài liệu BA!", "error");
      return;
    }

    // Validate settings
    const validation = StorageManager.validateSettings(this.settings);
    if (!validation.isValid) {
      this.showNotification(
        "Vui lòng cấu hình đầy đủ settings trước khi sinh tài liệu!",
        "error"
      );
      this.switchTab("settings");
      return;
    }

    try {
      // Show progress
      this.showProgress();
      this.updateProgress(0, "active");

      // Step 1: Extract page ID and fetch BA content
      const pageId = ConfluenceApi.extractPageId(baDocUrl);
      if (!pageId) {
        throw new Error(
          "❌ URL không hợp lệ! Vui lòng kiểm tra lại URL Confluence page."
        );
      }

      console.log("🔍 Fetching content for pageId:", pageId);
      const baDocument = await ConfluenceApi.fetchPageContent(pageId);
      if (!baDocument) {
        throw new Error("❌ Không thể lấy nội dung tài liệu BA!");
      }

      // Extract images from BA content (HTML) and convert all to base64
      const images = await ConfluenceApi.extractImagesFromHtml(
        baDocument.content
      );
      console.log("🖼️ Extracted images (all base64):", images);

      this.updateProgress(0, "completed");
      this.updateProgress(1, "active");

      // Step 2: Clone template structure
      if (!this.settings.urlTemplate) {
        throw new Error("⚠️ Vui lòng setting template của tài liệu!");
      }

      console.log("🔄 Cloning template from:", this.settings.urlTemplate);
      const clonedTemplate = await ConfluenceApi.cloneTemplateForGeneration(
        this.settings.urlTemplate
      );

      if (!clonedTemplate) {
        throw new Error(
          "❌ Không thể clone template! Vui lòng kiểm tra URL template trong Settings."
        );
      }

      console.log("✅ Template cloned successfully:", clonedTemplate.title);
      this.updateProgress(1, "completed");
      this.updateProgress(2, "active");

      // Step 3: Analyze placeholders with << >>
      const placeholders = ConfluenceApi.extractPlaceholders(
        clonedTemplate.originalStorageFormat
      );
      console.log("🔍 Found placeholders <<>>:", placeholders);

      if (placeholders.length === 0) {
        throw new Error(
          "⚠️ Không tìm thấy placeholder nào có dạng <<Tên>>. Vui lòng kiểm tra template!"
        );
      }

      this.updateProgress(2, "completed");
      this.updateProgress(3, "active");

      // Get instructions if available
      let instructions = "";
      if (this.settings.instructionUrl) {
        const instructionPageId = ConfluenceApi.extractPageId(
          this.settings.instructionUrl
        );
        if (instructionPageId) {
          console.log(
            "🔍 Fetching instruction content for pageId:",
            instructionPageId
          );
          const instructionDoc = await ConfluenceApi.fetchPageContent(
            instructionPageId
          );
          instructions = instructionDoc?.content || "";
        } else {
          console.warn(
            "⚠️ Invalid instruction URL:",
            this.settings.instructionUrl
          );
        }
      }

      // Step 4: AI Fill Placeholders (Send request and get job_id)
      const payload = {
        ba_content: baDocument.content,
        template_structure: clonedTemplate.templateStructure,
        original_storage_format: clonedTemplate.originalStorageFormat,
        instructions: instructions,
        additional_prompt: this.settings.customPrompt || "",
        placeholders: placeholders,
        selectedModel: this.settings.selectedModel,
        images,
        additional_notes: additionalNotes,
      };

      console.log("📤 Sending payload for placeholder filling:", {
        ba_content_length: payload.ba_content.length,
        template_structure_length: payload.template_structure.length,
        original_format_length: payload.original_storage_format.length,
        placeholders_found: placeholders.length,
        placeholders_list: placeholders,
      });

      // Send request and get job_id
      const jobResponse = await ApiClient.generateDocument(payload);
      const jobId = jobResponse.data.job_id;
      if (!jobId) {
        throw new Error(
          jobResponse.error || "Không nhận được job_id từ server!"
        );
      }

      this.currentJobId = jobId;

      // Start polling for result
      await this.pollGenerationResult(jobId, payload);
    } catch (error) {
      console.error("❌ Generation error:", error);
      this.showNotification(`Lỗi sinh tài liệu: ${error.message}`, "error");
      this.hideProgress();
    }
  }

  // These methods are now handled by ConfluenceApi class
  // Keeping them for backward compatibility if needed

  async pollGenerationResult(jobId, payload) {
    const maxAttempts = 20; // 10 minutes max (60 * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        console.log(
          `🔄 Polling attempt ${attempts}/${maxAttempts} for job ${jobId}`
        );

        const statusResult = await ApiClient.checkStatus(jobId);
        console.log(`statusResult: ${statusResult}`);

        if (!statusResult.success) {
          throw new Error("Lỗi kiểm tra trạng thái job");
        }

        const status = statusResult.data.status;

        if (status === "done") {
          console.log("✅ Generation completed!");

          const result = await ApiClient.getResult(jobId);
          const resultString = JSON.stringify(result, null, 2);

          console.log(`Document generate:\n${resultString}`);
          if (result.success) {
            this.handleGenerationComplete(result.data.result);
            return;
          } else {
            throw new Error("Lỗi lấy kết quả sinh tài liệu");
          }
        } else if (status === "error") {
          throw new Error("Job sinh tài liệu thất bại trên server");
        } else if (attempts >= maxAttempts) {
          throw new Error(
            "⏰ Timeout: Quá trình sinh tài liệu mất quá nhiều thời gian. Vui lòng thử lại."
          );
        } else {
          // Update progress message if available
          if (statusResult.data.progress_message) {
            console.log(`📝 Progress: ${statusResult.data.progress_message}`);
          }

          // Continue polling
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (error) {
        console.error("❌ Polling error:", error);
        this.showNotification(
          `Lỗi trong quá trình sinh tài liệu: ${error.message}`,
          "error"
        );
        this.hideProgress();
        this.currentJobId = null;
        throw error;
      }
    };

    await poll();
  }

  handleGenerationComplete(result) {
    this.updateProgress(3, "completed");
    this.updateProgress(4, "completed");

    // Store result for preview
    this.generatedContent = result;
    console.log("✅ Generated content:", result);
    // Switch to preview tab
    this.switchTab("preview");
    this.updatePreviewTab(result);

    this.showNotification("Sinh tài liệu thành công!", "success");
    this.hideProgress();
  }

  updatePreviewTab(content) {
    const previewTab = document.getElementById("previewTab");
    previewTab.innerHTML = `
      <div class="ktool-form">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">Preview Tài liệu</h3>
          <div style="display: flex; gap: 12px;">
            <button class="ktool-btn ktool-btn-secondary" id="editContentBtn">
              ✏️ Chỉnh sửa nội dung
            </button>
            <button class="ktool-btn ktool-btn-primary" id="createPageBtn">
              📄 Tạo trang Confluence
            </button>
            <button class="ktool-btn ktool-btn-secondary" id="downloadBtn">
              💾 Tải xuống
            </button>
          </div>
        </div>

        <div id="documentPreview" style="border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; background: #f8f9fa; max-height: 400px; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
          ${content.full_storage_format || "<p>Không có nội dung</p>"}
        </div>
      </div>
    `;

    // Bind preview buttons
    const editContentBtn = previewTab.querySelector("#editContentBtn");
    const createPageBtn = previewTab.querySelector("#createPageBtn");
    const downloadBtn = previewTab.querySelector("#downloadBtn");

    editContentBtn.addEventListener("click", () =>
      this.handleEditContent(content)
    );
    createPageBtn.addEventListener("click", () => this.handleCreatePage());
    downloadBtn.addEventListener("click", () => this.handleDownload());

    // Initialize Mermaid diagrams after content is loaded
    setTimeout(() => {
      this.initializeMermaid();
    }, 100);
  }

  async handleCreatePage() {
    try {
      const spaceKey = ConfluenceApi.getCurrentSpaceKey();
      if (!spaceKey) {
        throw new Error("Không thể xác định space key của trang hiện tại");
      }

      const title = `K-Tool Generated Document - ${new Date().toLocaleDateString()}`;
      const content =
        this.generatedContent.full_storage_format ||
        this.generatedContent.content;

      // Extract parent page ID from settings if available
      let parentId = null;
      if (this.settings.documentUrl) {
        parentId = ConfluenceApi.extractPageId(this.settings.documentUrl);
      }

      const result = await ConfluenceApi.createPage(
        title,
        content,
        spaceKey,
        parentId
      );

      this.showNotification("Tạo trang Confluence thành công!", "success");

      // Optionally redirect to new page
      if (result.id) {
        const newPageUrl = `${window.location.origin}/pages/${result.id}`;
        if (confirm("Bạn có muốn chuyển đến trang vừa tạo không?")) {
          window.open(newPageUrl, "_blank");
        }
      }
    } catch (error) {
      console.error("❌ Create page error:", error);
      this.showNotification(`Lỗi tạo trang: ${error.message}`, "error");
    }
  }

  handleDownload() {
    const content =
      this.generatedContent.full_storage_format ||
      this.generatedContent.content;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ktool-document-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("Tải xuống thành công!", "success");
  }

  handleEditContent(content) {
    console.log("✏️ Opening content editor...");
    console.log("🔍 Content to edit:", content);
    console.log("🔍 ConfluenceEditor instance:", this.confluenceEditor);

    if (!this.confluenceEditor) {
      console.error("❌ ConfluenceEditor is null or undefined");
      this.showNotification("Confluence Editor chưa được khởi tạo!", "error");
      return;
    }

    try {
      // Set up save callback to update the generated content
      this.confluenceEditor.setSaveCallback((updatedContent) => {
        console.log("💾 Content updated:", updatedContent);

        // Update the stored generated content
        this.generatedContent = updatedContent;

        // Refresh the preview tab with updated content
        this.updatePreviewTab(updatedContent);

        this.showNotification("Nội dung đã được cập nhật!", "success");
      });

      // Open the editor with current content
      console.log("🚀 Opening ConfluenceEditor...");
      this.confluenceEditor.openEditor(content, {
        title: "Chỉnh sửa tài liệu đã sinh",
        showMermaidTools: true,
      });
      console.log("✅ ConfluenceEditor opened successfully");
    } catch (error) {
      console.error("❌ Error opening ConfluenceEditor:", error);
      this.showNotification(`Lỗi mở editor: ${error.message}`, "error");
    }
  }

  handleReset() {
    if (confirm("Bạn có chắc muốn reset form?")) {
      document.getElementById("baDocUrl").value = window.location.href;
      document.getElementById("additionalNotes").value = "";
      this.hideProgress();
      this.switchTab("generate");
    }
  }

  showProgress() {
    const progressSection = document.getElementById("progressSection");
    const progressSteps = document.getElementById("progressSteps");

    progressSteps.innerHTML = this.progressSteps
      .map(
        (step, index) => `
      <div class="ktool-progress-step ${step.status}" data-step="${index}">
        <div class="ktool-progress-icon">${index + 1}</div>
        <span>${step.label}</span>
      </div>
    `
      )
      .join("");

    progressSection.style.display = "block";
  }

  hideProgress() {
    const progressSection = document.getElementById("progressSection");
    progressSection.style.display = "none";

    // Reset progress steps
    this.progressSteps = this.progressSteps.map((step) => ({
      ...step,
      status: "pending",
    }));
  }

  updateProgress(stepIndex, status) {
    this.progressSteps[stepIndex].status = status;

    const stepElement = document.querySelector(`[data-step="${stepIndex}"]`);
    if (stepElement) {
      stepElement.className = `ktool-progress-step ${status}`;

      const icon = stepElement.querySelector(".ktool-progress-icon");
      if (status === "completed") {
        icon.textContent = "✓";
      } else if (status === "error") {
        icon.textContent = "✗";
      } else if (status === "active") {
        icon.innerHTML = '<div class="ktool-spinning">⏳</div>';
      }
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
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
      z-index: 1000002;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
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
    }, 5000);
  }

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

  // Initialize Mermaid diagrams
  async initializeMermaid() {
    try {
      // Load Mermaid if not already loaded
      await this.loadMermaidScript();

      console.log("🎨 Initializing Mermaid diagrams...");

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
        deterministicIDSeed: "mermaid-diagram",
      });

      // Ensure mermaid has access to document
      if (window.mermaid.setConfig) {
        window.mermaid.setConfig({
          securityLevel: "loose",
          theme: "default",
        });
      }

      // Find all mermaid code blocks in the preview
      const previewDiv = document.getElementById("documentPreview");
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
          mermaidDiv.id = `mermaid-${index}`;
          mermaidDiv.style.cssText =
            "margin: 20px 0; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;";

          // Replace the original element
          element.parentNode.replaceChild(mermaidDiv, element);

          // Render the diagram with proper DOM context
          try {
            const diagramId = `mermaid-svg-${index}`;

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
                        "✅ Mermaid diagram rendered successfully (promise API)"
                      );
                    })
                    .catch((error) => {
                      // Clean up temp container
                      if (document.body.contains(tempContainer)) {
                        document.body.removeChild(tempContainer);
                      }
                      console.error(
                        "❌ Mermaid render error (promise API):",
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
                      "✅ Mermaid diagram rendered successfully (sync API)"
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
                        "✅ Mermaid diagram rendered successfully (callback API)"
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
            console.error("❌ Mermaid render error:", error);
            this.showMermaidError(mermaidDiv, mermaidCode, error);
          }
        }
      });
    } catch (error) {
      console.error("❌ Failed to initialize Mermaid:", error);
    }
  }

  // Show Mermaid error in a nice format
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
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new KToolContent();
  });
} else {
  new KToolContent();
}
