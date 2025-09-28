// K-Tool Extension Constants
export const EXTENSION_SETTINGS_KEY = 'extensionSettings';

// API URLs
const isLocal = true;
const rootUrl = isLocal ? 'http://localhost:5001' : 'https://gendoc.thangnotes.dev';

export const API_URLS = {
  GEN_DOC: `${rootUrl}/api/generate-full-confluence-doc`,
  GEN_DOC_STATUS: `${rootUrl}/api/generate-status`,
  GEN_DOC_RESULT: `${rootUrl}/api/generate-result`,
  EDIT_DIAGRAM: `${rootUrl}/api/edit-diagram`,
  EDIT_TEXT: `${rootUrl}/api/edit-text`
};

// Default settings
export const DEFAULT_SETTINGS = {
  apiKey: '',
  urlTemplate: '',
  customPrompt: '',
  documentUrl: '',
  databaseUrl: '',
  instructionUrl: '',
  isEnabled: true,
  selectedModel: 'sonar-pro'
};

// AI Models
export const AI_MODELS = {
  'sonar-pro': {
    name: 'Sonar Pro',
    provider: 'Perplexity',
    description: 'Perplexity AI Sonar Pro model'
  },
  'gemini': {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Google Gemini 2.0 Flash model'
  }
};

// Progress steps for document generation
export const PROGRESS_STEPS = [
  { id: 'fetch', label: 'Lấy nội dung BA', status: 'pending' },
  { id: 'clone', label: 'Clone template', status: 'pending' },
  { id: 'analyze', label: 'Phân tích placeholders', status: 'pending' },
  { id: 'generate', label: 'AI sinh tài liệu', status: 'pending' },
  { id: 'complete', label: 'Hoàn thành', status: 'pending' }
];

// Validation patterns
export const VALIDATION = {
  URL_PATTERN: /^https?:\/\/.+/,
  PLACEHOLDER_PATTERN: /<<([^>]+)>>/g,
  MIN_PROMPT_LENGTH: 10
};
