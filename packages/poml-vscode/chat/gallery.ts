import * as vscode from 'vscode';

export interface PromptEntry {
  name: string;
  file: string;
}

interface PromptCategory {
  type: 'category';
  label: string;
}

type TreeNode = PromptEntry | PromptCategory;

function isCategory(node: TreeNode): node is PromptCategory {
  return (node as PromptCategory).type === 'category';
}

const STORAGE_KEY = 'poml.promptGallery';

export class PromptGalleryProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext, private defaults: PromptEntry[]) {}

  private get userEntries(): PromptEntry[] {
    return this.context.globalState.get<PromptEntry[]>(STORAGE_KEY, []);
  }

  private update(entries: PromptEntry[]) {
    void this.context.globalState.update(STORAGE_KEY, entries);
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return [
        { type: 'category', label: 'Default Prompts' },
        { type: 'category', label: 'My Prompts' },
      ];
    }
    if (isCategory(element)) {
      return element.label === 'Default Prompts'
        ? this.defaults
        : this.userEntries;
    }
    return [];
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (isCategory(element)) {
      return new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
    } else {
      const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
      item.resourceUri = vscode.Uri.file(element.file);
      item.command = {
        command: 'vscode.open',
        title: 'Open Prompt',
        arguments: [vscode.Uri.file(element.file)],
      };
      item.contextValue = 'pomlPrompt';
      return item;
    }
  }

  addPrompt(entry: PromptEntry) {
    const list = [...this.userEntries, entry];
    this.update(list);
  }

  removePrompt(entry: PromptEntry) {
    this.update(this.userEntries.filter(e => e !== entry));
  }

  updatePrompt(entry: PromptEntry, newEntry: PromptEntry) {
    const list = this.userEntries.map(e => (e === entry ? newEntry : e));
    this.update(list);
  }

  hasPrompt(name: string): boolean {
    return this.userEntries.some(e => e.name === name);
  }

  get prompts(): PromptEntry[] {
    return [...this.defaults, ...this.userEntries];
  }
}

export function registerPromptGallery(context: vscode.ExtensionContext): PromptGalleryProvider {
  const galleryDir = vscode.Uri.joinPath(context.extensionUri, 'gallery');
  const defaults: PromptEntry[] = [
    { name: 'code_ask', file: vscode.Uri.joinPath(galleryDir, 'code_ask.poml').fsPath },
    { name: 'code_edit', file: vscode.Uri.joinPath(galleryDir, 'code_edit.poml').fsPath },
    { name: 'latex_edit', file: vscode.Uri.joinPath(galleryDir, 'latex_edit.poml').fsPath },
    { name: 'latex_write', file: vscode.Uri.joinPath(galleryDir, 'latex_write.poml').fsPath },
    { name: 'pdf_understanding', file: vscode.Uri.joinPath(galleryDir, 'pdf_understanding.poml').fsPath },
    { name: 'word_understanding', file: vscode.Uri.joinPath(galleryDir, 'word_understanding.poml').fsPath },
    { name: 'table_understanding', file: vscode.Uri.joinPath(galleryDir, 'table_understanding.poml').fsPath },
  ];
  const provider = new PromptGalleryProvider(context, defaults);
  const view = vscode.window.createTreeView('pomlPromptGallery', { treeDataProvider: provider });
  context.subscriptions.push(view);
  return provider;
}
