import React from 'react';
import { createRoot } from 'react-dom/client';
import KToolBubble from '../../components/confluence/KToolBubble';
import { exportPNG, exportSVG } from '../../utils/mermaidExporter';
import '../../utils/UIInit.js';

const injectStyles = () => {
    const styleId = 'ktool-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        #ktool-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            z-index: 999999 !important;
        }
        
        #ktool-root > * {
            pointer-events: auto !important;
        }
        
        .ktool-bubble-button:hover {
            transform: scale(1.1) translateY(-2px) !important;
            box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4) !important;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .ktool-bubble-button {
                bottom: 20px !important;
                right: 20px !important;
                width: 56px !important;
                height: 56px !important;
            }
        }
        
        /* Custom scrollbar */
        div[style*="overflowY: auto"]::-webkit-scrollbar {
            width: 6px;
        }
        
        div[style*="overflowY: auto"]::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }
        
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    `;
    document.head.appendChild(style);
};

function injectKTool() {
    console.log('🚀 K-tool: Initializing React content script...');
    
    if (document.getElementById('ktool-root')) {
        console.log('🔍 K-tool: Already injected, skipping...');
        return;
    }

    injectStyles();

    const ktoolContainer = document.createElement('div');
    ktoolContainer.id = 'ktool-root';
    document.body.appendChild(ktoolContainer);

    const root = createRoot(ktoolContainer);
    root.render(<KToolBubble />);
    
    console.log('✅ K-tool: React app mounted successfully');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectKTool);
} else {
    injectKTool();
}
injectKTool();
