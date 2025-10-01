// MermaidSimpleExport.js
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

export const exportSVG = async (code) => {
  const svg  = await mermaid.render(`d${Date.now()}`, code);
  console.log("svg render= "+svg); // Log the SVG for debugging
  return svg;
};

export const exportPNG = async (code, options: any = {}) => {
  const svgString = await exportSVG(code);
  
  // Tạo SVG blob
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  
  // Tạo image và canvas
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  return new Promise((resolve) => {
    img.onload = () => {
      // Set canvas size
      const scale = options.scale || 2;
      canvas.width = (options.width || img.naturalWidth) * scale;
      canvas.height = (options.height || img.naturalHeight) * scale;
      
      // Draw với background nếu có
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert thành base64
      const base64 = canvas.toDataURL('image/png', options.quality || 0.9);
      
      // Cleanup
      URL.revokeObjectURL(url);
      resolve(base64);
    };
    
    img.src = url;
  });
};

export interface DiagramData {
  filename: string;
  macroId: string;
  diagramCode: string;
  svg?: string;
  png?: string;
}
export const getDiagramConfluenceStyles = (storage: string): DiagramData[] => {
    let macroCounter = 1;
    const extractedDiagrams: DiagramData[] = [];
    
    // Tìm tất cả mermaid macros trong storage content
    const mermaidRegex = /<ac:structured-macro[^>]*ac:name="mermaid"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="code"[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/g;
    
    let match;
    while ((match = mermaidRegex.exec(storage)) !== null) {
        const code = (match[1] || match[2] || '').trim();
        
        if (code) {
            extractedDiagrams.push({
                filename: `k-tool-diagram-${macroCounter}`,
                macroId: (110 + macroCounter).toString(),
                diagramCode: code
            });
            macroCounter++;
        }
    }

    return extractedDiagrams;
};




