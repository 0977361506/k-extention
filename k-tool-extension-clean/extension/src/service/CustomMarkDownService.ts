import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import mermaid from 'mermaid';
import puppeteer from 'puppeteer';
import type { Node, Parent } from 'unist';
import type { Element, Text } from 'hast';
import type { Code, Html } from 'mdast';

// Mermaid rendering options
interface MermaidOptions {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  useServerSide?: boolean;
  puppeteerPath?: string;
  width?: number;
  height?: number;
}

// Type guard functions (giữ nguyên như cũ)
function isElement(node: any): node is Element {
  return node && node.type === 'element';
}

function isText(node: any): node is Text {
  return node && node.type === 'text' && typeof node.value === 'string';
}

function isCode(node: any): node is Code {
  return node && node.type === 'code' && typeof node.value === 'string';
}

function isParent(node: any): node is Parent {
  return node && Array.isArray(node.children);
}

// Helper functions (giữ nguyên)
function extractTextContent(node: any): string {
  if (isText(node)) {
    return node.value;
  }
  
  if (isElement(node) && node.children) {
    return node.children
      .map(child => extractTextContent(child))
      .join('');
  }
  
  return '';
}

function createTextNode(value: string): Text {
  return {
    type: 'text',
    value: value
  };
}

function createElement(tagName: string, properties: Record<string, any> = {}, children: any[] = []): Element {
  return {
    type: 'element',
    tagName,
    properties,
    children
  };
}

// **Server-side Mermaid rendering với Puppeteer:**
async function renderMermaidServerSide(mermaidCode: string, options: MermaidOptions = {}): Promise<string> {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: options.puppeteerPath
    });
    
    const page = await browser.newPage();
    
    // Set viewport cho consistent rendering
    await page.setViewport({
      width: options.width || 1200,
      height: options.height || 800,
      deviceScaleFactor: 2
    });
    
    // Tạo HTML template với Mermaid
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
            }
            .mermaid { 
              display: flex; 
              justify-content: center; 
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="mermaid" id="mermaid-diagram">
            ${mermaidCode}
          </div>
          <script>
            mermaid.initialize({ 
              startOnLoad: true,
              theme: '${options.theme || 'default'}',
              securityLevel: 'loose',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            });
          </script>
        </body>
      </html>
    `;
    
    await page.setContent(htmlTemplate);
    
    // Chờ cho Mermaid render xong
    await page.waitForSelector('#mermaid-diagram svg', { timeout: 10000 });
    
    // Extract SVG content
    const svgContent = await page.evaluate(() => {
      const svgElement = document.querySelector('#mermaid-diagram svg');
      return svgElement ? svgElement.outerHTML : null;
    });
    
    if (!svgContent) {
      throw new Error('Failed to generate SVG from Mermaid diagram');
    }
    
    // Clean up SVG và add responsive attributes
    const cleanSvg = svgContent
      .replace(/width="\d+"/, 'width="100%"')
      .replace(/height="\d+"/, 'height="auto"')
      .replace(/style="[^"]*"/, 'style="max-width: 100%; height: auto;"');
    
    return cleanSvg;
    
  } catch (error) {
    console.error('Server-side Mermaid rendering failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// **Client-side Mermaid rendering:**
async function renderMermaidClientSide(mermaidCode: string, options: MermaidOptions = {}): Promise<string> {
  try {
    // Initialize Mermaid nếu chưa được initialize
    if (typeof window !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: options.theme || 'default',
        securityLevel: 'loose',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      });
      
      // Generate unique ID
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Render diagram
      const  svg  = await mermaid.render(diagramId, mermaidCode);
      
      // Clean up SVG
      const cleanSvg = svg
        .replace(/width="\d+"/, 'width="100%"')
        .replace(/height="\d+"/, 'height="auto"')
        .replace(/style="[^"]*"/, 'style="max-width: 100%; height: auto;"');
      
      return cleanSvg;
    } else {
      throw new Error('Client-side rendering requires browser environment');
    }
    
  } catch (error) {
    console.error('Client-side Mermaid rendering failed:', error);
    throw error;
  }
}

// **Main Mermaid rendering function:**
async function renderMermaidToSvg(mermaidCode: string, options: MermaidOptions = {}): Promise<string> {
  const useServerSide = options.useServerSide ?? (typeof window === 'undefined');
  
  try {
    if (useServerSide) {
      return await renderMermaidServerSide(mermaidCode, options);
    } else {
      return await renderMermaidClientSide(mermaidCode, options);
    }
  } catch (error) {
    console.error('Mermaid rendering failed, falling back to code block:', error);
    
    // Fallback: return as code block với syntax highlighting
    return `<pre><code class="language-mermaid">${mermaidCode}</code></pre>`;
  }
}

// **Custom plugin để xử lý Mermaid blocks với SVG:**
function remarkMermaidToSvg(options: MermaidOptions = {}) {
  return (tree: Node) => {
    const promises: Promise<void>[] = [];
    
    visit(tree, 'code', (node: any, index: number | null, parent: Parent | null) => {
      if (isCode(node) && node.lang === 'mermaid') {
        const promise = (async () => {
          try {
            const mermaidCode = node.value.trim();
            const svgContent = await renderMermaidToSvg(mermaidCode, options);
            
            // Tạo HTML node với SVG content
            const htmlNode: Html = {
              type: 'html',
              value: `<div class="mermaid-diagram" style="text-align: center; margin: 20px 0;">
                        ${svgContent}
                      </div>`
            };
            
            // Replace node trong parent
            if (parent && isParent(parent) && typeof index === 'number') {
              parent.children[index] = htmlNode;
            }
            
          } catch (error) {
            console.error('Failed to process Mermaid diagram:', error);
            
            // Fallback: keep as code block
            const htmlNode: Html = {
              type: 'html',
              value: `<div class="mermaid-fallback">
                        <p><strong>Mermaid Diagram (Failed to render):</strong></p>
                        <pre><code class="language-mermaid">${node.value}</code></pre>
                      </div>`
            };
            
            if (parent && isParent(parent) && typeof index === 'number') {
              parent.children[index] = htmlNode;
            }
          }
        })();
        
        promises.push(promise);
        return [SKIP, index];
      }
    });
    
    // Return promise that resolves when all Mermaid diagrams are processed
    return Promise.all(promises).then(() => tree);
  };
}

// **Các plugin khác giữ nguyên như cũ:**
function rehypeConfluenceFormat() {
  return (tree: Node) => {
    visit(tree, 'element', (node: any, index: number | null, parent: Parent | null) => {
      if (!isElement(node)) return;
      
      // Xử lý headers
      if (node.tagName && node.tagName.match(/^h[1-6]$/)) {
        const level = parseInt(node.tagName.charAt(1));
        const macroId = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const macroElement = createElement('ac:structured-macro', {
          'ac:name': 'heading',
          'ac:schema-version': '1',
          'ac:macro-id': macroId
        });
        
        const paramElement = createElement(
          'ac:parameter',
          { 'ac:name': 'level' },
          [createTextNode(level.toString())]
        );
        
        const bodyElement = createElement(
          'ac:rich-text-body',
          {},
          [...(node.children || [])]
        );
        
        macroElement.children = [paramElement, bodyElement];
        
        if (parent && isParent(parent) && typeof index === 'number') {
          parent.children[index] = macroElement;
        }
        
        return [SKIP, index];
      }
      
      // Xử lý code blocks (không phải mermaid)
      if (node.tagName === 'pre' && node.children) {
        const codeElement = node.children.find((child: any) => 
          isElement(child) && child.tagName === 'code'
        );
        
        if (isElement(codeElement)) {
          let language = 'text';
          if (codeElement.properties && codeElement.properties.className) {
            const classNames = Array.isArray(codeElement.properties.className) 
              ? codeElement.properties.className 
              : [codeElement.properties.className];
            
            const langClass = classNames.find((cls: any) => 
              typeof cls === 'string' && cls.startsWith('language-')
            );
            
            if (langClass && typeof langClass === 'string') {
              language = langClass.replace('language-', '');
            }
          }
          
          // Skip nếu là mermaid (đã được xử lý)
          if (language === 'mermaid') {
            return;
          }
          
          const codeContent = extractTextContent(codeElement);
          const macroId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const macroElement = createElement('ac:structured-macro', {
            'ac:name': 'code',
            'ac:schema-version': '1',
            'ac:macro-id': macroId
          });
          
          macroElement.children = [
            createElement(
              'ac:parameter',
              { 'ac:name': 'language' },
              [createTextNode(language)]
            ),
            createElement(
              'ac:plain-text-body',
              {},
              [createTextNode(codeContent)]
            )
          ];
          
          if (parent && isParent(parent) && typeof index === 'number') {
            parent.children[index] = macroElement;
          }
          
          return [SKIP, index];
        }
      }
      
      // Xử lý tables
      if (node.tagName === 'table') {
        const macroId = `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const originalChildren = [...(node.children || [])];
        
        const macroElement = createElement('ac:structured-macro', {
          'ac:name': 'table',
          'ac:schema-version': '1',
          'ac:macro-id': macroId
        });
        
        const tableElement = createElement('table', {}, originalChildren);
        const bodyElement = createElement(
          'ac:rich-text-body',
          {},
          [tableElement]
        );
        
        macroElement.children = [bodyElement];
        
        if (parent && isParent(parent) && typeof index === 'number') {
          parent.children[index] = macroElement;
        }
        
        return [SKIP, index];
      }
    });
  };
}

// **Main processor function với async support:**
export async function markdownToConfluenceStorage(
  markdown: string, 
  mermaidOptions: MermaidOptions = {}
): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    console.warn('Invalid markdown input:', markdown);
    return '';
  }

  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkBreaks)
      .use(remarkMermaidToSvg, mermaidOptions) // Plugin với SVG rendering
      .use(remarkRehype, { 
        allowDangerousHtml: true,
        passThrough: ['html']
      })
      .use(rehypeConfluenceFormat)
      .use(rehypeStringify, { 
        allowDangerousHtml: true,
        closeSelfClosing: true,
        omitOptionalTags: false
      });

    const result = await processor.process(markdown);
    
    if (!result || !result.value) {
      throw new Error('Processor returned invalid result');
    }
    
    return String(result.value);
    
  } catch (error) {
    console.error('Error processing markdown:', error);
    console.error('Input markdown:', markdown);
    
    // Fallback to simple regex-based processing
    return await fallbackMarkdownProcessing(markdown, mermaidOptions);
  }
}

// **Fallback function với SVG support:**
async function fallbackMarkdownProcessing(markdown: string, mermaidOptions: MermaidOptions = {}): Promise<string> {
  try {
    let html = markdown;

    // Process mermaid blocks với SVG rendering
    const mermaidMatches = html.match(/```mermaid\n([\s\S]*?)\n```/g);
    
    if (mermaidMatches) {
      for (const match of mermaidMatches) {
        const mermaidCode = match.replace(/```mermaid\n/, '').replace(/\n```$/, '').trim();
        
        try {
          const svgContent = await renderMermaidToSvg(mermaidCode, mermaidOptions);
          const replacement = `<div class="mermaid-diagram" style="text-align: center; margin: 20px 0;">
                                ${svgContent}
                              </div>`;
          html = html.replace(match, replacement);
        } catch (error) {
          console.error('Fallback Mermaid rendering failed:', error);
          const replacement = `<div class="mermaid-fallback">
                                <p><strong>Mermaid Diagram (Failed to render):</strong></p>
                                <pre><code class="language-mermaid">${mermaidCode}</code></pre>
                              </div>`;
          html = html.replace(match, replacement);
        }
      }
    }

    // Process other code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
      if (lang === 'mermaid') return match; // Skip mermaid, đã xử lý ở trên
      
      const language = lang || 'text';
      const macroId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return `<ac:structured-macro ac:name="code" ac:schema-version="1" ac:macro-id="${macroId}">
                <ac:parameter ac:name="language">${language}</ac:parameter>
                <ac:plain-text-body><![CDATA[${code.trim()}]]></ac:plain-text-body>
              </ac:structured-macro>`;
    });

    // Process headers
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      const macroId = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return `<ac:structured-macro ac:name="heading" ac:schema-version="1" ac:macro-id="${macroId}">
                <ac:parameter ac:name="level">${level}</ac:parameter>
                <ac:rich-text-body>${title}</ac:rich-text-body>
              </ac:structured-macro>`;
    });

    // Process bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Process italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process line breaks
    html = html.replace(/\n/g, '<br/>');

    return html;
    
  } catch (fallbackError) {
    console.error('Fallback processing also failed:', fallbackError);
    return markdown;
  }
}

// **Usage example:**
export async function exampleUsage() {
  const markdown = `
# Test Document

Here's a Mermaid diagram:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Fix it]
    D --> B
\`\`\`

And some code:

\`\`\`typescript
console.log("Hello world!");
\`\`\`
`;

  const options: MermaidOptions = {
    theme: 'default',
    useServerSide: true,
    width: 1200,
    height: 800
  };

  const result = await markdownToConfluenceStorage(markdown, options);
  console.log(result);
}

// Export additional utility functions
export { 
  extractTextContent, 
  isElement, 
  isText, 
  isCode,
  renderMermaidToSvg,
  type MermaidOptions 
};