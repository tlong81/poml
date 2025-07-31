chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

// Handle messages from content script/sidepanel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'readFile') {
    readFileContent(request.filePath)
      .then(content => {
        sendResponse({ success: true, content: content });
      })
      .catch(error => {
        console.error('Error reading file:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

async function readFileContent(filePath) {
  try {
    // Normalize the file path
    let normalizedPath = filePath.trim();
    
    // Handle different path formats
    if (normalizedPath.startsWith('~/')) {
      // Cannot resolve ~ in browser extension context
      throw new Error('Cannot resolve ~ path in extension context');
    }
    
    // Ensure path starts with file:// protocol
    if (!normalizedPath.startsWith('file://')) {
      if (normalizedPath.startsWith('/')) {
        normalizedPath = 'file://' + normalizedPath;
      } else {
        throw new Error('Invalid file path format');
      }
    }
    
    // Attempt to fetch the file
    const response = await fetch(normalizedPath);
    
    if (!response.ok) {
      throw new Error(`File not found or access denied: ${response.status}`);
    }
    
    const content = await response.text();
    return content;
    
  } catch (error) {
    // If fetch fails, try alternative approaches or provide helpful error
    if (error.message.includes('Not allowed to load local resource')) {
      throw new Error('Browser security policy prevents reading local files. Try using a local server or file input instead.');
    }
    throw error;
  }
}
