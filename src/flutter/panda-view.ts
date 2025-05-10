import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DartProjectManager } from './dart-project';
import { PandaCommandProvider, CommandShortcut } from '../terminal/command-provider';
import { PandaSnippetManager, SnippetShortcut } from '../snippet/snippet-manager';

/**
 * Panel üzerindeki Dart/Flutter projeleri için TreeView sağlayıcı
 */
export class PandaViewProvider implements vscode.TreeDataProvider<PandaItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PandaItem | undefined | null | void> = new vscode.EventEmitter<PandaItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PandaItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private commandProvider: PandaCommandProvider;
    private snippetManager: PandaSnippetManager;
    
    // Snippet güncellemelerini dinlemek için callback
    set onSnippetUpdated(callback: (() => void) | undefined) {
        if (this.snippetManager) {
            this.snippetManager.onSnippetUpdated = callback;
        }
    }
    
    constructor(private context: vscode.ExtensionContext) {
        this.commandProvider = new PandaCommandProvider(context);
        this.snippetManager = new PandaSnippetManager(context);
    }

    /**
     * Yeni bir komut kısayolu ekler
     */
    addCommandShortcut(title: string, commands: string[], description: string): void {
        this.commandProvider.addCommandShortcut(title, commands, description);
        // Ekleme işlemi sonrası görünümü güncelle
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Yeni bir snippet kısayolu ekler
     */
    addSnippetShortcut(title: string, fileTypes: string, snippetCode: string, description: string): void {
        this.snippetManager.addSnippetShortcut(title, fileTypes, snippetCode, description);
        // Ekleme işlemi sonrası görünümü güncelle
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Komut kısayolunu çalıştırır
     */
    executeCommandShortcut(shortcut: CommandShortcut): void {
        this.commandProvider.executeCommandShortcut(shortcut);
    }
    
    /**
     * Snippet kısayolunu çalıştırır
     */
    executeSnippetShortcut(shortcut: SnippetShortcut): void {
        this.snippetManager.executeSnippetShortcut(shortcut);
    }
    
    /**
     * Komut kısayolunu siler
     */
    deleteCommandShortcut(shortcutId: string): void {
        const shortcutTitle = this.commandProvider.deleteCommandShortcut(shortcutId);
        if (shortcutTitle) {
            // Görünümü güncelle
            this._onDidChangeTreeData.fire();
            // Kullanıcıyı bilgilendir
            vscode.window.showInformationMessage(`"${shortcutTitle}" komut kısayolu silindi.`);
        } else {
            vscode.window.showErrorMessage(`Kısayol bulunamadı: ${shortcutId}`);
        }
    }
    
    /**
     * Snippet kısayolunu siler
     */
    deleteSnippetShortcut(shortcutId: string): void {
        const shortcutTitle = this.snippetManager.deleteSnippetShortcut(shortcutId);
        if (shortcutTitle) {
            // Görünümü güncelle
            this._onDidChangeTreeData.fire();
            // Kullanıcıyı bilgilendir
            vscode.window.showInformationMessage(`"${shortcutTitle}" snippet kısayolu silindi.`);
        } else {
            vscode.window.showErrorMessage(`Snippet kısayolu bulunamadı: ${shortcutId}`);
        }
    }

    /**
     * Ağaç görünümünü yeniler
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Belirtilen öğenin alt öğelerini getirir
     */    
    getChildren(element?: PandaItem): Thenable<PandaItem[]> {
        console.log(`getChildren called with element: ${element ? element.label : 'root'}`);
        
        if (element) {
            // Eğer bir kategori ise, onun alt öğelerini döndür
            if (element.contextValue === 'shortcutsCategory') {
                // Komut kısayolları kategorisinin alt öğelerini döndür
                console.log(`Getting children for shortcuts category`);
                return Promise.resolve(this.getCommandShortcutItems());
            } else if (element.contextValue === 'snippetsCategory') {
                // Snippet kısayolları kategorisinin alt öğelerini döndür
                console.log(`Getting children for snippets category`);
                const items = this.getSnippetShortcutItems();
                console.log(`Returned ${items.length} snippet items from getSnippetShortcutItems`);
                return Promise.resolve(items);
            } else {
                console.log(`Unknown contextValue: ${element.contextValue}`);
            }
            return Promise.resolve([]);
        } else {
            // Kök öğeleri getir
            console.log('Getting root items since element is undefined');
            return this.getRootItems();
        }
    }

    /**
     * Belirtilen öğenin TreeItem'ini getirir
     */
    getTreeItem(element: PandaItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Kök öğeleri alır: Projeler ve Kısayollar
     */    
    private async getRootItems(): Promise<PandaItem[]> {
        console.log('Getting root items');
        const items: PandaItem[] = [];
        
        // Komut Kısayolları kategorisi
        const shortcutsCategory = new PandaItem(
            'Komut Kısayolları', 
            'Sık kullanılan komutlar',
            '',
            'shortcutsCategory',
            vscode.TreeItemCollapsibleState.Expanded
        );
        
        // Terminal ikonunu ayarla
        shortcutsCategory.iconPath = new vscode.ThemeIcon('terminal-cmd');
        
        // Kısayollar kategorisi altına kısayolları ekle
        const commandShortcutItems = this.getCommandShortcutItems();
        console.log(`Adding ${commandShortcutItems.length} command shortcut items to shortcuts category`);
        shortcutsCategory.children = commandShortcutItems;
        items.push(shortcutsCategory);
        
        // Snippet Kısayolları kategorisi
        const snippetsCategory = new PandaItem(
            'Snippet Kısayolları', 
            'Sık kullanılan kod parçacıkları',
            '',
            'snippetsCategory',
            vscode.TreeItemCollapsibleState.Expanded
        );
        
        // Kod parçacığı ikonunu ayarla
        snippetsCategory.iconPath = new vscode.ThemeIcon('code');
        
        // Snippet kategorisi altına snippet kısayollarını ekle
        const snippetShortcutItems = this.getSnippetShortcutItems();
        console.log(`Adding ${snippetShortcutItems.length} snippet shortcut items to snippets category`);
        snippetsCategory.children = snippetShortcutItems;
        items.push(snippetsCategory);
        
        console.log(`Returning ${items.length} root categories`);
        return items;
    }

    /**
     * Çalışma alanındaki Dart/Flutter projelerini bulur
     */
    private async getWorkspaceProjects(): Promise<PandaItem[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const items: PandaItem[] = [];
        
        // Her bir çalışma alanı klasörünü kontrol et
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            
            // Klasörün Dart projesi olup olmadığını kontrol et
            const isDartProject = await DartProjectManager.isDartProject(folderPath);
            
            if (isDartProject) {
                // Proje bilgilerini al
                const projectInfo = await DartProjectManager.getProjectInfo(folderPath);
                
                // Projeyi ağaç görünümüne ekle
                items.push(new PandaItem(
                    projectInfo.name,
                    projectInfo.isFlutter ? 'Flutter Projesi' : 'Dart Projesi',
                    folderPath,
                    projectInfo.isFlutter ? 'flutterProject' : 'dartProject',
                    vscode.TreeItemCollapsibleState.Collapsed
                ));
            }
        }
        
        return items;
    }
    
    /**
     * Komut kısayollarını TreeView öğelerine dönüştürür
     */
    private getCommandShortcutItems(): PandaItem[] {
        const commandShortcuts = this.commandProvider.getCommandShortcuts();
        console.log(`Converting ${commandShortcuts.length} command shortcuts to tree items`);
        
        if (commandShortcuts.length === 0) {
            console.log('No command shortcuts to convert');
            return [];
        } 
        
        return commandShortcuts.map(shortcut => {
            console.log(`Creating tree item for shortcut: ${shortcut.title}`);
            const commandText = Array.isArray(shortcut.command) ? shortcut.command.join(" → ") : shortcut.command;
            const item = new PandaItem(
                shortcut.title,
                shortcut.description || commandText,
                shortcut.id,
                'commandShortcut',
                vscode.TreeItemCollapsibleState.None
            );
            
            // Komut kısayoluna tıklandığında çalışacak komut
            item.command = {
                command: 'panda-stack.executeCommandShortcut',
                title: 'Execute Command',
                arguments: [shortcut]
            };
            
            return item;
        });
    }

    /**
     * Snippet kısayollarını TreeView öğelerine dönüştürür
     */
    private getSnippetShortcutItems(): PandaItem[] {
        const snippetShortcuts = this.snippetManager.getSnippetShortcuts();
        console.log(`Converting ${snippetShortcuts.length} snippet shortcuts to tree items`);
        
        if (snippetShortcuts.length === 0) {
            console.log('No snippet shortcuts to convert');
            return [];
        }
        
        const items = snippetShortcuts.map(shortcut => {
            console.log(`Creating tree item for snippet shortcut: ${shortcut.title}, ID: ${shortcut.id}, FileTypes: ${shortcut.fileTypes}`);
            const item = new PandaItem(
                shortcut.title,
                shortcut.description || `Dosya Türleri: ${shortcut.fileTypes}`,
                shortcut.id,
                'snippetShortcut',
                vscode.TreeItemCollapsibleState.None
            );
            
            // Snippet kısayoluna tıklandığında çalışacak komut
            item.command = {
                command: 'panda-stack.executeSnippetShortcut',
                title: 'Execute Snippet',
                arguments: [shortcut]
            };
            
            return item;
        });
        
        console.log(`Returning ${items.length} snippet tree items`);
        return items;
    }
}

/**
 * Panda Ağaç Görünümü Öğesi
 */
export class PandaItem extends vscode.TreeItem {
    children?: PandaItem[];

    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly itemPath: string,
        public readonly contextValue: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;

        // Icon ayarla
        if (contextValue === 'flutterProject') {
            this.iconPath = new vscode.ThemeIcon('flutter');
        } else if (contextValue === 'dartProject') {
            this.iconPath = new vscode.ThemeIcon('symbol-interface');
        } else if (contextValue === 'commandShortcut') {
            this.iconPath = new vscode.ThemeIcon('terminal');
        } else if (contextValue === 'snippetShortcut') {
            this.iconPath = new vscode.ThemeIcon('code-block');
        } else if (contextValue === 'category') {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else if (contextValue === 'shortcutsCategory') {
            this.iconPath = new vscode.ThemeIcon('terminal-cmd');
        } else if (contextValue === 'snippetsCategory') {
            this.iconPath = new vscode.ThemeIcon('code');
        }

        // Dart/Flutter projelerine tıklandığında çalışacak komut
        if (contextValue === 'flutterProject' || contextValue === 'dartProject') {
            this.command = {
                command: 'panda-stack.dartAction',
                title: 'Open Project',
                arguments: [vscode.Uri.file(itemPath)]
            };
        }
    }
}
