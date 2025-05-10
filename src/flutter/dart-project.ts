import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Dart projeleri için özel eylemler içeren modül.
 */
export class DartProjectManager {
    /**
     * Bir klasörün Dart projesi olup olmadığını kontrol eder.
     * @param folderPath Kontrol edilecek klasörün yolu
     * @returns Klasörün Dart projesi olup olmadığı
     */
    public static async isDartProject(folderPath: string): Promise<boolean> {
        const pubspecPath = path.join(folderPath, 'pubspec.yaml');
        try {
            const pubspecUri = vscode.Uri.file(pubspecPath);
            await vscode.workspace.fs.stat(pubspecUri);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Dart projesinin pubspec.yaml dosyasını okur ve proje bilgilerini alır.
     * @param folderPath Proje klasörünün yolu
     * @returns Proje adı ve diğer bilgiler
     */
    public static async getProjectInfo(folderPath: string): Promise<{ name: string; isFlutter: boolean }> {
        const pubspecPath = path.join(folderPath, 'pubspec.yaml');
        try {
            const pubspecUri = vscode.Uri.file(pubspecPath);
            const pubspecDoc = await vscode.workspace.openTextDocument(pubspecUri);
            const pubspecContent = pubspecDoc.getText();
            
            // Proje adını al
            const nameMatch = pubspecContent.match(/name:\s*(.+)/);
            const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
            
            // Flutter bağımlılığı var mı kontrol et (Flutter projesi mi?)
            const isFlutter = pubspecContent.includes('flutter:') || 
                             pubspecContent.includes('sdk: flutter');
            
            return { name, isFlutter };
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
            return { name: 'Unknown', isFlutter: false };
        }
    }

    /**
     * Dart projesi için özel eylemler gerçekleştirir
     * @param folderPath Proje klasörünün yolu
     */
    public static async performDartActions(folderPath: string): Promise<void> {
        try {
            // Önce Dart projesi olup olmadığını kontrol et
            const isDartProject = await this.isDartProject(folderPath);
            
            if (isDartProject) {
                // Bu bir Dart projesi, Dart'a özgü eylemleri gerçekleştir
                vscode.window.showInformationMessage(`Dart projesi bulundu: ${folderPath}`);
                
                // Proje bilgilerini al
                const projectInfo = await this.getProjectInfo(folderPath);
                
                vscode.window.showInformationMessage(`Proje adı: ${projectInfo.name}`);
                
                if (projectInfo.isFlutter) {
                    vscode.window.showInformationMessage('Bu bir Flutter projesidir.');
                    // Flutter'a özgü işlemler buraya eklenebilir
                } else {
                    vscode.window.showInformationMessage('Bu bir saf Dart projesidir.');
                    // Dart'a özgü işlemler buraya eklenebilir
                }
                
                // Burada projeye özel daha fazla işlem eklenebilir:
                // - Proje analizi
                // - Kod oluşturma
                // - Yapı oluşturma komutları
                // - Test komutları
                // vb.
            } else {
                vscode.window.showInformationMessage(`Bu klasörde Dart projesi bulunamadı: ${folderPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Hata: ${error}`);
        }
    }
}
