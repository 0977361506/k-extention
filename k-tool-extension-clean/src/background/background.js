// K-Tool Extension Background Script
console.log('🚀 K-Tool Extension Background Script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 K-Tool Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      extensionSettings: {
        apiKey: '',
        urlTemplate: '',
        customPrompt: '',
        documentUrl: '',
        databaseUrl: '',
        instructionUrl: '',
        isEnabled: true,
        selectedModel: 'sonar-pro'
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);

  switch (request.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response

    case 'saveSettings':
      handleSaveSettings(request.settings, sendResponse);
      return true;

    case 'checkPermissions':
      handleCheckPermissions(sendResponse);
      return true;

    default:
      console.warn('❓ Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Get settings from storage
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['extensionSettings']);
    sendResponse({
      success: true,
      settings: result.extensionSettings || {}
    });
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Save settings to storage
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set({ extensionSettings: settings });
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Check if extension has required permissions
async function handleCheckPermissions(sendResponse) {
  try {
    const permissions = await chrome.permissions.getAll();
    sendResponse({
      success: true,
      permissions: permissions
    });
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a Confluence page
    const isConfluencePage = tab.url.includes('confluence') ||
                            tab.url.includes('atlassian') ||
                            tab.url.includes('localhost:8090');

    if (isConfluencePage) {
      console.log('🔍 Confluence page detected:', tab.url);

      // Inject content script if not already injected
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: checkKToolInjection
      }).catch(error => {
        console.log('Content script already injected or error:', error.message);
      });
    }
  }
});

// Function to check if K-Tool is already injected
function checkKToolInjection() {
  if (!document.getElementById('ktool-root')) {
    console.log('🚀 K-Tool not detected, will be injected by content script');
  } else {
    console.log('✅ K-Tool already active on this page');
  }
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.extensionSettings) {
    console.log('⚙️ Settings changed:', changes.extensionSettings);

    // Notify all content scripts about settings change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('confluence') || tab.url.includes('atlassian') || tab.url.includes('localhost:8090'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsChanged',
            settings: changes.extensionSettings.newValue
          }).catch(error => {
            // Ignore errors for tabs without content script
          });
        }
      });
    });
  }
});

// Keep service worker alive
let keepAliveInterval;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This is just to keep the service worker active
    });
  }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep alive when extension starts
keepAlive();

// Clean up on suspend
chrome.runtime.onSuspend.addListener(() => {
  console.log('💤 Background script suspending');
  stopKeepAlive();
});

console.log('✅ K-Tool Extension Background Script ready');
