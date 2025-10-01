import React from 'react';

interface DocumentStatsProps {
  content: string;
  title: string;
  diagramCount: number;
}

const DocumentStats: React.FC<DocumentStatsProps> = ({ content, title, diagramCount }) => {
  const getWordCount = (text: string): number => {
    // Remove HTML tags and count words
    const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText ? plainText.split(' ').length : 0;
  };

  const getCharacterCount = (text: string): number => {
    return text.length;
  };

  const getParagraphCount = (text: string): number => {
    const paragraphs = text.match(/<p[^>]*>.*?<\/p>/g) || [];
    return paragraphs.length;
  };

  const getTableCount = (text: string): number => {
    const tables = text.match(/<table[^>]*>.*?<\/table>/g) || [];
    return tables.length;
  };

  const getHeadingCount = (text: string): number => {
    const headings = text.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g) || [];
    return headings.length;
  };

  const stats = [
    {
      label: 'Title',
      value: title || 'Untitled Document',
      icon: '📄',
      color: '#667eea'
    },
    {
      label: 'Characters',
      value: getCharacterCount(content).toLocaleString(),
      icon: '🔤',
      color: '#764ba2'
    },
    {
      label: 'Words',
      value: getWordCount(content).toLocaleString(),
      icon: '📝',
      color: '#28a745'
    },
    {
      label: 'Paragraphs',
      value: getParagraphCount(content),
      icon: '📃',
      color: '#17a2b8'
    },
    {
      label: 'Headings',
      value: getHeadingCount(content),
      icon: '📋',
      color: '#ffc107'
    },
    {
      label: 'Tables',
      value: getTableCount(content),
      icon: '📊',
      color: '#6f42c1'
    },
    {
      label: 'Diagrams',
      value: diagramCount,
      icon: '🎨',
      color: '#fd7e14'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '8px',
      padding: '12px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '6px',
      margin: '12px 0'
    }}>
      {stats.slice(1).map((stat, index) => ( // Skip title as it's already shown
        <div
          key={index}
          style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px',
            borderRadius: '4px',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <div style={{
            fontSize: '16px',
            marginBottom: '2px'
          }}>
            {stat.icon}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '1px'
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: '500'
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentStats;
