/**
 * Shared drag utility for making popups draggable
 * Used by both mermaidAIChat.js and textEditAI.js
 */

export class DragUtils {
  /**
   * Make an element draggable by its drag handle
   * @param {HTMLElement} element - The element to make draggable
   * @param {HTMLElement} dragHandle - The handle to drag by
   */
  static makeDraggable(element, dragHandle) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;

    console.log("🎯 DRAG: Setting up draggable element...");

    // Style the drag handle
    dragHandle.style.cursor = "move";
    dragHandle.style.userSelect = "none";

    const startDrag = (e) => {
      // Don't drag if clicking on close button or other interactive elements
      if (e.target.classList.contains("close") || 
          e.target.classList.contains("mermaid-ai-chat-close") ||
          e.target.classList.contains("text-edit-ai-close")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      isDragging = true;

      // Get mouse position
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      // Get element current position (from style, not getBoundingClientRect)
      elementStartX = parseInt(element.style.left) || 0;
      elementStartY = parseInt(element.style.top) || 0;

      console.log("🎯 DRAG: Started", {
        mouseX: dragStartX,
        mouseY: dragStartY,
        elementX: elementStartX,
        elementY: elementStartY,
      });

      // Add global event listeners
      document.addEventListener("mousemove", onDrag, true);
      document.addEventListener("mouseup", stopDrag, true);

      // Prevent text selection during drag
      document.body.style.userSelect = "none";
    };

    const onDrag = (e) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate mouse movement
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      // Calculate new position
      const newX = elementStartX + deltaX;
      const newY = elementStartY + deltaY;

      // Keep element within viewport bounds
      const elementRect = element.getBoundingClientRect();
      const maxX = window.innerWidth - elementRect.width;
      const maxY = window.innerHeight - elementRect.height;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      // Update element position
      element.style.left = boundedX + "px";
      element.style.top = boundedY + "px";
    };

    const stopDrag = (e) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      isDragging = false;

      console.log("🎯 DRAG: Stopped");

      // Remove global event listeners
      document.removeEventListener("mousemove", onDrag, true);
      document.removeEventListener("mouseup", stopDrag, true);

      // Restore text selection
      document.body.style.userSelect = "";
    };

    // Bind drag events
    dragHandle.addEventListener("mousedown", startDrag);

    console.log("✅ DRAG: Setup completed");
  }
}
