/**
 * Diagram processing utilities for Confluence page creation
 * Ported from extension/src/api/api.ts and extension/src/utils/mermaidExporter.ts
 */
import { MermaidRenderer } from "../content/utils/mermaidRenderer.js";

/**
 * DiagramData interface equivalent for JavaScript
 * @typedef {Object} DiagramData
 * @property {string} filename - The filename for the diagram
 * @property {string} macroId - The macro ID
 * @property {string} diagramCode - The mermaid diagram code
 * @property {string} [svg] - The SVG content
 * @property {string} [png] - The PNG base64 content
 */

/**
 * Extract diagrams from Confluence storage format - EXACT copy from extension
 * @param {string} storage - The storage format content
 * @returns {DiagramData[]} Array of extracted diagrams
 */
export function getDiagramConfluenceStyles(storage) {
  let macroCounter = 1;
  const extractedDiagrams = [];

  // Find all mermaid macros in storage content
  const mermaidRegex =
    /<ac:structured-macro[^>]*ac:name="mermaid"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="code"[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/g;

  let match;
  while ((match = mermaidRegex.exec(storage)) !== null) {
    const code = (match[1] || match[2] || "").trim();

    if (code) {
      extractedDiagrams.push({
        filename: `k-tool-diagram-${macroCounter}`,
        macroId: (110 + macroCounter).toString(),
        diagramCode: code,
      });
      macroCounter++;
    }
  }

  return extractedDiagrams;
}

/**
 * Load mermaid script dynamically if not already loaded
 * @returns {Promise<void>}
 */
async function loadMermaidScript() {
  if (typeof window !== "undefined" && window.mermaid) {
    return; // Already loaded
  }

  if (!window.mermaid) {
    console.log("📦 Loading Mermaid library...");
    await MermaidRenderer.loadMermaidScript();
  }
  // Initialize mermaid if needed
  if (window.mermaid && !window.mermaid.mermaidAPI) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
    });
  }
}

/**
 * Convert diagram code to SVG and PNG using mermaid - EXACT copy from extension
 * @param {DiagramData} diagram - The diagram data
 * @returns {Promise<DiagramData>} The diagram with SVG and PNG data
 */
export async function convertDiagramToSvgPng(diagram) {
  try {
    console.log(`🎨 Converting diagram to SVG/PNG: ${diagram.filename}`);
    console.log(`🎨 Converting diagram to SVG/PNG: ${diagram.diagramCode}`);

    // Ensure mermaid is loaded
    await loadMermaidScript();

    // Use mermaid to render SVG
    const svgResult = await window.mermaid.render(
      `diagram-${diagram.macroId}`,
      diagram.diagramCode
    );

    // Handle different return types from mermaid.render
    let svgContent;
    if (typeof svgResult === "string") {
      svgContent = svgResult;
    } else if (svgResult && typeof svgResult === "object" && svgResult.svg) {
      svgContent = svgResult.svg;
    } else {
      throw new Error("Invalid SVG result from mermaid.render");
    }

    diagram.svg = svgContent;

    // Convert SVG to PNG using canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;

        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          diagram.png = canvas.toDataURL("image/png").split(",")[1]; // Remove data:image/png;base64,
        }
        resolve(true);
      };

      img.onerror = reject;
      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgContent)));
    });

    console.log(`✅ Successfully converted ${diagram.filename} to SVG/PNG`);
    return diagram;
  } catch (error) {
    console.error(`❌ Failed to convert diagram ${diagram.filename}:`, error);

    // Create fallback PNG data
    diagram.png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    return diagram;
  }
}

/**
 * Save diagram to mermaid-cloud API - EXACT copy from extension
 * @param {DiagramData} diagram - The diagram data
 * @param {string} pageId - The page ID
 * @returns {Promise<boolean>} Success status
 */
export async function saveDiagramToAPI(diagram, pageId) {
  try {
    console.log(
      `💾 Saving diagram ${diagram.filename} to API for page ${pageId}`
    );

    const payload = {
      filename: diagram.filename,
      data: diagram.diagramCode,
      svg: diagram.svg || "",
      png: diagram.png || "",
    };

    const response = await fetch(`/rest/mermaidrest/1.0/mermaid/${pageId}`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Failed to save diagram ${diagram.filename}:`,
        response.status,
        errorText
      );
      return false;
    }

    console.log(`✅ Successfully saved diagram ${diagram.filename} to API`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving diagram ${diagram.filename}:`, error);
    return false;
  }
}

/**
 * Process all extracted diagrams and save them to API sequentially - EXACT copy from extension
 * @param {string} pageId - The page ID
 * @param {DiagramData[]} extractedDiagrams - Array of diagrams to process
 * @returns {Promise<{success: number, total: number, errors: string[]}>} Processing result
 */
export async function processAndSaveDiagrams(pageId, extractedDiagrams) {
  if (extractedDiagrams.length === 0) {
    console.log("ℹ️ No diagrams to process");
    return { success: 0, total: 0, errors: [] };
  }

  console.log(
    `🔄 Processing ${extractedDiagrams.length} diagrams for page ${pageId}`
  );

  let successCount = 0;
  const errors = [];
  const totalDiagrams = extractedDiagrams.length;

  try {
    // Convert all diagrams to SVG/PNG first
    console.log("🎨 Converting diagrams to SVG/PNG...");
    const processedDiagrams = await Promise.all(
      extractedDiagrams.map((diagram) => convertDiagramToSvgPng(diagram))
    );

    // Save diagrams sequentially (one by one)
    console.log("💾 Saving diagrams sequentially...");
    for (let i = 0; i < processedDiagrams.length; i++) {
      const diagram = processedDiagrams[i];
      console.log(
        `📊 Saving diagram ${i + 1}/${processedDiagrams.length}: ${
          diagram.filename
        }`
      );

      try {
        const success = await saveDiagramToAPI(diagram, pageId);
        if (success) {
          successCount++;
          console.log(
            `✅ Diagram ${i + 1}/${processedDiagrams.length} saved successfully`
          );
        } else {
          errors.push(`Failed to save diagram: ${diagram.filename}`);
          console.error(
            `❌ Diagram ${i + 1}/${processedDiagrams.length} failed to save`
          );
        }
      } catch (error) {
        const errorMsg = `Error saving diagram ${diagram.filename}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        errors.push(errorMsg);
        console.error(
          `❌ Diagram ${i + 1}/${processedDiagrams.length} error:`,
          error
        );
      }

      // Add small delay between saves to avoid overwhelming the API
      if (i < processedDiagrams.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("❌ Error during diagram processing:", error);
    errors.push(
      `Processing error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  const result = {
    success: successCount,
    total: totalDiagrams,
    errors,
  };

  console.log(
    `📊 Diagram processing complete: ${successCount}/${totalDiagrams} successful`
  );
  if (errors.length > 0) {
    console.warn("⚠️ Diagram processing errors:", errors);
  }

  return result;
}
