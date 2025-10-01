/**
 * Theme Manager for Chrome Extension
 * Manages light/dark theme switching without React
 */

class ThemeManager {
  constructor() {
    this.theme = 'auto'; // 'light', 'dark', 'auto'
    this.resolvedTheme = 'light';
    this.storageKey = 'ktool-theme';
    this.callbacks = new Set();
    
    this.init();
  }

  init() {
    // Load saved theme
    this.loadTheme();
    
    // Listen for system theme changes
    this.setupSystemThemeListener();
    
    // Apply initial theme
    this.applyTheme();
    
    console.log('🎨 Theme Manager initialized');
  }

  loadTheme() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        this.theme = saved;
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }

  saveTheme() {
    try {
      localStorage.setItem(this.storageKey, this.theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (this.theme === 'auto') {
        const newResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
        if (newResolvedTheme !== this.resolvedTheme) {
          this.resolvedTheme = newResolvedTheme;
          this.applyTheme();
          this.notifyCallbacks();
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // Set initial resolved theme
    if (this.theme === 'auto') {
      this.resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
    } else {
      this.resolvedTheme = this.theme;
    }
  }

  setTheme(newTheme) {
    if (!['light', 'dark', 'auto'].includes(newTheme)) {
      console.warn('Invalid theme:', newTheme);
      return;
    }

    const oldTheme = this.theme;
    this.theme = newTheme;
    
    // Update resolved theme
    if (newTheme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.resolvedTheme = isDark ? 'dark' : 'light';
    } else {
      this.resolvedTheme = newTheme;
    }

    this.saveTheme();
    this.applyTheme();
    
    if (oldTheme !== newTheme) {
      this.notifyCallbacks();
    }
  }

  toggleTheme() {
    const newTheme = this.resolvedTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  applyTheme() {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // Add current theme class
    root.classList.add(`theme-${this.resolvedTheme}`);
    
    // Set data attribute for CSS
    root.setAttribute('data-theme', this.resolvedTheme);
    
    // Update CSS custom properties for better compatibility
    if (this.resolvedTheme === 'dark') {
      root.style.setProperty('--theme-bg-primary', '#0f172a');
      root.style.setProperty('--theme-bg-secondary', '#1e293b');
      root.style.setProperty('--theme-text-primary', '#f1f5f9');
      root.style.setProperty('--theme-text-secondary', '#cbd5e1');
    } else {
      root.style.setProperty('--theme-bg-primary', '#ffffff');
      root.style.setProperty('--theme-bg-secondary', '#f8fafc');
      root.style.setProperty('--theme-text-primary', '#0f172a');
      root.style.setProperty('--theme-text-secondary', '#475569');
    }
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor();
    
    console.log(`🎨 Theme applied: ${this.resolvedTheme}`);
  }

  updateMetaThemeColor() {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.content = this.resolvedTheme === 'dark' ? '#0F172A' : '#FFFFFF';
  }

  // Callback system for components that need to react to theme changes
  onThemeChange(callback) {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.resolvedTheme, this.theme);
      } catch (error) {
        console.error('Theme callback error:', error);
      }
    });
  }

  // Utility methods
  isDark() {
    return this.resolvedTheme === 'dark';
  }

  isLight() {
    return this.resolvedTheme === 'light';
  }

  getTheme() {
    return this.theme;
  }

  getResolvedTheme() {
    return this.resolvedTheme;
  }

  // CSS-in-JS helper for dynamic styling
  getThemeColors() {
    return {
      primary: this.isDark() ? '#38bdf8' : '#0ea5e9',
      secondary: this.isDark() ? '#fb7185' : '#f43f5e',
      success: this.isDark() ? '#34d399' : '#10b981',
      warning: this.isDark() ? '#fbbf24' : '#f59e0b',
      error: this.isDark() ? '#f87171' : '#ef4444',
      bg: {
        primary: this.isDark() ? '#0f172a' : '#ffffff',
        secondary: this.isDark() ? '#1e293b' : '#f8fafc',
        elevated: this.isDark() ? '#334155' : '#ffffff'
      },
      text: {
        primary: this.isDark() ? '#f1f5f9' : '#0f172a',
        secondary: this.isDark() ? '#cbd5e1' : '#475569',
        muted: this.isDark() ? '#94a3b8' : '#64748b'
      },
      border: {
        primary: this.isDark() ? '#334155' : '#e2e8f0',
        secondary: this.isDark() ? '#475569' : '#cbd5e1'
      }
    };
  }
}

// Global instance
window.KToolTheme = window.KToolTheme || new ThemeManager();

// Utility functions for easy access
window.getThemeColors = () => window.KToolTheme.getThemeColors();
window.toggleTheme = () => window.KToolTheme.toggleTheme();
window.setTheme = (theme) => window.KToolTheme.setTheme(theme);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
