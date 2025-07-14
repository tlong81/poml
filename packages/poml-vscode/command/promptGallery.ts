import * as vscode from 'vscode';
import { Command } from '../util/commandManager';
import { PromptGalleryProvider, PromptEntry } from '../gallery/promptGallery';
import * as path from 'path';

export class AddPromptCommand implements Command {
  public readonly id = 'poml.gallery.addPrompt';
  public constructor(private readonly provider: PromptGalleryProvider) {}

  public async execute() {
    const uri = await vscode.window.showOpenDialog({
      openLabel: 'Select POML',
      filters: { POML: ['poml'], 'All Files': ['*'] }
    });
    if (!uri || !uri[0]) {
      return;
    }
    const name = await vscode.window.showInputBox({
      prompt: 'Name for the prompt',
      value: path.basename(uri[0].fsPath, '.poml')
    });
    if (!name) {
      return;
    }
    this.provider.addPrompt({ name, file: uri[0].fsPath });
  }
}

export class DeletePromptCommand implements Command {
  public readonly id = 'poml.gallery.deletePrompt';
  public constructor(private readonly provider: PromptGalleryProvider) {}

  public execute(item: PromptEntry) {
    if (item) {
      this.provider.removePrompt(item);
    }
  }
}

export class EditPromptCommand implements Command {
  public readonly id = 'poml.gallery.editPrompt';
  public constructor(private readonly provider: PromptGalleryProvider) {}

  public async execute(item: PromptEntry) {
    if (!item) {
      return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Prompt name', value: item.name });
    if (!name) {
      return;
    }
    const uri = await vscode.window.showOpenDialog({
      openLabel: 'Select POML',
      defaultUri: vscode.Uri.file(item.file),
      filters: { POML: ['poml'], 'All Files': ['*'] }
    });
    if (!uri || !uri[0]) {
      return;
    }
    this.provider.updatePrompt(item, { name, file: uri[0].fsPath });
  }
}
