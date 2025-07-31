/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const inputPrompt = document.body.querySelector('#input-prompt');
const buttonPrompt = document.body.querySelector('#button-prompt');
const buttonReset = document.body.querySelector('#button-reset');
const elementResponse = document.body.querySelector('#response');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const sliderTemperature = document.body.querySelector('#temperature');
const sliderTopK = document.body.querySelector('#top-k');
const labelTemperature = document.body.querySelector('#label-temperature');
const labelTopK = document.body.querySelector('#label-top-k');

let session;

async function runPrompt(prompt, params) {
  try {
    if (!session) {
      session = await LanguageModel.create(params);
    }
    return session.prompt(prompt);
  } catch (e) {
    console.log('Prompt failed');
    console.error(e);
    console.log('Prompt:', prompt);
    // Reset session
    reset();
    throw e;
  }
}

async function reset() {
  if (session) {
    session.destroy();
  }
  session = null;
}

async function initDefaults() {
  const defaults = await LanguageModel.params();
  console.log('Model default:', defaults);
  if (!('LanguageModel' in self)) {
    showResponse('Model not available');
    return;
  }
  sliderTemperature.value = defaults.defaultTemperature;
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
  if (defaults.defaultTopK > 3) {
    // limit default topK to 3
    sliderTopK.value = 3;
    labelTopK.textContent = 3;
  } else {
    sliderTopK.value = defaults.defaultTopK;
    labelTopK.textContent = defaults.defaultTopK;
  }
  sliderTopK.max = defaults.maxTopK;
  labelTemperature.textContent = defaults.defaultTemperature;
}

initDefaults();

buttonReset.addEventListener('click', () => {
  hide(elementLoading);
  hide(elementError);
  hide(elementResponse);
  reset();
  buttonReset.setAttribute('disabled', '');
});

sliderTemperature.addEventListener('input', (event) => {
  labelTemperature.textContent = event.target.value;
  reset();
});

sliderTopK.addEventListener('input', (event) => {
  labelTopK.textContent = event.target.value;
  reset();
});

inputPrompt.addEventListener('input', () => {
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

// Add drag and drop support for text
let dragPreviewElement = null;

// Create drag preview bubble when dragging starts outside the textarea
document.addEventListener('dragstart', (e) => {
  const selectedText = window.getSelection().toString();
  if (selectedText && e.target !== inputPrompt) {
    // Create preview element
    dragPreviewElement = document.createElement('div');
    dragPreviewElement.className = 'drag-preview';
    dragPreviewElement.textContent = selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText;
    document.body.appendChild(dragPreviewElement);
    
    // Initially hide it
    dragPreviewElement.style.display = 'none';
  }
});

// Update drag preview position during drag
document.addEventListener('dragover', (e) => {
  if (dragPreviewElement) {
    dragPreviewElement.style.display = 'block';
    dragPreviewElement.style.left = e.clientX + 'px';
    dragPreviewElement.style.top = e.clientY + 'px';
  }
});

// Clean up drag preview when drag ends
document.addEventListener('dragend', () => {
  if (dragPreviewElement) {
    document.body.removeChild(dragPreviewElement);
    dragPreviewElement = null;
  }
});

inputPrompt.addEventListener('dragover', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '#f0f8ff';
});

inputPrompt.addEventListener('dragleave', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '';
});

inputPrompt.addEventListener('drop', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '';
  
  // Clean up drag preview
  if (dragPreviewElement) {
    document.body.removeChild(dragPreviewElement);
    dragPreviewElement = null;
  }
  
  const draggedText = e.dataTransfer.getData('text/plain');
  if (draggedText) {
    // Check if the dragged text looks like a file path
    const isPath = /^[\/~][\w\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim()) || 
                   /^[a-zA-Z]:[\\\/][\w\\\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim());
    
    if (isPath) {
      // Helper function to insert content
      const insertContent = (content) => {
        const currentValue = inputPrompt.value;
        const cursorPosition = inputPrompt.selectionStart;
        
        const newValue = currentValue.slice(0, cursorPosition) + content + currentValue.slice(cursorPosition);
        inputPrompt.value = newValue;
        
        // Set cursor position after the inserted content
        inputPrompt.setSelectionRange(cursorPosition + content.length, cursorPosition + content.length);
        
        // Trigger input event to enable the run button if needed
        inputPrompt.dispatchEvent(new Event('input'));
        
        // Focus the textarea
        inputPrompt.focus();
      };
      
      // Try to read the file content using chrome extension APIs
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          // Send message to background script to read file
          chrome.runtime.sendMessage({
            action: 'readFile',
            filePath: draggedText.trim()
          }, (response) => {
            // Check for chrome.runtime.lastError
            if (chrome.runtime.lastError) {
              // No background script or connection failed, fallback to path insertion
              const contentToInsert = `File path detected: ${draggedText}\n(Note: No background script available to read file)\n`;
              insertContent(contentToInsert);
              return;
            }
            
            if (response && response.success && response.content) {
              // Successfully read file content
              insertContent(response.content);
            } else {
              // File reading failed, show error message with path
              const errorMsg = response && response.error ? response.error : 'Unknown error reading file';
              const contentToInsert = `File path detected: ${draggedText}\n(Error: ${errorMsg})\n`;
              insertContent(contentToInsert);
            }
          });
        } catch (error) {
          // Chrome extension API not available, use fallback
          const contentToInsert = `File path detected: ${draggedText}\n(Note: Chrome extension API error)\n`;
          insertContent(contentToInsert);
        }
      } else {
        // Fallback: just insert the path as text with a note
        const contentToInsert = `File path detected: ${draggedText}\n(Note: Cannot read file content in this environment)\n`;
        insertContent(contentToInsert);
      }
    } else {
      // Not a path, insert as regular text
      const currentValue = inputPrompt.value;
      const cursorPosition = inputPrompt.selectionStart;
      
      const newValue = currentValue.slice(0, cursorPosition) + draggedText + currentValue.slice(cursorPosition);
      inputPrompt.value = newValue;
      
      // Set cursor position after the inserted text
      inputPrompt.setSelectionRange(cursorPosition + draggedText.length, cursorPosition + draggedText.length);
      
      // Trigger input event to enable the run button if needed
      inputPrompt.dispatchEvent(new Event('input'));
      
      // Focus the textarea
      inputPrompt.focus();
    }
  }
});

buttonPrompt.addEventListener('click', async () => {
  const prompt = inputPrompt.value.trim();
  showLoading();
  try {
    const params = {
      initialPrompts: [
        { role: 'system', content: 'You are a helpful and friendly assistant.' }
      ],
      temperature: sliderTemperature.value,
      topK: sliderTopK.value
    };
    const response = await runPrompt(prompt, params);
    showResponse(response);
  } catch (e) {
    showError(e);
  }
});

function showLoading() {
  buttonReset.removeAttribute('disabled');
  hide(elementResponse);
  hide(elementError);
  show(elementLoading);
}

function showResponse(response) {
  hide(elementLoading);
  show(elementResponse);
  elementResponse.innerHTML = DOMPurify.sanitize(marked.parse(response));
}

function showError(error) {
  show(elementError);
  hide(elementResponse);
  hide(elementLoading);
  elementError.textContent = error;
}

function show(element) {
  element.removeAttribute('hidden');
}

function hide(element) {
  element.setAttribute('hidden', '');
}
