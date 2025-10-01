import React from 'react';
import styles from './Header.module.scss';

interface HeaderProps {
    onSettingsClick: () => void;
    onClose: () => void;
    onToggleFullscreen: () => void;
    onToggleMinimize: () => void;
    onToggleTheme: () => void;
    onBackToMain: () => void;
    isFullscreen: boolean;
    isMinimized: boolean;
    isDarkMode: boolean;
    currentView: string;
}

const Header: React.FC<HeaderProps> = ({ 
    onSettingsClick, 
    onClose, 
    onToggleFullscreen,
    onToggleMinimize,
    onToggleTheme,
    onBackToMain,
    isFullscreen,
    isMinimized,
    isDarkMode,
    currentView
}) => {
    const getViewTitle = () => {
        switch(currentView) {
            case 'settings': return '⚙️ Settings';
            case 'main': return '🚀 K-tool Assistant';
            case 'preview': return '👁️ Preview';
            case 'edit': return '✏️ Editor';
            default: return '🚀 K-tool Assistant';
        }
    };

    return (
        <header className={`${styles.header} ${isDarkMode ? styles.headerDark : styles.headerLight}`}>
            <div className={styles.titleContainer}>
                <div className={styles.logoContainer}>
                    <span className={styles.logo}>🚀</span>
                    <div className={`${styles.statusDot} ${styles.statusActive}`}></div>
                </div>
                <div className={styles.titleGroup}>
                    <h3 className={styles.title}>{getViewTitle()}</h3>
                    <span className={styles.subtitle}>AI Document Generator</span>
                </div>
                {currentView === 'settings' && (
                    <button 
                        onClick={onBackToMain}
                        className={`${styles.backButton} ${styles.controlButton}`}
                        title="Back to Main"
                    >
                        ← Back
                    </button>
                )}
            </div>
            
            <div className={styles.controls}>
                <div className={styles.actionControls}>
                    <button 
                        onClick={onToggleTheme} 
                        className={`${styles.controlButton} ${styles.themeButton}`} 
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                    
                    <button 
                        onClick={onSettingsClick} 
                        className={`${styles.controlButton} ${styles.settingsButton} ${currentView === 'settings' ? styles.active : ''}`} 
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
                
                <div className={styles.windowControls}>
                    <button 
                        onClick={onToggleMinimize} 
                        className={`${styles.controlButton} ${styles.minimizeButton}`} 
                        title={isMinimized ? 'Restore Window' : 'Minimize Window'}
                    >
                        {isMinimized ? '🔺' : '━'}
                    </button>
                    
                    <button 
                        onClick={onToggleFullscreen} 
                        className={`${styles.controlButton} ${styles.fullscreenButton}`} 
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? '⧉' : '⬜'}
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className={`${styles.controlButton} ${styles.closeButton}`} 
                        title="Close Window"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;