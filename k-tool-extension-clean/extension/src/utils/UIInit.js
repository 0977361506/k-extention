/**
 * K-Tool Extension UI/UX Initialization
 * Modern design system initialization for Chrome Extension
 */

// Initialize core systems
(function() {
  'use strict';

  console.log('🚀 Initializing K-Tool Modern UI/UX System...');

  // Load theme manager
  function loadThemeManager() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/ThemeManager.js');
    script.onload = () => {
      console.log('🎨 Theme Manager loaded');
      
      // Auto-detect user preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!localStorage.getItem('ktool-theme')) {
        window.KToolTheme.setTheme(prefersDark ? 'dark' : 'light');
      }
    };
    document.head.appendChild(script);
  }

  // Load notification system
  function loadNotificationSystem() {
    const script1 = document.createElement('script');
    script1.src = chrome.runtime.getURL('utils/NotificationManager.js');
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = chrome.runtime.getURL('utils/AlertReplacer.js');
      script2.onload = () => {
        console.log('🔔 Notification System loaded');
        
        // Test notification
        if (window.KToolNotificationUtils) {
          setTimeout(() => {
            window.KToolNotificationUtils.info(
              'K-Tool Ready',
              'Modern UI/UX system initialized successfully!'
            );
          }, 1000);
        }
      };
      document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
  }

  // Load color system CSS
  function loadColorSystem() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/colors-beautiful-2025.scss');
    document.head.appendChild(link);
    console.log('🎨 Color system loaded');
  }

  // Initialize responsive design utilities
  function initResponsiveUtils() {
    // Add responsive classes based on screen size
    function updateResponsiveClasses() {
      const width = window.innerWidth;
      const body = document.body;
      
      body.classList.remove('ktool-mobile', 'ktool-tablet', 'ktool-desktop');
      
      if (width < 768) {
        body.classList.add('ktool-mobile');
      } else if (width < 1024) {
        body.classList.add('ktool-tablet');
      } else {
        body.classList.add('ktool-desktop');
      }
    }
    
    updateResponsiveClasses();
    window.addEventListener('resize', updateResponsiveClasses);
    
    console.log('📱 Responsive utilities initialized');
  }

  // Add custom CSS for enhanced components
  function addCustomStyles() {
    const style = document.createElement('style');
    style.id = 'ktool-modern-styles';
    style.textContent = `
      /* K-Tool Modern UI Enhancements */
      
      /* Smooth transitions for all interactive elements */
      .ktool-interactive {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Modern button styles */
      .ktool-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .ktool-button-primary {
        background: var(--primary-500, #0ea5e9);
        color: white;
        box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
      }
      
      .ktool-button-primary:hover {
        background: var(--primary-600, #0284c7);
        box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
        transform: translateY(-1px);
      }
      
      .ktool-button-secondary {
        background: var(--bg-surface, #f8fafc);
        color: var(--text-primary, #0f172a);
        border: 1px solid var(--border-primary, #e2e8f0);
      }
      
      .ktool-button-secondary:hover {
        background: var(--bg-secondary, #f1f5f9);
        border-color: var(--border-secondary, #cbd5e1);
        transform: translateY(-1px);
      }
      
      /* Modern card styles */
      .ktool-card {
        background: var(--bg-elevated, #ffffff);
        border: 1px solid var(--border-primary, #e2e8f0);
        border-radius: 12px;
        padding: 20px;
        box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
        transition: all 0.2s ease;
      }
      
      .ktool-card:hover {
        box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
        transform: translateY(-2px);
      }
      
      /* Modern input styles */
      .ktool-input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--border-secondary, #cbd5e1);
        border-radius: 8px;
        background: var(--bg-surface, #f8fafc);
        color: var(--text-primary, #0f172a);
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .ktool-input:focus {
        outline: none;
        border-color: var(--primary-500, #0ea5e9);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        background: var(--bg-elevated, #ffffff);
      }
      
      .ktool-input::placeholder {
        color: var(--text-muted, #64748b);
      }
      
      /* Loading states */
      .ktool-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
      }
      
      .ktool-loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid var(--primary-200, #bae6fd);
        border-top: 2px solid var(--primary-500, #0ea5e9);
        border-radius: 50%;
        animation: ktool-spin 1s linear infinite;
      }
      
      @keyframes ktool-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Responsive utilities */
      @media (max-width: 767px) {
        .ktool-mobile-hide { display: none !important; }
        .ktool-mobile-show { display: block !important; }
      }
      
      @media (min-width: 768px) and (max-width: 1023px) {
        .ktool-tablet-hide { display: none !important; }
        .ktool-tablet-show { display: block !important; }
      }
      
      @media (min-width: 1024px) {
        .ktool-desktop-hide { display: none !important; }
        .ktool-desktop-show { display: block !important; }
      }
      
      /* Dark mode optimizations */
      [data-theme="dark"] {
        color-scheme: dark;
      }
      
      [data-theme="dark"] .ktool-card {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
      }
      
      [data-theme="dark"] .ktool-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
      }
      
      /* Accessibility improvements */
      .ktool-focus-visible:focus-visible {
        outline: 2px solid var(--primary-500, #0ea5e9);
        outline-offset: 2px;
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    console.log('✨ Custom styles loaded');
  }

  // Main initialization function
  function initialize() {
    try {
      loadColorSystem();
      loadThemeManager();
      loadNotificationSystem();
      initResponsiveUtils();
      addCustomStyles();
      
      console.log('✅ K-Tool Modern UI/UX System fully initialized');
      
      // Dispatch custom event for other scripts
      document.dispatchEvent(new CustomEvent('ktoolUIReady', {
        detail: { version: '2.0', timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('❌ Failed to initialize K-Tool UI/UX System:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
