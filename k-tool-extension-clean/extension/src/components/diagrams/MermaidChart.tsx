import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidChart = ({ chart }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current && chart) {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      });

      try {
        // Xóa nội dung cũ
        chartRef.current.innerHTML = '';
        
        // Tạo element mermaid
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = chart;
        chartRef.current.appendChild(mermaidDiv);
        
        // Render với mermaid.init
        mermaid.init(undefined, mermaidDiv);
      } catch (error) {
        console.error('Mermaid render error:', error);
        chartRef.current.innerHTML = `<div style="color: red;">Error rendering diagram</div>`;
      }
    }
  }, [chart]);

  return <div ref={chartRef}></div>;
};

export default MermaidChart;
