import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DartProjectManager } from './dart-project';

/**
 * Komut kısayolu 
 */
interface CommandShortcut {
    id: string;
    title: string;
    command: string[];  // Komut dizisi (birden fazla komut)
    description: string;
}

/**
 * Snippet kısayolu
 */
interface SnippetShortcut {
    id: string;
    title: string;
    fileTypes: string; // Örn: ".ts,.js,.dart"
    snippetCode: string;
    description: string;
}

/**
 * Panel üzerindeki Dart/Flutter projeleri için TreeView sağlayıcı
 */
export class PandaViewProvider implements vscode.TreeDataProvider<PandaItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PandaItem | undefined | null | void> = new vscode.EventEmitter<PandaItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PandaItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // Komut kısayollarını saklamak için
    private commandShortcuts: CommandShortcut[] = [];
    // Snippet kısayollarını saklamak için
    private snippetShortcuts: SnippetShortcut[] = [];
    private context: vscode.ExtensionContext;
    
    // Snippet güncellemelerini dinlemek için callback
    onSnippetUpdated: (() => void) | undefined;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadCommandShortcuts();
        this.loadSnippetShortcuts();
    }
      /**
     * Komut kısayollarını yükler
     */
    private loadCommandShortcuts(): void {
        // globalState kullanarak kısayolları yükle (kalıcı depolama)
        const shortcuts = this.context.globalState.get<CommandShortcut[]>('pandaCommandShortcuts');
        if (shortcuts && shortcuts.length > 0) {
            this.commandShortcuts = shortcuts;
            console.log(`Loaded ${shortcuts.length} command shortcuts from global state`);
        } else {
            this.commandShortcuts = [];
            console.log('No command shortcuts found in global state');
        }
    }
      /**
     * Snippet kısayollarını yükler
     */
    private loadSnippetShortcuts(): void {
        try {
            // globalState kullanarak snippet kısayollarını yükle (kalıcı depolama)
            const shortcuts = this.context.globalState.get<SnippetShortcut[]>('pandaSnippetShortcuts');
            console.log('Attempting to load snippets from global state');
            
            if (shortcuts && shortcuts.length > 0) {
                this.snippetShortcuts = shortcuts;
                console.log(`Loaded ${shortcuts.length} snippet shortcuts from global state`);
                console.log(`Loaded snippets: ${shortcuts.map(s => s.title).join(', ')}`);
                // Snippets içeriğini görelim
                shortcuts.forEach((s, i) => {
                    console.log(`Snippet ${i+1}: ID=${s.id}, Title=${s.title}, FileTypes=${s.fileTypes}`);
                });
            } else {
                this.snippetShortcuts = [];
                console.log('No snippet shortcuts found in global state');
            }
        } catch (error) {
            console.error('Error loading snippet shortcuts:', error);
            this.snippetShortcuts = [];
        }
    }
    
    /**
     * Komut kısayollarını kaydeder
     */
    private saveCommandShortcuts(): void {
        // globalState kullanarak kısayolları kaydet (kalıcı depolama)
        this.context.globalState.update('pandaCommandShortcuts', this.commandShortcuts);
        console.log(`Saved ${this.commandShortcuts.length} command shortcuts to global state with keys: ${this.commandShortcuts.map(s => s.title).join(', ')}`);
    }
    
    /**
     * Snippet kısayollarını kaydeder
     */
    private saveSnippetShortcuts(): void {
        // globalState kullanarak snippet kısayollarını kaydet (kalıcı depolama)
        this.context.globalState.update('pandaSnippetShortcuts', this.snippetShortcuts);
        console.log(`Saved ${this.snippetShortcuts.length} snippet shortcuts to global state with keys: ${this.snippetShortcuts.map(s => s.title).join(', ')}`);
    }    /**
     * Yeni bir komut kısayolu ekler
     */
    addCommandShortcut(title: string, commands: string[], description: string): void {
        this.commandShortcuts.push({
            id: Date.now().toString(),
            title,
            command: commands,
            description
        });
        this.saveCommandShortcuts();
        console.log(`Added command shortcut: ${title}, Total count: ${this.commandShortcuts.length}`);
        
        // Ekleme işlemi sonrası görünümü güncelle
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Yeni bir snippet kısayolu ekler
     */
    addSnippetShortcut(title: string, fileTypes: string, snippetCode: string, description: string): void {
        console.log(`Attempting to add snippet shortcut: ${title} for file types: ${fileTypes}`);
        
        this.snippetShortcuts.push({
            id: Date.now().toString(),
            title,
            fileTypes,
            snippetCode,
            description
        });
        
        console.log(`Snippet added to array. Current snippet count: ${this.snippetShortcuts.length}`);
        console.log(`Snippet details: ${JSON.stringify({title, fileTypes, snippetCode: snippetCode.substring(0, 30) + '...', description})}`);
        
        this.saveSnippetShortcuts();
        console.log(`Added snippet shortcut: ${title}, Total count: ${this.snippetShortcuts.length}`);
        
        // Ekleme işlemi sonrası görünümü güncelle
        console.log('Firing tree data change event to refresh view');
        this._onDidChangeTreeData.fire();
        
        // Snippet güncellemelerini dinleyen callback'i çağır
        if (this.onSnippetUpdated) {
            console.log('Calling onSnippetUpdated callback');
            this.onSnippetUpdated();
        }
    }
    
    /**
     * Komut kısayolunu çalıştırır
     */
    executeCommandShortcut(shortcut: CommandShortcut): void {
        // Terminal oluştur
        const terminal = vscode.window.createTerminal(`Panda - ${shortcut.title}`);
        terminal.show();
        
        // Komutları sırayla çalıştır
        if (shortcut.command.length > 0) {
            // İlk komutu hemen çalıştır
            terminal.sendText(shortcut.command[0]);
            
            // Birden fazla komut varsa, geri kalanları sırayla çalıştır
            if (shortcut.command.length > 1) {
                this.executeCommandsSequentially(terminal, shortcut.command.slice(1), 0);
            }
        }
    }
    
    /**
     * Snippet kısayolunu çalıştırır
     */
    executeSnippetShortcut(shortcut: SnippetShortcut): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Snippet eklemek için bir dosya açık olmalıdır!');
            return;
        }
        
        // Aktif dosyanın türünü kontrol et
        const currentFileName = editor.document.fileName;
        const currentFileExt = path.extname(currentFileName);
        
        // Bu snippet'in desteklediği dosya uzantılarını kontrol et
        const supportedTypes = shortcut.fileTypes.split(',').map(type => type.trim());
        
        if (!supportedTypes.includes(currentFileExt) && !supportedTypes.includes('*')) {
            vscode.window.showWarningMessage(`Bu snippet sadece ${shortcut.fileTypes} dosya türlerinde çalışır.`);
            return;
        }
        
        // Snippet'i ekle
        editor.edit(editBuilder => {
            const selection = editor.selection;
            // Seçili alan varsa değiştir, yoksa imleç konumuna ekle
            if (selection && !selection.isEmpty) {
                editBuilder.replace(selection, shortcut.snippetCode);
            } else {
                editBuilder.insert(selection.active, shortcut.snippetCode);
            }
        }).then(success => {
            if (success) {
                vscode.window.showInformationMessage(`"${shortcut.title}" snippet'i eklendi.`);
            } else {
                vscode.window.showErrorMessage('Snippet eklenirken hata oluştu.');
            }
        });
    }
    
    /**
     * Komutları sırayla terminal üzerinde çalıştırır.
     * Her bir komut, önceki komut tamamlandıktan sonra çalıştırılır.
     */
    private executeCommandsSequentially(terminal: vscode.Terminal, commands: string[], index: number): void {
        if (index >= commands.length) {
            return; // Tüm komutlar çalıştırılmış
        }
        
        // Terminale odaklan
        terminal.show();
        
        // Şu anki komutu çalıştır
        setTimeout(() => {
            terminal.sendText(commands[index]);
            
            // Sonraki komut için biraz bekle ve tekrar çağır
            setTimeout(() => {
                this.executeCommandsSequentially(terminal, commands, index + 1);
            }, 1000); // 1 saniye bekle
        }, 500); // 0.5 saniye bekle
    }

    /**
     * Komut kısayolunu siler
     */
    deleteCommandShortcut(shortcutId: string): void {
        console.log(`Deleting command shortcut with id: ${shortcutId}`);
        // Silmeden önce kısayolun var olduğundan emin ol
        const shortcutIndex = this.commandShortcuts.findIndex(s => s.id === shortcutId);
        
        if (shortcutIndex !== -1) {
            // Kısayolun adını sakla (silme işlemi sonrası kullanıcıya bilgi vermek için)
            const shortcutTitle = this.commandShortcuts[shortcutIndex].title;
            
            // Kısayolu diziden kaldır
            this.commandShortcuts.splice(shortcutIndex, 1);
            
            // Değişiklikleri kaydet
            this.saveCommandShortcuts();
            
            // Görünümü güncelle
            this._onDidChangeTreeData.fire();
            
            // Kullanıcıyı bilgilendir
            vscode.window.showInformationMessage(`"${shortcutTitle}" komut kısayolu silindi.`);
            console.log(`Command shortcut deleted: ${shortcutTitle}, Remaining count: ${this.commandShortcuts.length}`);
        } else {
            vscode.window.showErrorMessage(`Kısayol bulunamadı: ${shortcutId}`);
            console.error(`Command shortcut not found: ${shortcutId}`);
        }
    }
    
    /**
     * Snippet kısayolunu siler
     */
    deleteSnippetShortcut(shortcutId: string): void {
        console.log(`Deleting snippet shortcut with id: ${shortcutId}`);
        // Silmeden önce kısayolun var olduğundan emin ol
        const shortcutIndex = this.snippetShortcuts.findIndex(s => s.id === shortcutId);
        
        if (shortcutIndex !== -1) {
            // Kısayolun adını sakla (silme işlemi sonrası kullanıcıya bilgi vermek için)
            const shortcutTitle = this.snippetShortcuts[shortcutIndex].title;
            
            // Kısayolu diziden kaldır
            this.snippetShortcuts.splice(shortcutIndex, 1);
            
            // Değişiklikleri kaydet
            this.saveSnippetShortcuts();
            
            // Görünümü güncelle
            this._onDidChangeTreeData.fire();
            
            // Snippet güncellemelerini dinleyen callback'i çağır
            if (this.onSnippetUpdated) {
                console.log('Calling onSnippetUpdated callback after deletion');
                this.onSnippetUpdated();
            }
            
            // Kullanıcıyı bilgilendir
            vscode.window.showInformationMessage(`"${shortcutTitle}" snippet kısayolu silindi.`);
            console.log(`Snippet shortcut deleted: ${shortcutTitle}, Remaining count: ${this.snippetShortcuts.length}`);
        } else {
            vscode.window.showErrorMessage(`Snippet kısayolu bulunamadı: ${shortcutId}`);
            console.error(`Snippet shortcut not found: ${shortcutId}`);
        }
    }

    /**
     * Ağaç görünümünü yeniler
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }    /**
     * Belirtilen öğenin alt öğelerini getirir
     */    
    getChildren(element?: PandaItem): Thenable<PandaItem[]> {
        console.log(`getChildren called with element: ${element ? element.label : 'root'}`);
        
        if (element) {
            // Eğer bir kategori ise, onun alt öğelerini döndür
            if (element.contextValue === 'shortcutsCategory') {
                // Komut kısayolları kategorisinin alt öğelerini döndür
                console.log(`Getting children for shortcuts category, count: ${this.commandShortcuts.length}`);
                return Promise.resolve(this.getCommandShortcutItems());
            } else if (element.contextValue === 'snippetsCategory') {
                // Snippet kısayolları kategorisinin alt öğelerini döndür
                console.log(`Getting children for snippets category, count: ${this.snippetShortcuts.length}`);
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
    }    /**
     * Kök öğeleri alır: Projeler ve Kısayollar
     */    private async getRootItems(): Promise<PandaItem[]> {
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
    }    /**
     * Komut kısayollarını TreeView öğelerine dönüştürür
     */
    private getCommandShortcutItems(): PandaItem[] {
        console.log(`Converting ${this.commandShortcuts.length} command shortcuts to tree items`);
        
        if (this.commandShortcuts.length === 0) {
            console.log('No command shortcuts to convert');
            return [];
        } 
        
        return this.commandShortcuts.map(shortcut => {
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
        console.log(`Converting ${this.snippetShortcuts.length} snippet shortcuts to tree items`);
        
        if (this.snippetShortcuts.length === 0) {
            console.log('No snippet shortcuts to convert');
            return [];
        }
        
        const items = this.snippetShortcuts.map(shortcut => {
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
