/**
 * Content Synchronizer - Handles synchronization between different content sources
 * (Raw editor, Mermaid diagrams, etc.)
 */
import { XMLFormatter } from "./xmlFormatter.js";

export class ContentSynchronizer {
  constructor() {
    // Simplified - no change tracking needed
  }

  /**
   * Sync all content sources to main content object
   * @param {Object} currentContent - Main content object
   * @param {HTMLElement} editorContainer - Editor container element
   * @param {Array} mermaidDiagrams - Array of Mermaid diagrams
   * @returns {Object} Updated content object
   */
  syncAllContent(currentContent, editorContainer, mermaidDiagrams = []) {
    if (!currentContent) {
      throw new Error("Current content is required");
    }

    // 1. Sync from raw editor
    const rawContent = this.syncFromRawEditor(currentContent, editorContainer);

    // 2. Sync Mermaid changes
    const finalContent = this.syncMermaidChanges(rawContent, mermaidDiagrams);

    console.log("🔄 All content synchronized");
    return finalContent;
  }

  /**
   * Sync content from raw editor
   * @param {Object} currentContent - Current content object
   * @param {HTMLElement} editorContainer - Editor container
   * @returns {Object} Updated content object
   */
  syncFromRawEditor(currentContent, editorContainer) {
    if (!editorContainer) return currentContent;

    const rawEditor = editorContainer.querySelector("#raw-content-editor");
    if (!rawEditor || !rawEditor.value) return currentContent;

    const updatedContent = { ...currentContent };
    updatedContent.full_storage_format = rawEditor.value.trim();

    // Also update content field if it exists
    if (updatedContent.content !== undefined) {
      updatedContent.content = rawEditor.value.trim();
    }

    console.log("📝 Synced content from raw editor");
    return updatedContent;
  }

  /**
   * Sync Mermaid diagram changes back to content
   * @param {Object} currentContent - Current content object
   * @param {Array} mermaidDiagrams - Array of Mermaid diagrams
   * @returns {Object} Updated content object
   */
  syncMermaidChanges(currentContent, mermaidDiagrams = []) {
    console.log("🔄 Starting Mermaid sync...", {
      diagramsCount: mermaidDiagrams.length,
      hasContent: !!currentContent,
    });

    if (!mermaidDiagrams || mermaidDiagrams.length === 0) {
      console.log("⚠️ No Mermaid diagrams to sync");
      return currentContent;
    }

    let content =
      currentContent.full_storage_format || currentContent.content || "";
    console.log("📊 Processing all diagrams (no change check)...");

    // Process each diagram - always replace originalCode with code
    mermaidDiagrams.forEach((diagram, index) => {
      console.log(`� Processing diagram ${index}:`, {
        id: diagram.id,
        hasOriginalCode: !!diagram.originalCode,
        hasCode: !!diagram.code,
        originalLength: diagram.originalCode?.length || 0,
        codeLength: diagram.code?.length || 0,
      });

      if (diagram.originalCode && diagram.code) {
        console.log(`📝 Replacing code for diagram ${diagram.id || index}...`);
        console.log(
          `📋 Original code preview: "${diagram.originalCode.substring(
            0,
            100
          )}..."`
        );
        console.log(
          `📋 New code preview: "${diagram.code.substring(0, 100)}..."`
        );

        const updatedContent = this.updateDiagramInContent(
          content,
          diagram,
          index
        );
        if (updatedContent !== content) {
          content = updatedContent;
          console.log(
            `✅ Successfully replaced code for diagram ${diagram.id || index}`
          );
        } else {
          console.warn(
            `⚠️ Failed to replace code for diagram ${
              diagram.id || index
            } - no pattern matched`
          );
        }
      } else {
        console.log(
          `⚠️ Skipping diagram ${
            diagram.id || index
          } - missing originalCode or code`
        );
      }
    });

    // Always return updated content
    const updatedContent = { ...currentContent };
    updatedContent.full_storage_format = content;

    if (updatedContent.content !== undefined) {
      updatedContent.content = content;
    }

    console.log("✅ Mermaid sync completed - all diagrams processed");
    return updatedContent;
  }

  /**
   * Update a specific diagram in content string
   * @param {string} content - Full content string
   * @param {Object} diagram - Diagram object
   * @param {number} index - Diagram index
   * @returns {string} Updated content string
   */
  updateDiagramInContent(content, diagram, index) {
    if (!content || !diagram) {
      console.log("⚠️ updateDiagramInContent: Missing content or diagram");
      return content;
    }

    const originalCode = diagram.originalCode;
    const newCode = diagram.code;

    console.log("🔄 Updating diagram in content:", {
      index,
      diagramId: diagram.id,
      hasOriginalCode: !!originalCode,
      hasNewCode: !!newCode,
      originalLength: originalCode?.length || 0,
      newLength: newCode?.length || 0,
    });

    if (!originalCode || !newCode) {
      console.log("⚠️ Missing originalCode or newCode - skipping update");
      return content;
    }

    console.log("📋 Replacing originalCode with newCode (no equality check)");
    console.log(`📋 Original: "${originalCode.substring(0, 50)}..."`);
    console.log(`📋 New: "${newCode.substring(0, 50)}..."`);

    // Try multiple patterns to find and replace the diagram
    const patterns = [
      // Pattern 1: CDATA section in ac:parameter
      {
        pattern: new RegExp(
          `(<ac:parameter[^>]*ac:name="code"[^>]*>\\s*<\\!\\[CDATA\\[\\s*)(${XMLFormatter.escapeRegex(
            originalCode
          )})(\\s*\\]\\]>\\s*</ac:parameter>)`,
          "gs"
        ),
        replacement: `$1${newCode}$3`,
      },
      // Pattern 2: Plain text in ac:parameter
      {
        pattern: new RegExp(
          `(<ac:parameter[^>]*ac:name="code"[^>]*>\\s*)(${XMLFormatter.escapeRegex(
            originalCode
          )})(\\s*</ac:parameter>)`,
          "gs"
        ),
        replacement: `$1${newCode}$3`,
      },
      // Pattern 3: ac:plain-text-body with CDATA
      {
        pattern: new RegExp(
          `(<ac:plain-text-body>\\s*<\\!\\[CDATA\\[\\s*)(${XMLFormatter.escapeRegex(
            originalCode
          )})(\\s*\\]\\]>\\s*</ac:plain-text-body>)`,
          "gs"
        ),
        replacement: `$1${newCode}$3`,
      },
    ];

    let updatedContent = content;
    let patternMatched = false;

    console.log("🔍 Trying patterns to match and replace...");

    for (let i = 0; i < patterns.length; i++) {
      const { pattern, replacement } = patterns[i];

      console.log(`🔍 Testing pattern ${i + 1}...`);

      // Reset regex lastIndex to avoid issues with global flag
      pattern.lastIndex = 0;

      if (pattern.test(content)) {
        console.log(`✅ Pattern ${i + 1} matched! Applying replacement...`);

        // Reset again before replace
        pattern.lastIndex = 0;
        updatedContent = content.replace(pattern, replacement);
        patternMatched = true;

        console.log(`✅ Successfully updated diagram using pattern ${i + 1}`);
        break;
      } else {
        console.log(`❌ Pattern ${i + 1} did not match`);
      }
    }

    if (!patternMatched) {
      console.warn(
        `⚠️ Could not find pattern to update diagram ${diagram.id || index}`
      );
      console.log("🔍 Debug info:");
      console.log(
        "Original code preview:",
        originalCode.substring(0, 100) + "..."
      );
      console.log("New code preview:", newCode.substring(0, 100) + "...");
      console.log("Content sample:", content.substring(0, 500) + "...");

      // Try to find the original code manually for debugging
      const simpleSearch = content.includes(originalCode.trim());
      console.log("Simple string search found original code:", simpleSearch);
    } else {
      console.log("✅ Pattern matching successful, content updated");
    }

    return updatedContent;
  }

  /**
   * Validate content structure
   * @param {Object} content - Content to validate
   * @returns {Object} Validation result
   */
  validateContent(content) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!content) {
      result.isValid = false;
      result.errors.push("Content is null or undefined");
      return result;
    }

    // Check required fields
    if (!content.full_storage_format && !content.content) {
      result.isValid = false;
      result.errors.push("Missing full_storage_format or content field");
    }

    // Check for XML validity
    const xmlContent = content.full_storage_format || content.content;
    if (xmlContent) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
          `<root>${xmlContent}</root>`,
          "text/xml"
        );
        const errors = doc.getElementsByTagName("parsererror");

        if (errors.length > 0) {
          result.warnings.push("Content may contain XML parsing issues");
        }
      } catch (error) {
        result.warnings.push(`XML validation warning: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Create content backup
   * @param {Object} content - Content to backup
   * @returns {Object} Content backup
   */
  createBackup(content) {
    return {
      content: JSON.parse(JSON.stringify(content)),
      timestamp: Date.now(),
    };
  }

  /**
   * Restore from backup
   * @param {Object} backup - Backup to restore
   * @returns {Object} Restored content
   */
  restoreFromBackup(backup) {
    if (!backup || !backup.content) {
      throw new Error("Invalid backup data");
    }

    console.log("🔄 Restored content from backup");
    return backup.content;
  }
}
