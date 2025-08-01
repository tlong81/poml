# On-device AI with Gemini Nano

This sample demonstrates how to use the Gemini Nano prompt API in Chrome Extensions. To learn more about the API, head over to [Built-in AI on developer.chrome.com](https://developer.chrome.com/docs/extensions/ai/prompt-api).

## Overview

The extension provides a chat interface using the Prompt API with Chrome's built-in Gemini Nano model. It also includes functionality to fetch content from Google Docs and Microsoft Word Online documents.

## Features

- **AI Chat Interface**: Interact with Gemini Nano for on-device AI assistance
- **Google Docs Integration**: Fetch content directly from Google Docs documents
- **Microsoft Word Online Integration**: Extract content from Word documents in Office 365/OneDrive
- **Page Content Extraction**: Extract readable content from any web page
- **Drag & Drop Support**: Drag text content into the prompt area

## Running this extension

1. Clone this repository.
1. Run `npm install` in the project directory.
1. Run `npm run build` in the project directory to build the extension.
1. Load the newly created `dist` directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).
1. Click the extension icon.
1. Interact with the Prompt API in the sidebar.

## Microsoft Word Integration Setup

To use the Microsoft Word Online integration, you need to set up Microsoft Graph API access:

1. **Register your application in Azure AD:**
   - Go to the [Azure Portal](https://portal.azure.com/)
   - Navigate to "Azure Active Directory" > "App registrations"
   - Click "New registration"
   - Enter a name for your application
   - For "Redirect URI", select "Single-page application (SPA)" and enter your extension's redirect URI (usually `chrome-extension://[extension-id]/`)

2. **Configure API permissions:**
   - In your app registration, go to "API permissions"
   - Click "Add a permission" > "Microsoft Graph" > "Delegated permissions"
   - Add the following permissions:
     - `Files.Read` - to read Word documents
     - `Files.Read.All` - to read shared documents (optional)

3. **Update the extension:**
   - In `sidepanel/index.ts`, replace `'your-microsoft-app-id'` with your actual Application (client) ID from Azure
   - Update the manifest.json with any additional permissions if needed

4. **Grant admin consent** (if required by your organization)

### Note on Microsoft Graph API

The Microsoft Word integration uses two approaches:

1. **Content Script Extraction** (Primary): Attempts to extract content directly from the Word Online interface
2. **Microsoft Graph API** (Fallback): Uses the Graph API to download document content

The content script approach works without additional setup, while the Graph API approach requires the Azure AD configuration above.
