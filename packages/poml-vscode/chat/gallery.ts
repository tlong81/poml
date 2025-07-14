import * as vscode from 'vscode';

export interface PromptEntry {
  name: string;
  file: string;
}

const STORAGE_KEY = 'poml.promptGallery';

export class PromptGalleryProvider implements vscode.TreeDataProvider<PromptEntry> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  private get entries(): PromptEntry[] {
    return this.context.globalState.get<PromptEntry[]>(STORAGE_KEY, []);
  }

  private update(entries: PromptEntry[]) {
    void this.context.globalState.update(STORAGE_KEY, entries);
    this._onDidChangeTreeData.fire();
  }

  getChildren(): PromptEntry[] {
    return this.entries;
  }

  getTreeItem(element: PromptEntry): vscode.TreeItem {
    const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
    item.resourceUri = vscode.Uri.file(element.file);
    item.command = { command: 'vscode.open', title: 'Open Prompt', arguments: [vscode.Uri.file(element.file)] };
    item.contextValue = 'pomlPrompt';
    return item;
  }

  addPrompt(entry: PromptEntry) {
    const list = [...this.entries, entry];
    this.update(list);
  }

  removePrompt(entry: PromptEntry) {
    this.update(this.entries.filter(e => e !== entry));
  }

  updatePrompt(entry: PromptEntry, newEntry: PromptEntry) {
    const list = this.entries.map(e => (e === entry ? newEntry : e));
    this.update(list);
  }

  hasPrompt(name: string): boolean {
    return this.entries.some(e => e.name === name);
  }

  get prompts(): PromptEntry[] {
    return this.entries;
  }
}

export function registerPromptGallery(context: vscode.ExtensionContext): PromptGalleryProvider {
  const provider = new PromptGalleryProvider(context);
  const view = vscode.window.createTreeView('pomlPromptGallery', { treeDataProvider: provider });
  context.subscriptions.push(view);
  return provider;
}
