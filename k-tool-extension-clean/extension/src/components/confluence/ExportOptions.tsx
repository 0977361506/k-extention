import React, { useState } from 'react';
import styles from './ExportOptions.module.scss';

interface ExportOptionsProps {
  content: string;
  title: string;
  onExport?: (format: string) => void;
}

const ExportOptions: React.FC<ExportOptionsProps> = ({ content, title, onExport }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    console.log('Exporting as Confluence page...');
    
    try {
      if (onExport) {
        await onExport('confluence');
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.exportContainer}>
      <button
        onClick={handleExport}
        disabled={isProcessing}
        className={`${styles.exportButton} ${isProcessing ? styles.processing : ''}`}
      >
        <span className={styles.exportIcon}>
          {isProcessing ? '⏳' : '📤'}
        </span>
        <span className={styles.exportText}>
          {isProcessing ? 'Exporting...' : 'Export to Confluence'}
        </span>
      </button>
    </div>
  );
};

export default ExportOptions;