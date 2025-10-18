// K-Tool Extension Constants
export const EXTENSION_SETTINGS_KEY = "extensionSettings";

// API URLs
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.includes("localhost");
const rootUrl = isLocal
  ? "http://localhost:5001"
  : "https://document.thangnotes.dev";

// Confluence API URLs (always localhost:8090 for Confluence)
const confluenceBaseUrl = "http://localhost:8090";

export const API_URLS = {
  GEN_DOC: `${rootUrl}/api/generate-full-confluence-doc`,
  GEN_DOC_STATUS: `${rootUrl}/api/generate-status`,
  GEN_DOC_RESULT: `${rootUrl}/api/generate-result`,
  EDIT_DIAGRAM: `${rootUrl}/api/edit-diagram`,
  EDIT_MERMAID: `${rootUrl}/api/edit-mermaid`,
  EDIT_TEXT: `${rootUrl}/api/edit-text`,
  EDIT_HTML_CONTENT: `${rootUrl}/api/edit-html-content`,
  CONVERT_HTML_TO_XHTML: `${rootUrl}/api/html-to-xhtml`,
};

export const CONFLUENCE_API_URLS = {
  MERMAID_DIAGRAM: `${confluenceBaseUrl}/rest/mermaidrest/1.0/mermaid/diagram`,
  MERMAID_SAVE: `${confluenceBaseUrl}/rest/mermaidrest/1.0/mermaid/save`,
  MERMAID_UPDATE: `${confluenceBaseUrl}/rest/mermaidrest/1.0/mermaid`, // /{pageId}
  MERMAID_EDIT_REFERER: `${confluenceBaseUrl}/plugins/mermaid-cloud/editMermaidDiagram.action`,
  TINYMCE_PLACEHOLDER: `${confluenceBaseUrl}/rest/tinymce/1/macro/placeholder`,
};

// Default settings
export const DEFAULT_SETTINGS = {
  apiKey: "",
  urlTemplate: "",
  customPrompt: "",
  documentUrl: "",
  databaseUrl: "",
  instructionUrl: "",
  isEnabled: true,
  selectedModel: "sonar-pro",
};

// AI Models
export const AI_MODELS = {
  "sonar-pro": {
    name: "Sonar Pro",
    provider: "Perplexity",
    description: "Perplexity AI Sonar Pro model",
  },
  gemini: {
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Google Gemini 2.0 Flash model",
  },
};

// Progress steps for document generation
export const PROGRESS_STEPS = [
  { id: "fetch", label: "Fetch BA Content", status: "pending" },
  { id: "clone", label: "Clone Template", status: "pending" },
  { id: "analyze", label: "Analyze Placeholders", status: "pending" },
  { id: "generate", label: "AI Generate Document", status: "pending" },
  { id: "complete", label: "Complete", status: "pending" },
];

// Validation patterns
export const VALIDATION = {
  URL_PATTERN: /^https?:\/\/.+/,
  PLACEHOLDER_PATTERN: /<<([^>]+)>>/g,
  MIN_PROMPT_LENGTH: 10,
};
