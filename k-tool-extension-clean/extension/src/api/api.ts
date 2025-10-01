import mermaid from 'mermaid';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';
import escapeHtml from 'escape-html';
// Import HTML processing libraries for advanced sanitization
import * as htmlparser2 from 'htmlparser2';
import * as he from 'he';
import { DiagramData, getDiagramConfluenceStyles } from '../utils/mermaidExporter';

// Initialize mermaid globally
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: '"Segoe UI", "Arial Unicode MS", "Lucida Grande", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
});

export function initializeMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: '"Segoe UI", "Arial Unicode MS", "Lucida Grande", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true
    },
    themeVariables: {
      fontFamily: '"Segoe UI", "Arial Unicode MS", "Lucida Grande", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif'
    }
  });
}

// ================================================================================= 
// TEMPLATE CLONING INTERFACES
// =================================================================================
export interface ClonedTemplate {
  title: string;
  originalStorageFormat: string;
  templateStructure: string;
  analysisInfo: {
    emptyParagraphs: number;
    emptyTableCells: number;
    totalLength: number;
  };
}

export interface GeneratedDocument {
  title: string;
  fullStorageFormat: string;
  generatedAt: string;
}

// ================================================================================= 
// ENHANCED XML VALIDATION - SIMPLIFIED VERSION
// =================================================================================

/**
 * DEPRECATED - Use convertToMermaidCloudMacros instead
 * Fix invalid prefixes and content structure - CRITICAL FIX
 */
/*
function fixContentPrefixAndStructure(content: string): string {
  // This function is deprecated and replaced by convertToMermaidCloudMacros
  return content;
}
*/

/**
 * DEPRECATED - Use basicContentCleanup instead
 * Comprehensive XML validation and sanitization
 */
/*
function validateAndSanitizeXML(storageFormat: string): string {
  // This function is deprecated and replaced by simpler approach
  return basicContentCleanup(storageFormat);
}
*/

/**
 * DEPRECATED - All complex validation functions have been simplified
 * Fix XML attributes comprehensively
 */
/*
function fixXmlAttributes(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Fix CDATA sections and escape sequences
 */
/*
function fixCdataAndEscapeSequences(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Ensure Confluence namespaces
 */
/*
function ensureConfluenceNamespaces(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Fix table structure
 */
/*
function fixTableStructure(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Fix mermaid macros with proper validation
 */
/*
function fixMermaidMacros(content: string): string {
  // This function is deprecated - replaced by convertToMermaidCloudMacros
  return content;
}
*/

/**
 * DEPRECATED
 * Fix paragraph structure
 */
/*
function fixParagraphStructure(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Fix unmatched tags
 */
/*
function fixUnmatchedTags(xml: string): string {
  // This function is deprecated
  return xml;
}

function getTagName(tag: string): string | null {
  // This function is deprecated
  return null;
}
*/

/**
 * DEPRECATED
 * Final cleanup
 */
/*
function performFinalCleanup(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Final validation with enhanced macro checking
 */
/*
function performFinalValidation(content: string): {
  isValid: boolean;
  warnings: string[];
  sanitized: string;
} {
  // This function is deprecated
  return {
    isValid: true,
    warnings: [],
    sanitized: content
  };
}
*/

/**
 * DEPRECATED
 * Emergency macro fix for macro name issues
 */
/*
function emergencyMacroFix(content: string): string {
  // This function is deprecated
  return content;
}
*/

/**
 * DEPRECATED
 * Emergency fallback sanitization
 */
/*
function emergencyFallbackSanitization(content: string): string {
  // This function is deprecated
  return basicContentCleanup(content);
}
*/

/**
 * SIMPLIFIED DEBUG FUNCTION - No complex validation
 */
export function debugXMLValidation(xml: string): { 
  isValid: boolean; 
  sanitized: string; 
  errors: string[]; 
  warnings: string[] 
} {
  console.log('🔬 DEBUG: Basic XML validation...');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    if (!xml || xml.trim().length === 0) {
      errors.push('Content is empty');
      return { isValid: false, sanitized: '', errors, warnings };
    }
    
    // Basic cleanup and macro conversion
    let sanitized = basicContentCleanup(xml);
    sanitized = convertToMermaidCloudMacros(sanitized);
    
    // Simple validation - just check if it's not empty
    const isValid = sanitized.trim().length > 0;
    
    if (!isValid) {
      errors.push('Content became empty after processing');
    } else {
      warnings.push('Content processed successfully with mermaid-cloud macros');
    }
    
    const result = {
      isValid,
      sanitized,
      errors,
      warnings
    };
    
    console.log('🔬 DEBUG Results:', {
      isValid: result.isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      contentLength: sanitized.length
    });
    
    return result;
    
  } catch (error) {
    errors.push(`Validation exception: ${error}`);
    return {
      isValid: false,
      sanitized: basicContentCleanup(xml),
      errors,
      warnings
    };
  }
}

// ================================================================================= 
// UTILITY FUNCTIONS
// =================================================================================

/**
 * Extract page ID from Confluence URL
 */
export function extractPageIdFromUrl(url: string): string | null {
  try {
    if (!url || !url.trim()) {
      return null;
    }
    const urlObj = new URL(url);
    const pageId = urlObj.searchParams.get('pageId');
    return pageId;
  } catch (error) {
    console.error('❌ Error parsing URL:', error);
    return null;
  }
}

// ================================================================================= 
// MACRO CONVERSION FUNCTION
// =================================================================================

// ================================================================================= 
// DIAGRAM EXTRACTION AND CONVERSION
// =================================================================================




/**
 * Extract diagram content from macros before conversion
 */
function extractDiagramContent(macroMatch: string, filename: string, macroId: string): DiagramData {
  console.log(`🔍 Extracting diagram content for: ${filename}`);
  
  let diagramCode = '';
  
  // Extract mermaid code from mermaid macro
  const mermaidCodeMatch = macroMatch.match(/<ac:parameter[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:parameter>/);
  if (mermaidCodeMatch) {
    diagramCode = mermaidCodeMatch[1].trim();
    
    // If wrapped in CDATA, extract content
    const cdataMatch = diagramCode.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) {
      diagramCode = cdataMatch[1];
    }
  }
  console.log(`✅ Extracted diagram code (${diagramCode.length} chars) for: ${filename}`);
  
  return {
    filename,
    macroId,
    diagramCode
  };
}

/**
 * Convert diagram code to SVG and PNG using mermaid
 */
async function convertDiagramToSvgPng(diagram: DiagramData): Promise<DiagramData> {
  try {
    console.log(`🎨 Converting diagram to SVG/PNG: ${diagram.filename}`);
    console.log(`🎨 Converting diagram to SVG/PNG: ${diagram.diagramCode}`);

    // Use mermaid to render SVG
    const svgResult = await mermaid.render(`diagram-${diagram.macroId}`, diagram.diagramCode);
    
    // Handle different return types from mermaid.render
    let svgContent: string;
    if (typeof svgResult === 'string') {
      svgContent = svgResult;
    } else if (svgResult && typeof svgResult === 'object' && 'svg' in svgResult) {
      svgContent = (svgResult as any).svg;
    } else {
      throw new Error('Invalid SVG result from mermaid.render');
    }
    
    diagram.svg = svgContent;
    
    // Convert SVG to PNG using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;
        
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          diagram.png = canvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64,
        }
        resolve(true);
      };
      
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    });
    
    console.log(`✅ Successfully converted ${diagram.filename} to SVG/PNG`);
    return diagram;
    
  } catch (error) {
    console.error(`❌ Failed to convert diagram ${diagram.filename}:`, error);
    
    // Create fallback PNG data
    diagram.png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return diagram;
  }
}

/**
 * Convert all macros to mermaid-cloud macros with sequential naming and extract diagrams
 */
function convertToMermaidCloudMacros(content: string): string {
  console.log('🔄 Converting all macros to mermaid-cloud macros...');
  let macroCounter = 1;
  let macroId = 111;
  
  // Replace all structured macros (mermaid, code, etc.) with mermaid-cloud macros
  const convertedContent = content.replace(
    /<ac:structured-macro[^>]*>[\s\S]*?<\/ac:structured-macro>/g,
    (match) => {
      const filename = `k-tool-diagram-${macroCounter}`;
      const currentId = macroId.toString();    
      macroCounter++;
      macroId++;
      
      console.log(`🔧 Converting macro ${macroCounter - 1} to mermaid-cloud: ${filename}`);
      
      return `<ac:structured-macro ac:name="mermaid-cloud" ac:schema-version="1" ac:macro-id="${currentId}">
<ac:parameter ac:name="toolbar">bottom</ac:parameter>
<ac:parameter ac:name="filename">${filename}</ac:parameter>
<ac:parameter ac:name="format">svg</ac:parameter>
<ac:parameter ac:name="zoom">fit</ac:parameter>
<ac:parameter ac:name="revision">1</ac:parameter>
</ac:structured-macro>`;
    }
  );
  
  console.log(`✅ Converted ${macroCounter - 1} macros to mermaid-cloud`);  
  return convertedContent;
}

/**
 * Save diagram to mermaid-cloud API
 */
async function saveDiagramToAPI(diagram: DiagramData, pageId: string): Promise<boolean> {
  try {
    console.log(`💾 Saving diagram ${diagram.filename} to API for page ${pageId}`);
    
    const payload = {
      filename: diagram.filename,
      data: diagram.diagramCode,
      svg: diagram.svg || '',
      png: diagram.png || ''
    };
    
    const response = await fetch(`/rest/mermaidrest/1.0/mermaid/${pageId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to save diagram ${diagram.filename}:`, response.status, errorText);
      return false;
    }
    
    console.log(`✅ Successfully saved diagram ${diagram.filename} to API`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error saving diagram ${diagram.filename}:`, error);
    return false;
  }
}

/**
 * Process all extracted diagrams and save them to API sequentially
 */
async function processAndSaveDiagrams(pageId: string, extractedDiagrams: DiagramData[]): Promise<{ success: number; total: number; errors: string[] }> {
  if (extractedDiagrams.length === 0) {
    console.log('ℹ️ No diagrams to process');
    return { success: 0, total: 0, errors: [] };
  }
  
  console.log(`🔄 Processing ${extractedDiagrams.length} diagrams for page ${pageId}`);
  
  let successCount = 0;
  const errors: string[] = [];
  const totalDiagrams = extractedDiagrams.length;
  
  try {
    // Convert all diagrams to SVG/PNG first
    console.log('🎨 Converting diagrams to SVG/PNG...');
    const processedDiagrams = await Promise.all(
      extractedDiagrams.map(diagram => convertDiagramToSvgPng(diagram))
    );
    
    // Save diagrams sequentially (one by one)
    console.log('💾 Saving diagrams sequentially...');
    for (let i = 0; i < processedDiagrams.length; i++) {
      const diagram = processedDiagrams[i];
      console.log(`📊 Saving diagram ${i + 1}/${processedDiagrams.length}: ${diagram.filename}`);
      
      try {
        const success = await saveDiagramToAPI(diagram, pageId);
        if (success) {
          successCount++;
          console.log(`✅ Diagram ${i + 1}/${processedDiagrams.length} saved successfully`);
        } else {
          errors.push(`Failed to save diagram: ${diagram.filename}`);
          console.error(`❌ Diagram ${i + 1}/${processedDiagrams.length} failed to save`);
        }
      } catch (error) {
        const errorMsg = `Error saving diagram ${diagram.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ Diagram ${i + 1}/${processedDiagrams.length} error:`, error);
      }
      
      // Add small delay between saves to avoid overwhelming the server
      if (i < processedDiagrams.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Diagram processing complete: ${successCount}/${totalDiagrams} diagrams saved`);
    
    if (successCount < totalDiagrams) {
      console.warn(`⚠️ ${totalDiagrams - successCount} diagrams failed to save`);
    }
    
  } catch (error) {
    const errorMsg = `Error processing diagrams: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error('❌ Error processing diagrams:', error);
  } finally {
  }
  
  return { success: successCount, total: totalDiagrams, errors };
}

/**
 * Basic content cleanup without complex validation
 */
function basicContentCleanup(content: string): string {
  console.log('🧹 Performing enhanced content cleanup with Vietnamese support...');
  
  return content
    // Remove code block prefixes
    .replace(/^```\w*\s*/g, '')
    .replace(/```\s*$/g, '')
    .trim()
    
    // Enhanced character cleanup for Vietnamese and UTF-8
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    
    // Fix common encoding issues
    .replace(/â€™/g, "'") // Smart apostrophe
    .replace(/â€œ/g, '"') // Smart quote open
    .replace(/â€/g, '"')  // Smart quote close
    .replace(/â€¦/g, '...') // Ellipsis
    .replace(/â€"/g, '–') // En dash
    .replace(/â€"/g, '—') // Em dash
    
    // Additional Vietnamese character fixes
    .replace(/Ä‚/g, 'Ă') // Capital A with breve
    .replace(/Ä'/g, 'ă') // Small a with breve
    .replace(/Ä‚/g, 'Â') // Capital A with circumflex
    .replace(/Ã¢/g, 'â') // Small a with circumflex
    .replace(/Ãª/g, 'ê') // Small e with circumflex
    .replace(/Ã´/g, 'ô') // Small o with circumflex
    .replace(/Æ°/g, 'ư') // Small u with horn
    .replace(/Æ¡/g, 'ơ') // Small o with horn
    
    // Clean up other Unicode issues
    .replace(/\u200B/g, '') // Zero width space
    .replace(/\uFEFF/g, '') // Byte order mark
    .replace(/\u00A0/g, ' ') // Non-breaking space to regular space
    .replace(/\u2028/g, '\n') // Line separator
    .replace(/\u2029/g, '\n\n') // Paragraph separator
    
    // Enhanced XML escaping - preserve already escaped entities
    .replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    
    // Clean up whitespace more carefully
    .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on new lines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before new lines
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/>\s+</g, '><') // Remove spaces between XML tags
    .trim();
}

/**
 * ADVANCED HTML/XHTML SANITIZATION AND VALIDATION
 * Sử dụng htmlparser2 + he để đảm bảo HTML/XHTML hoàn toàn hợp lệ cho Confluence
 */
function advancedHTMLSanitization(content: string): string {
  console.log('🔬 Starting advanced HTML sanitization with htmlparser2...');
  
  try {
    // Step 1: Preprocess content to fix obvious issues
    let processedContent = content
      // Fix unclosed self-closing tags first
      .replace(/<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)([^>]*?)(?<!\/)\s*>/gi, '<$1$2/>')
      // Ensure proper quotes around attributes
      .replace(/(\w+)=([^"\s>]+)(\s|>)/g, '$1="$2"$3')
      // Fix common encoding issues before processing
      .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')
      // Remove any null bytes or control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix common Vietnamese encoding issues
      .replace(/â€™/g, "'").replace(/â€œ/g, '"').replace(/â€/g, '"')
      // Clean up malformed HTML/XHTML structures
      .replace(/<br\s*\/\s*\/>/gi, '<br/>') // Fix double slash br tags
      .replace(/<hr\s*\/\s*\/>/gi, '<hr/>') // Fix double slash hr tags
      .replace(/<p><br><\/p>/gi, '<p>&nbsp;</p>') // Replace empty paragraphs with br
      .replace(/<p><br\/><\/p>/gi, '<p>&nbsp;</p>') // Replace empty paragraphs with br/
      .replace(/<p>\s*<\/p>/gi, '<p>&nbsp;</p>') // Replace completely empty paragraphs
      .replace(/<td><\/td>/gi, '<td>&nbsp;</td>') // Empty table cells
      .replace(/<th><\/th>/gi, '<th>&nbsp;</th>') // Empty table headers
      .replace(/<li><\/li>/gi, '<li>&nbsp;</li>'); // Empty list items

    // Step 2: Parse with htmlparser2 to validate and reconstruct safely
    let finalHTML = '';
    let tagStack: string[] = [];
    let hasErrors = false;
    
    // Confluence allowed tags (expanded list)
    const allowedTags = new Set([
      'p', 'br', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'hr',
      // Confluence specific macros
      'ac:structured-macro', 'ac:parameter', 'ac:rich-text-body', 'ac:plain-text-body'
    ]);

    // Self-closing tags for XHTML compliance
    const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
    
    const parser = new htmlparser2.Parser({
      onopentag(tagname, attributes) {
        // Only allow whitelisted tags
        if (!allowedTags.has(tagname.toLowerCase())) {
          console.warn(`⚠️ Skipping disallowed tag: ${tagname}`);
          return;
        }

        // Reconstruct opening tag with proper formatting
        let attrString = '';
        for (const [key, value] of Object.entries(attributes)) {
          // Sanitize and escape attribute values
          if (value != null) {
            const escapedValue = he.encode(String(value), { 
              useNamedReferences: false,
              allowUnsafeSymbols: false 
            });
            attrString += ` ${key}="${escapedValue}"`;
          }
        }
        
        // Check if it's a self-closing tag for XHTML
        if (selfClosingTags.has(tagname.toLowerCase())) {
          finalHTML += `<${tagname}${attrString}/>`;
        } else {
          finalHTML += `<${tagname}${attrString}>`;
          tagStack.push(tagname);
        }
      },
      
      onclosetag(tagname) {
        // Only process whitelisted tags
        if (!allowedTags.has(tagname.toLowerCase())) {
          return;
        }

        // Only add closing tag if it's not self-closing and was opened
        if (!selfClosingTags.has(tagname.toLowerCase())) {
          // Check if this tag was actually opened
          const lastOpenTag = tagStack.pop();
          if (lastOpenTag === tagname) {
            finalHTML += `</${tagname}>`;
          } else {
            // Tag mismatch - try to recover
            console.warn(`⚠️ Tag mismatch: expected ${lastOpenTag}, got ${tagname}`);
            hasErrors = true;
            if (lastOpenTag) {
              // Close the last opened tag first
              finalHTML += `</${lastOpenTag}>`;
            }
            // If this tag is still open in the stack, close up to it
            const tagIndex = tagStack.lastIndexOf(tagname);
            if (tagIndex >= 0) {
              // Close all tags after this one
              for (let i = tagStack.length - 1; i > tagIndex; i--) {
                finalHTML += `</${tagStack[i]}>`;
              }
              // Close this tag
              finalHTML += `</${tagname}>`;
              // Remove all closed tags from stack
              tagStack.splice(tagIndex);
            }
          }
        }
      },
      
      ontext(text) {
        // Properly escape text content but preserve already escaped entities
        const escapedText = he.encode(text, { 
          useNamedReferences: false,
          allowUnsafeSymbols: false 
        });
        // Preserve existing valid entities
        finalHTML += escapedText.replace(/&amp;(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, '&$1;');
      },
      
      oncomment(data) {
        // Keep comments but sanitize them
        const sanitizedComment = he.encode(data, { useNamedReferences: false });
        finalHTML += `<!--${sanitizedComment}-->`;
      },

      onerror(error) {
        console.error('⚠️ HTML parsing error:', error);
        hasErrors = true;
      }
    }, {
      decodeEntities: true,
      lowerCaseAttributeNames: false,  // Keep case for Confluence attributes like ac:name
      recognizeSelfClosing: true
    });

    // Step 3: Parse the content
    parser.write(processedContent);
    parser.end();

    // Step 4: Close any remaining unclosed tags
    while (tagStack.length > 0) {
      const unclosedTag = tagStack.pop();
      console.warn(`⚠️ Auto-closing unclosed tag: ${unclosedTag}`);
      finalHTML += `</${unclosedTag}>`;
      hasErrors = true;
    }

    // Step 5: Final cleanup and validation
    const result = finalHTML
      // Remove empty tags that could cause issues (but keep non-breaking spaces)
      .replace(/<(\w+)([^>]*?)>\s*<\/\1>/g, (match, tagName) => {
        // Keep paragraph and cell tags with nbsp
        if (['p', 'td', 'th', 'li'].includes(tagName.toLowerCase())) {
          return `<${tagName}>&nbsp;</${tagName}>`;
        }
        return ''; // Remove other empty tags
      })
      .replace(/>\s+</g, '><') // Remove spaces between tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    console.log('✅ Advanced HTML sanitization complete');
    console.log(`📊 Original length: ${content.length}, Final length: ${result.length}`);
    if (hasErrors) {
      console.warn('⚠️ Some HTML errors were detected and fixed during processing');
    }
    
    return result;

  } catch (error) {
    console.error('❌ Error in advanced HTML sanitization:', error);
    console.log('🔄 Falling back to basic cleanup...');
    // Fallback to basic cleanup
    return basicContentCleanup(content);
  }
}

// ================================================================================= 
// HELPER FUNCTIONS FOR CONTENT SAFETY
// =================================================================================

/**
 * Validate and clean page title to prevent font/encoding issues
 */
function validateAndCleanTitle(title: string): string {
  return title
    // Remove control characters and invalid XML characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix common encoding issues
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¦/g, '...')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Ensure title is not empty and has reasonable length
    || `Generated Document - ${new Date().toLocaleDateString()}`;
}

/**
 * Ensure content is properly UTF-8 encoded and safe for Confluence
 */
function ensureUtf8Encoding(content: string): string {
  try {
    // Try to detect and fix encoding issues
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const encoded = encoder.encode(content);
    const decoded = decoder.decode(encoded);
    return decoded;
  } catch (error) {
    console.warn('UTF-8 encoding validation failed, using original content:', error);
    return content;
  }
}

// ================================================================================= 
// PAGE CREATION FUNCTION
// =================================================================================

export async function createPageFromGeneratedContent(
  title: string,
  fullStorageFormat: string,
  spaceKey: string,
  parentPageId?: string
): Promise<void> {
  try {
    console.log('🔄 Creating page from generated content...');
    
    // Step 0: Validate and clean title
    const cleanTitle = validateAndCleanTitle(title);
    console.log('📋 Original title:', title);
    console.log('📋 Clean title:', cleanTitle);
    console.log('📋 Space:', spaceKey);
    console.log('📋 Content length:', fullStorageFormat.length);
    
    // Step 0.5: Ensure UTF-8 encoding
    const utf8Content = ensureUtf8Encoding(fullStorageFormat);
    console.log('🔤 UTF-8 validation complete');
    
    // Show content preview for debugging
    console.log('📄 Content preview (first 200 chars):');
    console.log(utf8Content.substring(0, 200));
    
    // Step 1: Enhanced content cleanup with Vietnamese support
    console.log('🧹 Starting enhanced content cleanup...');
    let processedContent = basicContentCleanup(utf8Content);
    
    // Step 2: Advanced HTML sanitization and validation
    console.log('🔬 Performing advanced HTML sanitization...');
    processedContent = advancedHTMLSanitization(processedContent);
    
    // Step 3: Convert all macros to mermaid-cloud macros
    console.log('🔄 Converting macros to mermaid-cloud...');
    processedContent = convertToMermaidCloudMacros(processedContent);
    
    const finalContent = processedContent;
    console.log('✅ Content processing complete');
    console.log('📄 Final content length:', finalContent.length);
    console.log('📄 Final content preview (first 200 chars):');
    console.log(finalContent.substring(0, 200));
    
    // Create the page payload with clean title
    const createPayload: any = {
      type: 'page',
      title: cleanTitle.trim() + '-' + Date.now(), // Use clean title with timestamp
      space: { key: spaceKey },
      body: {
        storage: {
          value: finalContent,
          representation: 'storage'
        }
      }
    };

    // Add parent page if specified
    if (parentPageId) {
      createPayload.ancestors = [{ id: parentPageId }];
      console.log('📁 Setting parent page ID:', parentPageId);
    }

    console.log('📤 Sending page creation request...');
    const response = await fetch('/rest/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check'
      },
      body: JSON.stringify(createPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Page creation failed:', errorText);
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
        
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          const detailedErrors = errorJson.errors.map((err: any) => 
            `${err.field || 'Unknown field'}: ${err.message || err}`
          ).join('\n');
          errorMessage += `\n\nDetailed errors:\n${detailedErrors}`;
        }
        
      } catch (parseError) {
        console.warn('Could not parse error response as JSON');
        errorMessage += `\n\nRaw error: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }    const result = await response.json();
    console.log('✅ Page created successfully!');
    console.log('📄 Page ID:', result.id);
    console.log('🔗 Page URL:', result._links?.webui);
    
    let finalMessage = `✅ Tạo tài liệu thành công!\n\nTiêu đề: ${result.title}\nPage ID: ${result.id}`;
    const extractedDiagrams:DiagramData[] = getDiagramConfluenceStyles(fullStorageFormat);
    console.log(`📊 Extracted ${extractedDiagrams.length} diagrams from content`);
    // Process and save diagrams after page creation
    if (extractedDiagrams.length > 0) {
      console.log('🎨 Processing extracted diagrams...');
      const diagramResult = await processAndSaveDiagrams(result.id, extractedDiagrams);
      
      // Add diagram processing result to message
      if (diagramResult.total > 0) {
        finalMessage += `\n\n📊 Diagrams: ${diagramResult.success}/${diagramResult.total} saved successfully`;
        
        if (diagramResult.errors.length > 0) {
          finalMessage += `\n⚠️ Diagram errors:\n${diagramResult.errors.join('\n')}`;
        }
      }
    }
    
    // Show final result after everything is complete
    if ((window as any).KToolNotificationUtils) {
      (window as any).KToolNotificationUtils.success(
        'Trang đã được tạo thành công!',
        finalMessage.replace(/^✅\s*/, '')
      );
    }
    
    if (result._links?.webui) {
      const fullUrl = `${window.location.origin}${result._links.webui}`;
      window.open(fullUrl, '_blank');
    }

  } catch (error) {
    console.error('❌ Error creating page:', error);
    
    let userMessage = 'Lỗi khi tạo trang Confluence.';
    
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        userMessage = `❌ Nội dung không hợp lệ:\n\n${error.message}`;
      } else if (error.message.includes('HTTP 400')) {
        userMessage = '❌ Dữ liệu không hợp lệ. Vui lòng kiểm tra lại nội dung.';
      } else if (error.message.includes('HTTP 401')) {
        userMessage = '❌ Không có quyền truy cập. Vui lòng đăng nhập lại.';
      } else if (error.message.includes('HTTP 403')) {
        userMessage = '❌ Không có quyền tạo trang trong space này.';
      } else {
        userMessage = `❌ ${error.message}`;
      }
    }
    
    if ((window as any).KToolNotificationUtils) {
      (window as any).KToolNotificationUtils.error(
        'Lỗi tạo trang',
        userMessage.replace(/^❌\s*/, '')
      );
    }
    throw error;
  }
}

// ================================================================================= 
// OTHER UTILITY FUNCTIONS (Keep existing)
// =================================================================================

export async function cloneTemplateForGeneration(url: string): Promise<ClonedTemplate | null> {
  // ... existing implementation
  try {
    console.log('🔍 Cloning template from URL:', url);
    
    if (!url || !url.trim()) {
      console.error('❌ Empty URL provided');
      return null;
    }

    const urlObj = new URL(url);
    const pageId = urlObj.searchParams.get('pageId');
    if (!pageId) {
      console.error('❌ No pageId found in URL');
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.error(
          'URL không hợp lệ',
          'URL không chứa pageId. Vui lòng kiểm tra lại URL template.'
        );
      }
      return null;
    }

    console.log('📋 Fetching template pageId:', pageId);
    const apiUrl = `/rest/api/content/${pageId}?expand=body.storage`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📄 Template data received:', {
      id: data.id,
      title: data.title,
      hasStorage: !!data.body?.storage?.value
    });

    if (!data.body?.storage?.value) {
      console.error('❌ No storage content found in response');
      return null;
    }

    const originalStorageFormat = data.body.storage.value;
    console.log('📄 Original storage format length:', originalStorageFormat.length);
    
    const { templateStructure, analysisInfo } = extractTemplateStructure(originalStorageFormat);

    const result: ClonedTemplate = {
      title: data.title,
      originalStorageFormat,
      templateStructure,
      analysisInfo
    };

    console.log('✅ Template cloned successfully:', {
      title: result.title,
      originalLength: originalStorageFormat.length,
      structureLength: templateStructure.length,
      analysis: analysisInfo
    });

    if ((window as any).KToolNotificationUtils) {
      (window as any).KToolNotificationUtils.success(
        'Template đã được clone thành công!',
        `Tiêu đề: ${result.title}\nPhân tích:\n- Empty paragraphs: ${analysisInfo.emptyParagraphs}\n- Empty table cells: ${analysisInfo.emptyTableCells}\n- Template size: ${Math.round(analysisInfo.totalLength / 1000)}K chars\n\nAI sẽ phân tích cấu trúc này để generate full document.`
      );
    }

    return result;

  } catch (error) {
    console.error("❌ Error cloning template:", error);
    if ((window as any).KToolNotificationUtils) {
      (window as any).KToolNotificationUtils.error(
        'Lỗi khi clone template',
        String(error)
      );
    }
    return null;
  }
}

export function getCurrentSpaceKey(): string | null {
  try {
    const currentUrl = window.location.href;
    
    const spaceMatch1 = currentUrl.match(/\/spaces\/([^\/]+)\//);
    if (spaceMatch1) {
      return spaceMatch1[1];
    }
    
    const spaceMatch2 = currentUrl.match(/spaceKey=([^&]+)/);
    if (spaceMatch2) {
      return spaceMatch2[1];
    }
    
    const metaSpaceKey = document.querySelector('meta[name="ajs-space-key"]');
    if (metaSpaceKey) {
      return metaSpaceKey.getAttribute('content');
    }
    
    console.warn('Could not determine space key from URL:', currentUrl);
    return null;
  } catch (error) {
    console.error('Error getting space key:', error);
    return null;
  }
}

export async function fetchConfluenceContent(pageId: string): Promise<{ 
  title: string; 
  content: string; 
  storageFormat: string; 
} | null> {
  try {
    console.log('🔍 Fetching Confluence content for pageId:', pageId);
    
    const apiUrl = `/rest/api/content/${pageId}?expand=body.storage,body.view`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📄 Content data received:', {
      id: data.id,
      title: data.title,
      hasStorage: !!data.body?.storage?.value,
      hasView: !!data.body?.view?.value
    });

    return {
      title: data.title,
      content: data.body?.view?.value || '',
      storageFormat: data.body?.storage?.value || ''
    };

  } catch (error) {
    console.error("❌ Error fetching Confluence content:", error);
    return null;
  }
}

function extractTemplateStructure(storageFormat: string): { 
  templateStructure: string; 
  analysisInfo: { emptyParagraphs: number; emptyTableCells: number; placeholders: number; totalLength: number; } 
} {
  let emptyParagraphs = 0;
  let emptyTableCells = 0;
  let placeholders = 0;

  console.log('🔍 Extracting template structure...');

  const placeholderPatterns = [
    /(<<.*?>>)/g,
    /(\{\{.*?\}\})/g,
    /(&lt;&lt;.*?&gt;&gt;)/g,
    /(\u003c\u003c.*?\u003e\u003e)/g
  ];

  let structure = storageFormat;

  placeholderPatterns.forEach((regex, index) => {
    const matches = [...structure.matchAll(regex)];
    console.log(`🎯 Placeholder pattern ${index + 1} found ${matches.length} matches`);
    placeholders += matches.length;
  });

  structure = structure
    .replace(/<p><br\s*\/?><\/p>/g, () => {
      emptyParagraphs++;
      return '<p><<content_goes_here>></p>';
    })
    .replace(/<td[^>]*>(\s*<p><br\s*\/?><\/p>\s*|\s*)<\/td>/g, () => {
      emptyTableCells++;
      return '<td><<table_content_goes_here>></td>';
    })
    .replace(/\s+/g, ' ')
    .trim();

  const analysisInfo = {
    emptyParagraphs,
    emptyTableCells,
    placeholders,
    totalLength: structure.length
  };

  console.log('📊 Template analysis:', analysisInfo);
  return { templateStructure: structure, analysisInfo };
}

// Export simplified debug functions
(window as any).debugXMLValidation = debugXMLValidation;
(window as any).convertToMermaidCloudMacros = convertToMermaidCloudMacros;
(window as any).basicContentCleanup = basicContentCleanup;
(window as any).advancedHTMLSanitization = advancedHTMLSanitization;
(window as any).processAndSaveDiagrams = processAndSaveDiagrams;

// Keep existing markdown processing functions
const rehypeConfluenceCodeMacro = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'pre' && parent && typeof index === 'number') {
        const codeNode = node.children[0];
        if (codeNode && codeNode.type === 'element' && codeNode.tagName === 'code') {
          const langClass = (codeNode.properties?.className as string[] | undefined)?.find(c => c.startsWith('language-'));
          const language = langClass ? langClass.substring(9) : 'none';
          const textNode = codeNode.children[0];
          const codeText = (textNode && textNode.type === 'text') ? textNode.value : '';

          const confluenceMacro: any = {
            type: 'element',
            tagName: 'ac:structured-macro',
            properties: { 'ac:name': 'code', 'ac:schema-version': '1' },
            children: [
              {
                type: 'element',
                tagName: 'ac:parameter',
                properties: { 'ac:name': 'language' },
                children: [{ type: 'text', value: language }],
              },
              {
                type: 'element',
                tagName: 'ac:plain-text-body',
                children: [{ type: 'raw', value: `<![CDATA[${codeText}]]>` }],
              },
            ],
          };

          parent.children[index] = confluenceMacro;
        }
      }
    });
  };
};

async function robustMarkdownToStorageFormat(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeConfluenceCodeMacro)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(markdown);
  return String(file).replace(/&nbsp;/g, '&#160;');
}

// Export debugging functions for testing
export {
  extractDiagramContent,
  convertDiagramToSvgPng,
  convertToMermaidCloudMacros,
  processAndSaveDiagrams,
  saveDiagramToAPI,
  basicContentCleanup,
  advancedHTMLSanitization
};
