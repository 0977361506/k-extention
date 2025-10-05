// Constants for Mermaid AI Chat Extension

// API Configuration
const isLocal = true; // Set to false for production
const rootUrl = isLocal
  ? "http://localhost:5001"
  : "https://gendoc.thangnotes.dev";

export const API_URLS = {
  EDIT_DIAGRAM: `${rootUrl}/api/edit-diagram`,
  EDIT_TEXT: `${rootUrl}/api/edit-text`,
};

// Extension Configuration
export const EXTENSION_CONFIG = {
  NAME: "Confluence Mermaid AI Chat",
  VERSION: "1.0.0",
  DEBUG: true,
};

// Mermaid Diagram Types
export const MERMAID_TYPES = {
  FLOWCHART: "flowchart",
  SEQUENCE: "sequence",
  CLASS: "class",
  STATE: "state",
  ER: "er",
  JOURNEY: "journey",
  GANTT: "gantt",
  PIE: "pie",
  GITGRAPH: "gitgraph",
  MINDMAP: "mindmap",
  TIMELINE: "timeline",
  SANKEY: "sankey",
};

// UI Configuration
export const UI_CONFIG = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 400,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_DIAGRAM_LENGTH: 10000,
  ANIMATION_DURATION: 300,
};

// Error Messages
export const ERROR_MESSAGES = {
  NO_DIAGRAM: "No Mermaid diagram found",
  INVALID_DIAGRAM: "Invalid diagram content",
  EMPTY_PROMPT: "Please enter a prompt",
  PROMPT_TOO_SHORT: "Prompt is too short (minimum 3 characters)",
  PROMPT_TOO_LONG: "Prompt is too long (max 1,000 characters)",
  DIAGRAM_TOO_LONG: "Diagram content is too long (max 10,000 characters)",
  API_ERROR: "Failed to connect to AI service",
  NETWORK_ERROR: "Network connection error",
  TIMEOUT_ERROR: "Request timeout",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DIAGRAM_UPDATED: "✅ Diagram updated successfully!",
  CHAT_READY: "🤖 AI Chat is ready",
  EXTENSION_LOADED: "✅ Mermaid AI Chat extension loaded",
};

// CSS Classes
export const CSS_CLASSES = {
  POPUP: "mermaid-ai-chat-popup",
  HEADER: "mermaid-ai-chat-header",
  BODY: "mermaid-ai-chat-body",
  MESSAGES: "mermaid-ai-chat-messages",
  MESSAGE: "mermaid-ai-chat-message",
  INPUT: "mermaid-ai-chat-input",
  SEND_BUTTON: "mermaid-ai-chat-send",
  CLOSE_BUTTON: "mermaid-ai-chat-close",
};

// Mermaid Detection Selectors
export const MERMAID_SELECTORS = [
  ".mermaid",
  ".mermaid-diagram",
  "svg[id*='mermaid']",
  "ac\\:structured-macro[ac\\:name='mermaid']",
  ".mermaid-wrapper",
  ".diagram-container",
  "script[type='text/mermaid']",
  "pre code.language-mermaid",
  "code.mermaid",
];

// Mermaid Keywords for Detection
export const MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "gitgraph",
  "mindmap",
  "timeline",
  "sankey",
];

// Default Diagram Template
export const DEFAULT_DIAGRAM = `graph TD
    A[Current Diagram] --> B[AI Enhanced]
    B --> C[Updated Diagram]
    C --> D[Better Visualization]`;

// API Request Timeout (in milliseconds)
export const API_TIMEOUT = 30000; // 30 seconds

// Debug Configuration
export const DEBUG_CONFIG = {
  LOG_API_REQUESTS: true,
  LOG_DIAGRAM_DETECTION: true,
  LOG_USER_INTERACTIONS: true,
  LOG_ERROR_DETAILS: true,
};
