import * as vscode from 'vscode';

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
 * VS Code'un yerleşik snippet sistemine entegre olan sağlayıcı
 */
export class PandaSnippetProvider implements vscode.CompletionItemProvider {
    private snippets: SnippetShortcut[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadSnippets();
    }

    /**
     * Kaydedilmiş snippet kısayollarını yükler
     */
    loadSnippets(): void {
        try {
            const snippets = this.context.globalState.get<SnippetShortcut[]>('pandaSnippetShortcuts');
            if (snippets && snippets.length > 0) {
                this.snippets = snippets;
                console.log(`Snippet provider loaded ${snippets.length} snippets`);
            } else {
                this.snippets = [];
                console.log('No snippets found for snippet provider');
            }
        } catch (error) {
            console.error('Error loading snippets for snippet provider:', error);
            this.snippets = [];
        }
    }

    /**
     * Yeni snippet eklendiğinde veya silindiğinde çağrılır
     */
    refresh(): void {
        this.loadSnippets();
    }

    /**
     * VS Code'un tamamlama öğelerini sağlar (IntelliSense)
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        // Dosya uzantısını al
        const fileExt = document.fileName.substring(document.fileName.lastIndexOf('.'));
        
        // Bu dosya türüne uygun snippet'leri filtrele
        const applicableSnippets = this.snippets.filter(snippet => {
            const supportedTypes = snippet.fileTypes.split(',').map(type => type.trim());
            return supportedTypes.includes(fileExt) || supportedTypes.includes('*');
        });

        // Snippet'leri VS Code tamamlama öğelerine dönüştür
        return applicableSnippets.map(snippet => {
            const item = new vscode.CompletionItem(
                snippet.title,
                vscode.CompletionItemKind.Snippet
            );
            
            item.insertText = new vscode.SnippetString(snippet.snippetCode);
            item.documentation = new vscode.MarkdownString(snippet.description || 'Panda Stack snippet');
            item.detail = `Panda Stack: ${snippet.title}`;
            
            return item;
        });
    }
} 