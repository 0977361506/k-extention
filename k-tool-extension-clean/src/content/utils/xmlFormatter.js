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
    if (doc.getElementsByTagName("parsererror").length > 0) {
      console.error("XML/XHTML parsing error. Returning original string.");
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

    return output.trim();
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
   * Escape regex special characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
