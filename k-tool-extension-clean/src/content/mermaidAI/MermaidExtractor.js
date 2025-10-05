/**
 * Mermaid Content Extractor
 * Handles extraction of Mermaid content from DOM elements
 */
export class MermaidExtractor {
  /**
   * Extract Mermaid content from clicked element
   * @param {HTMLElement} clickedElement - The clicked DOM element
   * @returns {string} Extracted Mermaid code
   */
  static extractFromElement(clickedElement) {
    console.log("🔍 Extracting Mermaid content from clicked element...");
    
    if (!clickedElement) {
      console.warn("⚠️ No clicked element found");
      return "";
    }

    try {
      // Try to find Mermaid content in various ways
      let content = "";
      
      // Method 1: Look for structured macro with mermaid
      const mermaidMacro = clickedElement.closest(
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
      if (!content && clickedElement.dataset) {
        if (clickedElement.dataset.mermaidCode) {
          content = clickedElement.dataset.mermaidCode;
          console.log(
            "✅ Extracted from data-mermaid-code:",
            content.substring(0, 50) + "..."
          );
        }
      }
      
      // Method 3: Look in parent elements for text content
      if (!content) {
        let parent = clickedElement.parentElement;
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
      
      console.log("✅ Mermaid content extraction completed:", {
        length: content.length,
        preview: content.substring(0, 100) + "...",
      });
      
      return content;
    } catch (error) {
      console.error("❌ Error extracting Mermaid content:", error);
      return "graph TD\n    A[Start] --> B[End]";
    }
  }

  /**
   * Validate Mermaid content
   * @param {string} content - Mermaid code to validate
   * @returns {Object} Validation result
   */
  static validateContent(content) {
    if (!content || !content.trim()) {
      return {
        isValid: false,
        error: "Content is empty"
      };
    }

    // Basic Mermaid syntax validation
    const trimmed = content.trim();
    const validStarters = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie'
    ];
    
    const hasValidStarter = validStarters.some(starter => 
      trimmed.toLowerCase().startsWith(starter.toLowerCase())
    );
    
    if (!hasValidStarter) {
      return {
        isValid: false,
        error: "Invalid Mermaid syntax - must start with a valid diagram type"
      };
    }

    return {
      isValid: true,
      error: null
    };
  }
}
