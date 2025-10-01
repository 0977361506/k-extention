// DOM Manipulation Helpers
// Utility functions for DOM operations and event handling

export class DOMHelpers {
  /**
   * Safely query selector with error handling
   * @param {HTMLElement} container - Container element
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null} Found element or null
   */
  static querySelector(container, selector) {
    try {
      return container.querySelector(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * Safely query all selectors with error handling
   * @param {HTMLElement} container - Container element
   * @param {string} selector - CSS selector
   * @returns {NodeList} Found elements
   */
  static querySelectorAll(container, selector) {
    try {
      return container.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector "${selector}":`, error);
      return [];
    }
  }

  /**
   * Add event listener with error handling
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {object} options - Event options
   */
  static addEventListener(element, event, handler, options = {}) {
    if (!element) {
      console.warn(`Cannot add event listener: element is null`);
      return;
    }

    try {
      element.addEventListener(event, handler, options);
    } catch (error) {
      console.error(`Error adding event listener for "${event}":`, error);
    }
  }

  /**
   * Remove event listener with error handling
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  static removeEventListener(element, event, handler) {
    if (!element) {
      console.warn(`Cannot remove event listener: element is null`);
      return;
    }

    try {
      element.removeEventListener(event, handler);
    } catch (error) {
      console.error(`Error removing event listener for "${event}":`, error);
    }
  }

  /**
   * Toggle class on element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name to toggle
   * @param {boolean} force - Force add/remove
   */
  static toggleClass(element, className, force = undefined) {
    if (!element) {
      console.warn(`Cannot toggle class: element is null`);
      return;
    }

    try {
      if (force !== undefined) {
        element.classList.toggle(className, force);
      } else {
        element.classList.toggle(className);
      }
    } catch (error) {
      console.error(`Error toggling class "${className}":`, error);
    }
  }

  /**
   * Add class to element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name to add
   */
  static addClass(element, className) {
    if (!element) {
      console.warn(`Cannot add class: element is null`);
      return;
    }

    try {
      element.classList.add(className);
    } catch (error) {
      console.error(`Error adding class "${className}":`, error);
    }
  }

  /**
   * Remove class from element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name to remove
   */
  static removeClass(element, className) {
    if (!element) {
      console.warn(`Cannot remove class: element is null`);
      return;
    }

    try {
      element.classList.remove(className);
    } catch (error) {
      console.error(`Error removing class "${className}":`, error);
    }
  }

  /**
   * Set element content safely
   * @param {HTMLElement} element - Target element
   * @param {string} content - Content to set
   * @param {boolean} isHTML - Whether content is HTML (default: false)
   */
  static setContent(element, content, isHTML = false) {
    if (!element) {
      console.warn(`Cannot set content: element is null`);
      return;
    }

    try {
      // Handle form elements specially
      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
      ) {
        element.value = content || "";
        return;
      }

      if (isHTML) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    } catch (error) {
      console.error(`Error setting content:`, error);
    }
  }

  /**
   * Get element content safely
   * @param {HTMLElement} element - Target element
   * @param {boolean} isHTML - Whether to get HTML content (default: false)
   * @returns {string} Element content
   */
  static getContent(element, isHTML = false) {
    if (!element) {
      console.warn(`Cannot get content: element is null`);
      return "";
    }

    try {
      // Handle form elements specially
      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
      ) {
        return element.value || "";
      }

      return isHTML ? element.innerHTML : element.textContent;
    } catch (error) {
      console.error(`Error getting content:`, error);
      return "";
    }
  }

  /**
   * Create element with attributes and content
   * @param {string} tagName - HTML tag name
   * @param {object} attributes - Element attributes
   * @param {string} content - Element content
   * @param {boolean} isHTML - Whether content is HTML
   * @returns {HTMLElement} Created element
   */
  static createElement(tagName, attributes = {}, content = "", isHTML = false) {
    try {
      const element = document.createElement(tagName);

      // Set attributes
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value;
        } else if (key === "style" && typeof value === "object") {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      });

      // Set content
      if (content) {
        this.setContent(element, content, isHTML);
      }

      return element;
    } catch (error) {
      console.error(`Error creating element "${tagName}":`, error);
      return null;
    }
  }

  /**
   * Remove element safely
   * @param {HTMLElement} element - Element to remove
   */
  static removeElement(element) {
    if (!element) {
      console.warn(`Cannot remove element: element is null`);
      return;
    }

    try {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      } else {
        element.remove();
      }
    } catch (error) {
      console.error(`Error removing element:`, error);
    }
  }

  /**
   * Check if element exists in DOM
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element exists in DOM
   */
  static isInDOM(element) {
    if (!element) return false;
    return document.body.contains(element);
  }

  /**
   * Scroll element into view smoothly
   * @param {HTMLElement} element - Element to scroll to
   * @param {object} options - Scroll options
   */
  static scrollIntoView(
    element,
    options = { behavior: "smooth", block: "center" }
  ) {
    if (!element) {
      console.warn(`Cannot scroll: element is null`);
      return;
    }

    try {
      element.scrollIntoView(options);
    } catch (error) {
      console.error(`Error scrolling element into view:`, error);
    }
  }

  /**
   * Get element dimensions
   * @param {HTMLElement} element - Target element
   * @returns {object} Element dimensions
   */
  static getDimensions(element) {
    if (!element) {
      console.warn(`Cannot get dimensions: element is null`);
      return { width: 0, height: 0, top: 0, left: 0 };
    }

    try {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      };
    } catch (error) {
      console.error(`Error getting element dimensions:`, error);
      return { width: 0, height: 0, top: 0, left: 0 };
    }
  }

  /**
   * Deep clone element
   * @param {HTMLElement} element - Element to clone
   * @param {boolean} deep - Whether to deep clone (default: true)
   * @returns {HTMLElement} Cloned element
   */
  static cloneElement(element, deep = true) {
    if (!element) {
      console.warn(`Cannot clone element: element is null`);
      return null;
    }

    try {
      return element.cloneNode(deep);
    } catch (error) {
      console.error(`Error cloning element:`, error);
      return null;
    }
  }
}
