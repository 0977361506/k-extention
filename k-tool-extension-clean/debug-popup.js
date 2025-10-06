// Debug script for Text Edit AI popup
// Run this in browser console to debug popup issues

console.log("🔧 DEBUG: Starting popup debug script...");

// Check if TextEditAI is available
if (window.ktoolContent && window.ktoolContent.textEditAI) {
  const textEditAI = window.ktoolContent.textEditAI;
  console.log("✅ TextEditAI found:", textEditAI);
  
  // Add debug methods to global scope
  window.debugPopup = () => textEditAI.debugPopupState();
  window.forceClosePopup = () => textEditAI.forceClosePopup();
  window.showPopup = () => textEditAI.showEditPopup();
  window.hidePopup = () => textEditAI.hideEditPopup();
  
  console.log("🔧 DEBUG: Available commands:");
  console.log("  debugPopup() - Check popup state");
  console.log("  forceClosePopup() - Force close popup");
  console.log("  showPopup() - Show popup");
  console.log("  hidePopup() - Hide popup");
  
  // Initial state check
  console.log("🔍 Initial popup state:");
  textEditAI.debugPopupState();
  
} else {
  console.error("❌ TextEditAI not found! Make sure extension is loaded.");
}

// Check for existing popup elements
const existingPopup = document.getElementById("text-edit-ai-popup");
const existingRoot = document.getElementById("text-edit-ai-root");

console.log("🔍 DOM Check:", {
  existingPopup: !!existingPopup,
  existingRoot: !!existingRoot,
  popupDisplay: existingPopup ? existingPopup.style.display : 'N/A',
  rootDisplay: existingRoot ? existingRoot.style.display : 'N/A'
});

// Add click listener to test
document.addEventListener('click', (e) => {
  console.log("🖱️ GLOBAL CLICK:", {
    target: e.target.tagName + (e.target.className ? '.' + e.target.className : ''),
    isPopupOpen: window.ktoolContent?.textEditAI?.isPopupOpen || false
  });
});

console.log("✅ DEBUG: Script loaded successfully!");
