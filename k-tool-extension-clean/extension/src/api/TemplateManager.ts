// utils/TemplateManager.ts
export interface TemplateSection {
  id: string;
  type: 'text' | 'table' | 'list' | 'macro';
  placeholder: string;
  context: string;
  storageFormat: string;
  position: number;
}

export interface ParsedTemplate {
  title: string;
  storageFormat: string;
  sections: TemplateSection[];
}

export class TemplateManager {
  /**
   * Parse template và tìm các placeholder sections
   */
  static parseTemplate(storageFormat: string): TemplateSection[] {
    const sections: TemplateSection[] = [];
    
    // Pattern để tìm placeholder trong Confluence storage format
    const patterns = [
      // Text placeholders: {{SECTION_NAME}}
      /{{\s*([A-Z_]+)\s*}}/g,
      // Table placeholders: <td>{{TABLE_DATA}}</td>
      /<td[^>]*>{{\s*([A-Z_]+)\s*}}<\/td>/g,
      // Macro placeholders
      /<ac:parameter[^>]*>{{\s*([A-Z_]+)\s*}}<\/ac:parameter>/g
    ];

    patterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(storageFormat)) !== null) {
        const placeholder = match[0];
        const sectionId = match[1];
        
        // Xác định context xung quanh placeholder
        const start = Math.max(0, match.index - 200);
        const end = Math.min(storageFormat.length, match.index + placeholder.length + 200);
        const context = storageFormat.substring(start, end);
        
        // Xác định type dựa trên context
        let type: 'text' | 'table' | 'list' | 'macro' = 'text';
        if (context.includes('<table') || context.includes('<td')) {
          type = 'table';
        } else if (context.includes('<ul') || context.includes('<ol')) {
          type = 'list';
        } else if (context.includes('<ac:structured-macro')) {
          type = 'macro';
        }

        sections.push({
          id: sectionId,
          type,
          placeholder,
          context,
          storageFormat: '', // Sẽ được fill sau
          position: match.index
        });
      }
    });

    return sections.sort((a, b) => a.position - b.position);
  }

  /**
   * Replace placeholder với content được generate
   */
  static replaceSection(
    templateFormat: string, 
    sectionId: string, 
    content: string, 
    type: 'text' | 'table' | 'list' | 'macro'
  ): string {
    const placeholder = `{{${sectionId}}}`;
    
    switch (type) {
      case 'table':
        // Convert content thành table rows
        const tableContent = this.contentToTableRows(content);
        return templateFormat.replace(placeholder, tableContent);
        
      case 'list':
        // Convert content thành list items
        const listContent = this.contentToListItems(content);
        return templateFormat.replace(placeholder, listContent);
        
      case 'macro':
        // Giữ nguyên format macro, chỉ thay content
        return templateFormat.replace(placeholder, content);
        
      default:
        // Text thuần túy, convert basic markdown
        const textContent = this.markdownToStorageText(content);
        return templateFormat.replace(placeholder, textContent);
    }
  }

  private static contentToTableRows(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => `<tr><td>${line.trim()}</td></tr>`).join('');
  }

  private static contentToListItems(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => `<li>${line.trim()}</li>`).join('');
  }

  private static markdownToStorageText(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  }
}
