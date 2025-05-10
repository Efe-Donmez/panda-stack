import * as vscode from 'vscode';

/**
 * Snippet kısayolu
 */
export interface SnippetShortcut {
    id: string;
    title: string;
    fileTypes: string; // Örn: ".ts,.js,.dart"
    snippetCode: string; // Çok satırlı kod parçaları desteklenir
    description: string;
}

/**
 * Snippet kısayolları ile ilgili işlemleri yöneten sınıf
 */
export class PandaSnippetManager {
    private snippetShortcuts: SnippetShortcut[] = [];
    
    // Snippet güncellemelerini dinlemek için callback
    onSnippetUpdated: (() => void) | undefined;
    
    constructor(private context: vscode.ExtensionContext) {
        this.loadSnippetShortcuts();
    }
    
    /**
     * Snippet kısayollarını yükler
     */
    loadSnippetShortcuts(): void {
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
     * Snippet kısayollarını kaydeder
     */
    saveSnippetShortcuts(): void {
        // globalState kullanarak snippet kısayollarını kaydet (kalıcı depolama)
        this.context.globalState.update('pandaSnippetShortcuts', this.snippetShortcuts);
        console.log(`Saved ${this.snippetShortcuts.length} snippet shortcuts to global state with keys: ${this.snippetShortcuts.map(s => s.title).join(', ')}`);
    }
    
    /**
     * Snippet kısayollarını getirir
     */
    getSnippetShortcuts(): SnippetShortcut[] {
        return this.snippetShortcuts;
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
        
        // Snippet güncellemelerini dinleyen callback'i çağır
        if (this.onSnippetUpdated) {
            console.log('Calling onSnippetUpdated callback');
            this.onSnippetUpdated();
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
        const currentFileExt = currentFileName.substring(currentFileName.lastIndexOf('.'));
        
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
     * Snippet kısayolunu siler
     */
    deleteSnippetShortcut(shortcutId: string): string | null {
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
            
            console.log(`Snippet shortcut deleted: ${shortcutTitle}, Remaining count: ${this.snippetShortcuts.length}`);
            
            // Snippet güncellemelerini dinleyen callback'i çağır
            if (this.onSnippetUpdated) {
                console.log('Calling onSnippetUpdated callback after deletion');
                this.onSnippetUpdated();
            }
            
            return shortcutTitle;
        } else {
            console.error(`Snippet shortcut not found: ${shortcutId}`);
            return null;
        }
    }
} 