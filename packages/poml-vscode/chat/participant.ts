import * as vscode from 'vscode';
import { getClient } from 'poml-vscode/extension';
import { PreviewMethodName, PreviewParams, PreviewResponse } from 'poml-vscode/panel/types';
import { Message } from 'poml';
import { fileURLToPath } from 'url';

export function registerPomlChatParticipant(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    _chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult | void> => {
    const files = request.references
      .map(ref => ref.value)
      .map(v => (v instanceof vscode.Location ? v.uri : v))
      .filter((v): v is vscode.Uri => v instanceof vscode.Uri);

    const filePath = vscode.Uri.joinPath(context.extensionUri, 'gallery', 'chat.poml');
    const pomlContext = {
      prompt: request.prompt,
      files: files.map(f => f.fsPath),
    };

    const params: PreviewParams = {
      uri: filePath.toString(),
      speakerMode: true,
      displayFormat: 'rendered',
      inlineContext: pomlContext,
      contexts: [], 
      stylesheets: [],
    };
    const response: PreviewResponse = await getClient().sendRequest(PreviewMethodName, params);
    if (response.error) {
      throw new Error(`Error rendering POML: ${response.error}`);
    } else {
      console.log('Rendered POML:', response.content);
      // stream.button('View Rendered Prompt', )
    }
    const messages = response.content as Message[];
    const chatMessages = messages.map(m => {
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return m.speaker === 'human'
        ? vscode.LanguageModelChatMessage.User(text)
        : vscode.LanguageModelChatMessage.Assistant(text);
    });

    const [model] = await vscode.lm.selectChatModels();
    if (!model) {
      throw new Error('No chat model available.');
    }
    const chatResponse = await model.sendRequest(chatMessages, {}, token);
    for await (const part of chatResponse.text) {
      stream.markdown(part);
    }
    return {};
  };

  const participant = vscode.chat.createChatParticipant('poml.runner', handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media/icon/poml-icon-16.svg');
  context.subscriptions.push(participant);
}
