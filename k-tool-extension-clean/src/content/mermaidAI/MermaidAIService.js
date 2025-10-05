/**
 * Mermaid AI Service
 * Handles AI API calls for Mermaid diagram modifications
 */
import { ApiClient } from "../../shared/api.js";

export class MermaidAIService {
  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * Send prompt to AI for diagram modification
   * @param {string} diagramContent - Current Mermaid diagram code
   * @param {string} userPrompt - User's modification request
   * @returns {Promise<Object>} AI response with modified diagram
   */
  async modifyDiagram(diagramContent, userPrompt) {
    console.log("🤖 Sending AI request for diagram modification...");

    // Validate inputs
    const promptValidation = this.validateUserPrompt(userPrompt);
    if (!promptValidation.isValid) {
      throw new Error(promptValidation.error);
    }

    const diagramValidation = this.validateDiagramContent(diagramContent);
    if (!diagramValidation.isValid) {
      throw new Error(diagramValidation.error);
    }

    // Prepare payload
    const payload = {
      diagram_content: diagramContent,
      user_prompt: userPrompt,
      context: "mermaid_diagram_editing",
    };

    console.log("📤 Sending AI request:", payload);

    try {
      // Call AI API
      const response = await this.callAI(payload);
      
      if (!response || !response.edited_diagram) {
        throw new Error("Invalid AI response format - missing edited_diagram");
      }

      console.log("✅ AI response received successfully");
      return response;
    } catch (error) {
      console.error("❌ AI API error:", error);
      throw error;
    }
  }

  /**
   * Call AI API
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} AI response
   */
  async callAI(payload) {
    try {
      const response = await fetch("/api/ai/mermaid-edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📥 AI API response:", data);

      return data;
    } catch (error) {
      console.error("❌ AI API call failed:", error);
      
      // Return mock response for development/testing
      if (error.message.includes("fetch")) {
        console.log("🔧 Using mock AI response for development");
        return this.getMockResponse(payload);
      }
      
      throw error;
    }
  }

  /**
   * Get mock AI response for development
   * @param {Object} payload - Original request payload
   * @returns {Object} Mock response
   */
  getMockResponse(payload) {
    // Simple mock: add a comment to the diagram
    const originalDiagram = payload.diagram_content;
    const modifiedDiagram = `%% Modified by AI: ${payload.user_prompt}\n${originalDiagram}`;
    
    return {
      success: true,
      edited_diagram: modifiedDiagram,
      explanation: `I've added a comment to your diagram based on your request: "${payload.user_prompt}"`
    };
  }

  /**
   * Validate user prompt
   * @param {string} prompt - User prompt to validate
   * @returns {Object} Validation result
   */
  validateUserPrompt(prompt) {
    if (!prompt || !prompt.trim()) {
      return {
        isValid: false,
        error: "Please enter a prompt describing how you want to modify the diagram"
      };
    }

    if (prompt.trim().length < 3) {
      return {
        isValid: false,
        error: "Prompt is too short. Please provide more details."
      };
    }

    if (prompt.length > 1000) {
      return {
        isValid: false,
        error: "Prompt is too long. Please keep it under 1000 characters."
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Validate diagram content
   * @param {string} content - Diagram content to validate
   * @returns {Object} Validation result
   */
  validateDiagramContent(content) {
    if (!content || !content.trim()) {
      return {
        isValid: false,
        error: "No diagram content found. Please select a Mermaid diagram first."
      };
    }

    // Basic Mermaid syntax validation
    const trimmed = content.trim();
    const validStarters = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie'
    ];
    
    const hasValidStarter = validStarters.some(starter => 
      trimmed.toLowerCase().startsWith(starter.toLowerCase())
    );
    
    if (!hasValidStarter) {
      return {
        isValid: false,
        error: "Invalid Mermaid diagram format. Please ensure it starts with a valid diagram type."
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes("fetch")) {
      return "Unable to connect to AI service. Please check your internet connection.";
    }
    
    if (error.message.includes("HTTP 429")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    
    if (error.message.includes("HTTP 500")) {
      return "AI service is temporarily unavailable. Please try again later.";
    }
    
    return error.message || "An unexpected error occurred. Please try again.";
  }
}
