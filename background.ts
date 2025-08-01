/// <reference types="chrome-types" />

interface MessageRequest {
  action: string;
  filePath?: string;
  tabId?: number;
}

interface MessageResponse {
  success: boolean;
  content?: string;
  error?: string;
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

// Handle messages from content script/sidepanel
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    if (request.action === "readFile") {
      if (!request.filePath) {
        sendResponse({ success: false, error: "No file path provided" });
        return true;
      }

      readFileContent(request.filePath)
        .then((content) => {
          sendResponse({ success: true, content: content });
        })
        .catch((error) => {
          console.error("Error reading file:", error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we will send a response asynchronously
      return true;
    } else if (request.action === "extractPageContent") {
      if (!request.tabId) {
        sendResponse({ success: false, error: "No tab ID provided" });
        return true;
      }

      extractPageContent(request.tabId)
        .then((content) => {
          sendResponse({ success: true, content: content });
        })
        .catch((error) => {
          console.error("Error extracting page content:", error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we will send a response asynchronously
      return true;
    }

    return false;
  }
);

async function readFileContent(filePath: string): Promise<string> {
  try {
    // Normalize the file path
    let normalizedPath = filePath.trim();

    // Handle different path formats
    if (normalizedPath.startsWith("~/")) {
      // Cannot resolve ~ in browser extension context
      throw new Error("Cannot resolve ~ path in extension context");
    }

    // Ensure path starts with file:// protocol
    if (!normalizedPath.startsWith("file://")) {
      if (normalizedPath.startsWith("/")) {
        normalizedPath = "file://" + normalizedPath;
      } else {
        throw new Error("Invalid file path format");
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
    if (
      error instanceof Error &&
      error.message.includes("Not allowed to load local resource")
    ) {
      throw new Error(
        "Browser security policy prevents reading local files. Try using a local server or file input instead."
      );
    }
    throw error;
  }
}

async function extractPageContent(tabId: number): Promise<string> {
  try {
    if (!chrome.scripting) {
      throw new Error("Chrome scripting API not available");
    }

    console.log(`[DEBUG] Starting content extraction for tab ${tabId}`);

    // Inject the content extractor script that includes Readability
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["contentExtractor.js"],
    });

    console.log(`[DEBUG] Content extractor script injected`);

    // Now execute the extraction function
    const extractionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // The content-extractor.js should have made extractContent available globally
        if (typeof (window as any).extractContent === "function") {
          return (window as any).extractContent();
        } else if (
          typeof (window as any).ContentExtractor !== "undefined" &&
          (window as any).ContentExtractor.extractContent
        ) {
          return (window as any).ContentExtractor.extractContent();
        } else {
          console.error("[DEBUG] extractContent function not found");
          // Fallback
          return {
            title: document.title || "Untitled",
            content: document.body
              ? document.body.innerText || document.body.textContent || ""
              : "",
            excerpt: "",
            debug:
              "extractContent function not available, used emergency fallback",
          };
        }
      },
    });

    console.log("[DEBUG] Script execution completed");
    console.log("[DEBUG] Extraction results:", extractionResults);

    if (
      extractionResults &&
      extractionResults[0] &&
      extractionResults[0].result
    ) {
      const article = extractionResults[0].result;
      console.log("[DEBUG] Article debug info:", article.debug);

      if (!article.content.trim()) {
        console.log("[DEBUG] No content found in article result");
        throw new Error(
          `No readable content found on this page. Debug: ${article.debug}`
        );
      }

      let extractedText = "";
      if (article.title) {
        extractedText += `# ${article.title}\n\n`;
      }
      extractedText += article.content;

      console.log(
        "[DEBUG] Successfully extracted",
        extractedText.length,
        "characters"
      );
      return extractedText;
    } else {
      console.log("[DEBUG] No results returned from script execution");
      throw new Error(
        "Could not extract readable content from page - no results returned"
      );
    }
  } catch (error) {
    console.error("[DEBUG] Error in background extractPageContent:", error);
    throw error;
  }
}

async function sendToChatGPT(
  tabId: number,
  prompt: string,
  files: File[] = []
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: async () => {
      // 1.  Focus the textarea and inject the text
      const ta =
        document.querySelector('textarea[name="prompt-textarea"]') ||
        document.querySelector("form textarea");

      if (ta) {
        (ta as any).focus();
        (ta as any).value = prompt;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        console.error("[DEBUG] Textarea not found for prompt injection");
        throw new Error("Textarea not found for prompt injection");
      }

      // 2.  Attach files (works for images, PDFs, anything ChatGPT UI accepts)
      if (files.length) {
        // ChatGPT uses a hidden <input type="file"> behind the 📎 button.
        const hiddenInput = document.querySelector(
          'input[type="file"][multiple]'
        );
        if (hiddenInput) {
          // Trick: create a DataTransfer so the input thinks the user selected files
          const dt = new DataTransfer();
          files.forEach((f) => dt.items.add(f));
          (hiddenInput as any).files = dt.files;

          // Trigger the "change" event so React sees it
          hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          console.error("[DEBUG] Hidden file input not found for file attachment");
          throw new Error("Hidden file input not found for file attachment");
        }
      }
    },
  });
}
