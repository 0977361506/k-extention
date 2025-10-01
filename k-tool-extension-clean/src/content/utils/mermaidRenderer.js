// Mermaid Rendering Utilities
// Handles Mermaid diagram loading, rendering and error handling

export class MermaidRenderer {
  /**
   * Load Mermaid script dynamically
   * @returns {Promise<object>} Mermaid instance
   */
  static async loadMermaidScript() {
    if (window.mermaid) {
      console.log("⚡ Mermaid already loaded");
      return window.mermaid;
    }

    const res = await fetch(chrome.runtime.getURL("lib/mermaid.min.js"));
    const text = await res.text();
    eval(text); // UMD will attach mermaid to window
    console.log("✅ Mermaid loaded dynamically");
    return window.mermaid;
  }

  /**
   * Initialize Mermaid with proper configuration
   * @returns {Promise<void>}
   */
  static async initializeMermaid() {
    await this.loadMermaidScript();

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
  }

  /**
   * Render a single Mermaid diagram
   * @param {string} diagramId - Unique ID for the diagram
   * @param {string} mermaidCode - Mermaid diagram code
   * @param {HTMLElement} container - Container element
   * @returns {Promise<void>}
   */
  static async renderDiagram(diagramId, mermaidCode, container) {
    try {
      // Create a temporary container in the document to ensure proper DOM context
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      document.body.appendChild(tempContainer);

      // Modern mermaid.render returns a promise
      if (window.mermaid.render && typeof window.mermaid.render === "function") {
        try {
          // Try modern API first
          const renderResult = window.mermaid.render(diagramId, mermaidCode);

          if (renderResult && typeof renderResult.then === "function") {
            // Promise-based API
            const result = await renderResult;
            
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

            container.innerHTML = svgCode;
            console.log("✅ Mermaid diagram rendered successfully (promise API)");
          } else {
            // Synchronous return or callback-based API
            if (typeof renderResult === "string") {
              // Clean up temp container
              if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
              }
              container.innerHTML = renderResult;
              console.log("✅ Mermaid diagram rendered successfully (sync API)");
            } else {
              // Try callback-based API
              window.mermaid.render(diagramId, mermaidCode, (svgCode) => {
                // Clean up temp container
                if (document.body.contains(tempContainer)) {
                  document.body.removeChild(tempContainer);
                }
                container.innerHTML = svgCode;
                console.log("✅ Mermaid diagram rendered successfully (callback API)");
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
      this.showMermaidError(container, mermaidCode, error);
    }
  }

  /**
   * Show Mermaid error in a nice format
   * @param {HTMLElement} container - Container element
   * @param {string} text - Mermaid code that failed
   * @param {Error} error - Error object
   */
  static showMermaidError(container, text, error) {
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

  /**
   * Detect Mermaid diagram type from code
   * @param {string} code - Mermaid diagram code
   * @returns {string} Diagram type
   */
  static detectMermaidType(code) {
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

  /**
   * Extract Mermaid diagrams from Confluence content
   * @param {string} content - Confluence storage format content
   * @returns {Array} Array of diagram objects
   */
  static extractMermaidDiagrams(content) {
    const diagrams = [];
    const diagramsMap = new Map();

    if (!content) return { diagrams, diagramsMap };

    // Regex to find all <ac:structured-macro ...> ... </ac:structured-macro>
    const macroRegex =
      /<ac:structured-macro[^>]*ac:name="(mermaid|code)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi;

    let match;
    let index = 0;

    while ((match = macroRegex.exec(content)) !== null) {
      const macroName = match[1];
      const macroContent = match[2];

      // Check code parameter
      const codeMatch = macroContent.match(
        /<ac:parameter[^>]*ac:name="code">([\s\S]*?)<\/ac:parameter>/
      );
      if (!codeMatch) continue;

      const code = codeMatch[1].trim();
      if (!code) continue;

      // If it's code macro, check language
      if (macroName === "code") {
        const langMatch = macroContent.match(
          /<ac:parameter[^>]*ac:name="language">([\s\S]*?)<\/ac:parameter>/
        );
        if (!langMatch || langMatch[1].trim() !== "mermaid") continue;
      }

      const type = this.detectMermaidType(code);
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

      diagrams.push(diagramRecord);
      diagramsMap.set(diagramId, {
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

    console.log("🎨 Extracted Mermaid diagrams:", diagrams);
    return { diagrams, diagramsMap };
  }
}
