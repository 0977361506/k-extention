// Utility functions for converting between HTML tables and TipTap format

export const parseHtmlToTiptapTable = (htmlString: string): any[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = doc.querySelectorAll('table');
  
  const tableData: any[] = [];
  
  tables.forEach((table, tableIndex) => {
    const rows = table.querySelectorAll('tr');
    const tableRows: any[] = [];
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      const rowData: any[] = [];
      
      cells.forEach((cell, cellIndex) => {
        rowData.push({
          content: cell.innerHTML || cell.textContent || '',
          isHeader: cell.tagName.toLowerCase() === 'th',
          colspan: parseInt(cell.getAttribute('colspan') || '1'),
          rowspan: parseInt(cell.getAttribute('rowspan') || '1'),
        });
      });
      
      tableRows.push({
        cells: rowData,
        isHeaderRow: rowIndex === 0 || row.querySelectorAll('th').length > 0,
      });
    });
    
    tableData.push({
      tableIndex,
      rows: tableRows,
      totalRows: tableRows.length,
      totalCols: Math.max(...tableRows.map(row => row.cells.length)),
    });
  });
  
  return tableData;
};

export const insertTableFromHtml = (editor: any, htmlString: string): boolean => {
  if (!editor) return false;
  
  try {
    const tableData = parseHtmlToTiptapTable(htmlString);
    
    if (tableData.length === 0) return false;
    
    // Insert first table found
    const firstTable = tableData[0];
    
    // Insert table with calculated dimensions
    editor.chain().focus().insertTable({
      rows: firstTable.totalRows,
      cols: firstTable.totalCols,
      withHeaderRow: firstTable.rows[0]?.isHeaderRow || false,
    }).run();
    
    // Fill table with data
    firstTable.rows.forEach((row: any, rowIndex: number) => {
      row.cells.forEach((cell: any, cellIndex: number) => {
        // Calculate cell position in flat table structure
        const cellPosition = rowIndex * firstTable.totalCols + cellIndex;
        
        try {
          // Set cell content
          editor.chain()
            .focus()
            .setCellSelection({ anchorCell: cellPosition, headCell: cellPosition })
            .insertContent(cell.content)
            .run();
        } catch (e) {
          console.warn('Could not set cell content at position', cellPosition, e);
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error converting HTML table to TipTap:', error);
    return false;
  }
};

export const extractDiagramsFromHtml = (htmlString: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  const diagrams: string[] = [];
  
  // Look for Mermaid code blocks
  const codeBlocks = doc.querySelectorAll('code[class*="mermaid"], pre[class*="mermaid"], .mermaid');
  
  codeBlocks.forEach(block => {
    const diagramCode = block.textContent || block.innerHTML;
    if (diagramCode && diagramCode.trim()) {
      diagrams.push(diagramCode.trim());
    }
  });
  
  // Look for diagram placeholders or data attributes
  const diagramElements = doc.querySelectorAll('[data-diagram-code]');
  diagramElements.forEach(element => {
    const diagramCode = element.getAttribute('data-diagram-code');
    if (diagramCode) {
      try {
        diagrams.push(decodeURIComponent(diagramCode));
      } catch (e) {
        diagrams.push(diagramCode);
      }
    }
  });
  
  return diagrams;
};

export const convertPreviewContentToTiptap = (editor: any, htmlContent: string): void => {
  if (!editor || !htmlContent) return;
  
  try {
    // First, try to set the content directly
    editor.commands.setContent(htmlContent);
    
    // Then, look for tables and convert them if needed
    const tableData = parseHtmlToTiptapTable(htmlContent);
    if (tableData.length > 0) {
      console.log('Found tables in HTML content, TipTap should handle them automatically');
    }
    
    // Look for diagrams and log them
    const diagrams = extractDiagramsFromHtml(htmlContent);
    if (diagrams.length > 0) {
      console.log('Found diagrams in HTML content:', diagrams);
      // Note: Diagrams will be handled by the Mermaid extension if they're in the right format
    }
    
  } catch (error) {
    console.error('Error converting preview content to TipTap:', error);
    // Fallback: set content as-is
    editor.commands.setContent(htmlContent);
  }
};
