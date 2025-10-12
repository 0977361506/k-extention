// XML/XHTML Formatting Utilities
// Handles XML parsing, formatting and validation

export class XMLFormatter {
  /**
   * Format XHTML for better readability with proper alignment
   * @param {string} xmlString - Raw XML/XHTML string
   * @param {string} indent - Indentation string (default: 4 spaces)
   * @returns {string} Formatted XML/XHTML string
   */
  static formatXHTML(xmlString, indent = "    ") {
    // 1. Parse string into DOM tree
    const parser = new DOMParser();

    // Wrap content with temporary root tag if it's just a fragment
    const rootTag = "xml-root-fragment";
    const wrappedXml = `<${rootTag}>${xmlString}</${rootTag}>`;

    const doc = parser.parseFromString(wrappedXml, "text/xml");

    // Check for parsing errors
    const parseErrors = doc.getElementsByTagName("parsererror");
    if (parseErrors.length > 0) {
      console.warn("XML/XHTML parsing error. Returning original string.", {
        error: parseErrors[0]?.textContent || "Unknown parsing error",
        originalLength: xmlString.length,
        sample: xmlString.substring(0, 100) + "...",
      });
      return xmlString;
    }

    let output = "";
    let currentIndent = "";

    // Get wrapped root element (only process its children)
    const rootElement = doc.documentElement;

    /**
     * Recursive function to traverse and rebuild string
     * @param {Node} node - Current node
     * @param {string} level - Current indentation level
     */
    function processNode(node, level) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE: // 1: HTML/XML tags (e.g., <p>, <ac:structured-macro>)
          const nodeName = node.nodeName;

          // Start tag (e.g., <p data="...">)
          let startTag = `<${nodeName}`;

          // Add attributes
          if (node.attributes && node.attributes.length > 0) {
            for (let attr of node.attributes) {
              startTag += ` ${attr.name}="${attr.value}"`;
            }
          }
          startTag += ">";

          // Check if tag has children (excluding empty TextNodes)
          const hasSignificantChildren = Array.from(node.childNodes).some(
            (child) =>
              child.nodeType !== Node.TEXT_NODE ||
              child.textContent.trim().length > 0
          );

          if (!hasSignificantChildren) {
            // Handle self-closing or empty tags (e.g., <br />)
            // Note: In XHTML, <tag></tag> is more common than <tag />
            // Here we use common logic: Open tag, close tag on same line
            output += `${level}${startTag.replace(">", "/>")}\n`;
          } else {
            // Open tag on new line
            output += `${level}${startTag}\n`;

            // Increase indentation level and process children
            const nextLevel = level + indent;
            Array.from(node.childNodes).forEach((child) =>
              processNode(child, nextLevel)
            );

            // Close tag on new line with old indentation level
            output += `${level}</${nodeName}>\n`;
          }
          break;

        case Node.TEXT_NODE: // 3: Text content
          const text = node.textContent.trim();
          if (text.length > 0) {
            // Handle plain text (e.g., content inside <p>)
            // If it's plain text, add it to current line or new line
            output += `${level}${text}\n`;
          }
          break;

        case Node.COMMENT_NODE: // 8: Comment (e.g., <!-- comment -->)
          output += `${level}<!--${node.textContent}-->\n`;
          break;

        case Node.CDATA_SECTION_NODE: // 4: CDATA Section (Safe for code in <ac:parameter>)
          // This is the most important case for Mermaid content
          output += `${level}<![CDATA[${node.textContent}]]>\n`;
          break;

        // You can add other cases like DOCUMENT_TYPE_NODE, PROCESSING_INSTRUCTION_NODE if needed
      }
    }

    // Start processing from children of temporary root tag
    Array.from(rootElement.childNodes).forEach((node) =>
      processNode(node, currentIndent)
    );

    const result = output.trim();

    return result;
  }

  /**
   * Check if a tag is self-closing
   * @param {string} tag - HTML tag string
   * @returns {boolean} True if self-closing
   */
  static isSelfClosingTag(tag) {
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

  /**
   * Clean up XML markers from content
   * @param {string} content - Content with XML markers
   * @returns {string} Cleaned content
   */
  static cleanXMLMarkers(content) {
    if (!content) return "";

    // Remove ```xml and ``` markers
    let cleaned = content.replace(/^```xml\s*\n?/gm, "");
    cleaned = cleaned.replace(/\n?```\s*$/gm, "");

    return cleaned;
  }

  /**
   * Convert XHTML to HTML for Live Editor
   * @param {string} xhtmlContent - XHTML content
   * @returns {string} HTML content
   */
  static convertXHTMLToHTML(xhtmlContent) {
    if (!xhtmlContent) return "";

    console.log("🔄 Converting XHTML to HTML:", {
      originalLength: xhtmlContent.length,
      hasUL: xhtmlContent.includes("<ul"),
      hasOL: xhtmlContent.includes("<ol"),
      hasLI: xhtmlContent.includes("<li"),
      preview: xhtmlContent.substring(0, 300),
    });

    let htmlContent = xhtmlContent;

    // 1. Clean data attributes that might confuse Quill
    htmlContent = this.cleanDataAttributes(htmlContent);

    // 2. Convert XHTML specific elements to HTML
    htmlContent = htmlContent
      // Convert self-closing tags to HTML format
      .replace(/<br\s*\/>/g, "<br>")
      .replace(/<hr\s*\/>/g, "<hr>")
      .replace(/<img([^>]*)\s*\/>/g, "<img$1>")
      // Remove XML namespaces that Quill doesn't understand
      .replace(/\s+xmlns[^=]*="[^"]*"/g, "")
      // Convert XHTML entities
      .replace(/&nbsp;/g, " ")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .trim();

    console.log("🔄 XHTML to HTML conversion result:", {
      length: htmlContent.length,
      hasUL: htmlContent.includes("<ul"),
      hasOL: htmlContent.includes("<ol"),
      hasLI: htmlContent.includes("<li"),
      preview: htmlContent.substring(0, 300),
      cleanedDataAttrs: !htmlContent.includes("data-start"),
    });

    return htmlContent;
  }

  /**
   * Clean data attributes that might confuse Quill editor
   * @param {string} content - Content with data attributes
   * @returns {string} Cleaned content
   */
  static cleanDataAttributes(content) {
    if (!content) return "";

    // Remove common data attributes that Quill doesn't need
    let cleaned = content
      .replace(/\s+data-start="[^"]*"/g, "")
      .replace(/\s+data-end="[^"]*"/g, "")
      .replace(/\s+data-uuid="[^"]*"/g, "")
      .replace(/\s+data-id="[^"]*"/g, "")
      .replace(/\s+data-type="[^"]*"/g, "");

    return cleaned;
  }

  /**
   * Escape regex special characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
