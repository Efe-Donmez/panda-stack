// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DartProjectManager } from './flutter/dart-project';
import { PandaViewProvider } from './flutter/panda-view';
import { PandaSnippetProvider } from './flutter/snippet-provider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "panda-stack" is now active!');

    try {
        // Panda Explorer View Provider'ı oluştur ve kaydet
        const pandaViewProvider = new PandaViewProvider(context);
        const treeView = vscode.window.createTreeView('pandaExplorer', {
            treeDataProvider: pandaViewProvider,
            showCollapseAll: true
        });

        // Snippet sağlayıcıyı oluştur ve kaydet
        const snippetProvider = new PandaSnippetProvider(context);
        
        // Snippet sağlayıcıyı tüm dil türleri için kaydet
        const snippetDisposable = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: '*' }, // Tüm dil türleri için
            snippetProvider
        );
        
        // Snippet ekleme ve silme işlemlerinden sonra snippet sağlayıcıyı güncelle
        const refreshSnippetProvider = () => {
            snippetProvider.refresh();
        };
        
        // PandaViewProvider'a snippet güncellemelerini dinleme işlevi ekle
        pandaViewProvider.onSnippetUpdated = refreshSnippetProvider;

        // The command has been defined in the package.json file
        // Now provide the implementation of the command with registerCommand
        // The commandId parameter must match the command field in package.json
        const helloWorldDisposable = vscode.commands.registerCommand('panda-stack.helloWorld', () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage('Hello World from Panda Stack!');
        });

        // Register the Dart specific command for context menu
        const dartActionDisposable = vscode.commands.registerCommand('panda-stack.dartAction', async (uri: vscode.Uri) => {
            if (uri) {
                // Dart işlemlerini DartProjectManager sınıfının ilgili metoduna devret
                await DartProjectManager.performDartActions(uri.fsPath);
            }
        });

        // Register the refresh command
        const refreshDisposable = vscode.commands.registerCommand('panda-stack.refreshPandaView', () => {
            pandaViewProvider.refresh();
            vscode.window.showInformationMessage('Panda Explorer güncellendi');
        });

        // Register the add widget command
        const addWidgetDisposable = vscode.commands.registerCommand('panda-stack.addFlutterWidget', (item) => {
            if (item) {
                vscode.window.showInformationMessage(`${item.label} projesine Flutter widget ekleniyor...`);
                // Burada widget ekleme işlemi yapılabilir
            }
        });

        // Register the add command shortcut
        const addCommandShortcutDisposable = vscode.commands.registerCommand('panda-stack.addCommandShortcut', async () => {
            try {
                // Başlık girişi için input box göster
                const shortcutTitle = await vscode.window.showInputBox({
                    placeHolder: 'Kısayol Başlığı',
                    prompt: 'Komut kısayolunuz için bir başlık girin'
                });
                
                if (!shortcutTitle) {
                    console.log('Command shortcut creation cancelled: No title provided');
                    return; // Kullanıcı iptal etti veya boş giriş yaptı
                }
                
                // Komutları saklamak için dizi
                const commands: string[] = [];
                let continueAdding = true;
                
                // Kullanıcı iptal edene kadar veya boş bırakana kadar komut ekle
                while (continueAdding) {
                    const commandNumber = commands.length + 1;
                    const commandInput = await vscode.window.showInputBox({
                        placeHolder: `Komut #${commandNumber}`,
                        prompt: `Çalıştırılacak komutu girin (Komut #${commandNumber}). Boş bırakırsanız sona erer.`
                    });
                    
                    if (!commandInput) {
                        // Boş bırakıldıysa komut ekleme işlemini sonlandır
                        continueAdding = false;
                    } else {
                        commands.push(commandInput);
                    }
                }
                
                // Hiç komut girilmediyse iptal et
                if (commands.length === 0) {
                    console.log('Command shortcut creation cancelled: No commands provided');
                    return;
                }
                
                // Açıklama girişi için input box göster
                const descriptionInput = await vscode.window.showInputBox({
                    placeHolder: 'Açıklama (isteğe bağlı)',
                    prompt: 'Komut için açıklama girin'
                });
                
                // Yeni komut kısayolunu kaydet ve görünümü yenile
                console.log(`Adding command shortcut: "${shortcutTitle}" with commands: ${commands.join(', ')}`);
                pandaViewProvider.addCommandShortcut(shortcutTitle, commands, descriptionInput || '');
                
                vscode.window.showInformationMessage(`"${shortcutTitle}" komut kısayolu eklendi.`);
            } catch (error) {
                console.error('Error adding command shortcut:', error);
                vscode.window.showErrorMessage(`Komut kısayolu eklenirken hata oluştu: ${error}`);
            }
        });
        
        // Komut kısayolunu çalıştırmak için komut
        const executeCommandShortcutDisposable = vscode.commands.registerCommand('panda-stack.executeCommandShortcut', (shortcut) => {
            if (shortcut) {
                pandaViewProvider.executeCommandShortcut(shortcut);
            }
        });

        // Komut kısayolunu silmek için komut
        const deleteCommandShortcutDisposable = vscode.commands.registerCommand('panda-stack.deleteCommandShortcut', (item) => {
            if (item && item.itemPath) {
                // Onay iste
                vscode.window.showWarningMessage(
                    `"${item.label}" komut kısayolunu silmek istediğinizden emin misiniz?`,
                    { modal: true },
                    'Evet', 'Hayır'
                ).then(selection => {
                    if (selection === 'Evet') {
                        // itemPath özelliği, kısayol ID'sini içeriyor
                        pandaViewProvider.deleteCommandShortcut(item.itemPath);
                    }
                });
            }
        });

        // Register the add snippet shortcut command
        const addSnippetShortcutDisposable = vscode.commands.registerCommand('panda-stack.addSnippetShortcut', async () => {
            try {
                // Başlık girişi için input box göster
                const shortcutTitle = await vscode.window.showInputBox({
                    placeHolder: 'Snippet Başlığı',
                    prompt: 'Snippet kısayolunuz için bir başlık girin'
                });
                
                if (!shortcutTitle) {
                    console.log('Snippet shortcut creation cancelled: No title provided');
                    return; // Kullanıcı iptal etti veya boş giriş yaptı
                }
                
                // Snippet için dosya türlerini belirle
                const fileTypes = await vscode.window.showInputBox({
                    placeHolder: '.dart,.ts,.js,*',
                    prompt: 'Bu snippet\'in hangi dosya türlerinde çalışacağını belirtin (virgülle ayırarak). Tüm dosya türleri için * kullanın.',
                    value: '.dart'
                });
                
                if (!fileTypes) {
                    console.log('Snippet shortcut creation cancelled: No file types provided');
                    return; // Kullanıcı iptal etti veya boş bıraktı
                }
                
                // Snippet kodunu al - çok satırlı girdi için QuickPick yerine InputBox kullanıyoruz
                const snippetCode = await vscode.window.showInputBox({
                    placeHolder: 'Snippet kodunu girin',
                    prompt: 'Eklemek istediğiniz kod parçacığını girin',
                    ignoreFocusOut: true, // Kullanıcı başka pencereye geçse bile inputbox açık kalır
                });
                
                if (!snippetCode || snippetCode.trim() === '') {
                    console.log('Snippet shortcut creation cancelled: No snippet code provided');
                    return; // Kullanıcı iptal etti veya boş bıraktı
                }
                
                // Açıklama girişi için input box göster
                const descriptionInput = await vscode.window.showInputBox({
                    placeHolder: 'Açıklama (isteğe bağlı)',
                    prompt: 'Snippet için açıklama girin'
                });
                
                // Yeni snippet kısayolunu kaydet ve görünümü yenile
                console.log(`Adding snippet shortcut: "${shortcutTitle}" for file types: ${fileTypes}`);
                pandaViewProvider.addSnippetShortcut(shortcutTitle, fileTypes, snippetCode, descriptionInput || '');
                
                vscode.window.showInformationMessage(`"${shortcutTitle}" snippet kısayolu eklendi.`);
            } catch (error) {
                console.error('Error adding snippet shortcut:', error);
                vscode.window.showErrorMessage(`Snippet kısayolu eklenirken hata oluştu: ${error}`);
            }
        });
        
        // Snippet kısayolunu çalıştırmak için komut
        const executeSnippetShortcutDisposable = vscode.commands.registerCommand('panda-stack.executeSnippetShortcut', (shortcut) => {
            if (shortcut) {
                pandaViewProvider.executeSnippetShortcut(shortcut);
            }
        });
        
        // Snippet kısayolunu silmek için komut
        const deleteSnippetShortcutDisposable = vscode.commands.registerCommand('panda-stack.deleteSnippetShortcut', (item) => {
            if (item && item.itemPath) {
                // Onay iste
                vscode.window.showWarningMessage(
                    `"${item.label}" snippet kısayolunu silmek istediğinizden emin misiniz?`,
                    { modal: true },
                    'Evet', 'Hayır'
                ).then(selection => {
                    if (selection === 'Evet') {
                        // itemPath özelliği, kısayol ID'sini içeriyor
                        pandaViewProvider.deleteSnippetShortcut(item.itemPath);
                    }
                });
            }
        });

        // Properly register the disposables to ensure cleanup
        if (context && context.subscriptions) {
            context.subscriptions.push(
                helloWorldDisposable, 
                dartActionDisposable, 
                refreshDisposable, 
                addWidgetDisposable,
                addCommandShortcutDisposable,
                executeCommandShortcutDisposable,
                deleteCommandShortcutDisposable,
                addSnippetShortcutDisposable,
                executeSnippetShortcutDisposable,
                deleteSnippetShortcutDisposable,
                treeView,
                snippetDisposable
            );
        } else {
            console.error('Extension context or subscriptions array is undefined');
            // Fallback disposal if context.subscriptions is unavailable
            vscode.Disposable.from(
                helloWorldDisposable, 
                dartActionDisposable, 
                refreshDisposable, 
                addWidgetDisposable,
                addCommandShortcutDisposable,
                executeCommandShortcutDisposable,
                deleteCommandShortcutDisposable,
                addSnippetShortcutDisposable,
                executeSnippetShortcutDisposable,
                deleteSnippetShortcutDisposable,
                treeView,
                snippetDisposable
            );
        }
    } catch (error) {
        console.error('Error activating panda-stack extension:', error);
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Implement proper cleanup logic
    try {
        console.log('Deactivating panda-stack extension...');
        // Add any cleanup code here
        return Promise.resolve();
    } catch (error) {
        console.error('Error during panda-stack extension deactivation:', error);
        return Promise.reject(error);
    }
}
