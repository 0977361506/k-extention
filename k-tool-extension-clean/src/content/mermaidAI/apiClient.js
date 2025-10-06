/**
 * API Client for TextEditAI
 * Handles communication with AI services
 */

import { TextProcessors } from './textProcessors.js';

export class APIClient {
  constructor() {
    this.baseUrl = 'https://api.example.com'; // Replace with actual API URL
    this.apiKey = null;
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['apiKey', 'selectedModel', 'urlTemplate']);
      this.apiKey = result.apiKey;
      this.model = result.selectedModel || 'gpt-3.5-turbo';
      this.baseUrl = result.urlTemplate || this.baseUrl;
    } catch (error) {
      console.warn('Failed to load API config:', error);
    }
  }

  /**
   * Call the text editing API
   */
  async callEditAPI(originalText, prompt) {
    console.log("🤖 Calling Text Edit API...", { originalText, prompt });

    try {
      // For now, use mock processing until real API is configured
      if (!this.apiKey) {
        console.log("📝 Using mock processing (no API key configured)");
        return this.mockProcessText(originalText, prompt);
      }

      // Real API call
      const response = await fetch(`${this.baseUrl}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          text: originalText,
          instruction: prompt,
          model: this.model
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.editedText || data.result || originalText;

    } catch (error) {
      console.error("❌ API call failed:", error);
      
      // Fallback to mock processing
      console.log("📝 Falling back to mock processing");
      return this.mockProcessText(originalText, prompt);
    }
  }

  /**
   * Mock text processing for development/fallback
   */
  mockProcessText(originalText, prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect intent from prompt
    if (lowerPrompt.includes('formal') || lowerPrompt.includes('professional')) {
      return TextProcessors.makeFormal(originalText);
    }
    
    if (lowerPrompt.includes('grammar') || lowerPrompt.includes('spelling')) {
      return TextProcessors.fixGrammar(originalText);
    }
    
    if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
      return TextProcessors.summarizeText(originalText);
    }
    
    if (lowerPrompt.includes('expand') || lowerPrompt.includes('detail')) {
      return TextProcessors.expandText(originalText);
    }
    
    if (lowerPrompt.includes('bullet') || lowerPrompt.includes('list')) {
      return TextProcessors.convertToBullets(originalText);
    }
    
    if (lowerPrompt.includes('translate') || lowerPrompt.includes('vietnamese')) {
      return TextProcessors.translateToVietnamese(originalText);
    }
    
    // Generic improvement
    return this.genericImprovement(originalText, prompt);
  }

  /**
   * Generic text improvement
   */
  genericImprovement(text, prompt) {
    // Apply basic improvements
    let improved = TextProcessors.fixGrammar(text);
    
    // Add context about the improvement
    const improvements = [];
    
    if (text !== improved) {
      improvements.push("grammar corrected");
    }
    
    if (improvements.length > 0) {
      return `${improved}\n\n[Improvements applied: ${improvements.join(', ')}]`;
    }
    
    return `${improved}\n\n[Processed based on: "${prompt}"]`;
  }

  /**
   * Get quick action prompts
   */
  static getQuickActionPrompts() {
    return {
      formal: "Make this text more formal and professional",
      grammar: "Fix grammar and spelling errors",
      translate: "Translate this text to Vietnamese",
      summarize: "Summarize this text in a concise way",
      expand: "Expand this text with more details",
      bullets: "Convert this text to bullet points"
    };
  }

  /**
   * Validate API configuration
   */
  async validateConfig() {
    if (!this.apiKey) {
      return {
        valid: false,
        message: "API key not configured. Using mock processing."
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        valid: response.ok,
        message: response.ok ? "API configuration valid" : "API configuration invalid"
      };
    } catch (error) {
      return {
        valid: false,
        message: `API validation failed: ${error.message}`
      };
    }
  }
}
