import * as vscode from 'vscode';

/**
 * Komut kısayolu 
 */
export interface CommandShortcut {
    id: string;
    title: string;
    command: string[];  // Komut dizisi (birden fazla komut)
    description: string;
}

/**
 * Terminal komutları ile ilgili işlemleri yöneten sınıf
 */
export class PandaCommandProvider {
    private commandShortcuts: CommandShortcut[] = [];
    
    constructor(private context: vscode.ExtensionContext) {
        this.loadCommandShortcuts();
    }
    
    /**
     * Komut kısayollarını yükler
     */
    loadCommandShortcuts(): void {
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
     * Komut kısayollarını kaydeder
     */
    saveCommandShortcuts(): void {
        // globalState kullanarak kısayolları kaydet (kalıcı depolama)
        this.context.globalState.update('pandaCommandShortcuts', this.commandShortcuts);
        console.log(`Saved ${this.commandShortcuts.length} command shortcuts to global state with keys: ${this.commandShortcuts.map(s => s.title).join(', ')}`);
    }
    
    /**
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
    }
    
    /**
     * Komut kısayollarını getirir
     */
    getCommandShortcuts(): CommandShortcut[] {
        return this.commandShortcuts;
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
    deleteCommandShortcut(shortcutId: string): string | null {
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
            
            console.log(`Command shortcut deleted: ${shortcutTitle}, Remaining count: ${this.commandShortcuts.length}`);
            return shortcutTitle;
        } else {
            console.error(`Command shortcut not found: ${shortcutId}`);
            return null;
        }
    }
} 