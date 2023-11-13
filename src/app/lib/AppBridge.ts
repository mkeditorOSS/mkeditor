import { BrowserWindow, dialog, ipcMain } from 'electron';
import { BridgedEditorContent } from '../interfaces/Bridge';
import { SettingsProviders } from '../interfaces/Providers';
import { AppStorage } from './AppStorage';

export class AppBridge {
  
  private context: BrowserWindow;
  
  private contextWindowTitle: string = 'MKEditor';
  
  private contextBridgedContent: BridgedEditorContent = {
    original: null,
    current: null
  };

  private providers: SettingsProviders = {
    settings: null
  };

  constructor (context: BrowserWindow, register = false) {
    this.context = context;

    if (register) {
      this.register();
    }
  }

  provide<T>(provider: string, instance: T) {
    this.providers[provider] = instance;
  }
  
  register () {
    ipcMain.on('to:title:set', (event, title = null) => {
      if (title) {
        this.contextWindowTitle = `MKEditor - ${title}`;
      }
      
      this.context.setTitle(this.contextWindowTitle);
    });
    
    ipcMain.on('to:editor:state', (event, { original, current }) => {
      this.updateContextBridgedContent(original, current);
      
      if (this.contextBridgedContentHasChanged()) {
        this.context.setTitle(`${this.contextWindowTitle} - *(Unsaved Changes)*`);
      } else {
        this.context.setTitle(this.contextWindowTitle);
      }
    });
    
    ipcMain.on('to:settings:save', (event, { settings }) => {
      this.providers.settings?.saveSettingsToFile(settings);
    });
    
    ipcMain.on('to:html:export', (event, { content }) => {
      AppStorage.save(this.context, {
        id: event.sender.id,
        data: content,
        encoding: 'utf-8'
      });
    });
    
    ipcMain.on('to:file:new', (event, { content, file }) => {
      AppStorage.create(this.context, {
        id: event.sender.id,
        data: content,
        filePath: file,
        encoding: 'utf-8'
      }).then(() => {
        this.resetContextBridgedContent();
      });
    });

    ipcMain.on('to:file:open', () => {
      AppStorage.open(this.context);
    });
    
    ipcMain.on('to:file:save', async (event, { content, file, prompt = false, fromOpen = false }) => {
      const confirmed = await AppStorage.saveChangesToExisting(this.context, prompt);
      if (confirmed) {
        AppStorage.save(this.context, {
          id: event.sender.id,
          data: content,
          filePath: file,
          encoding: 'utf-8'
        }).then(() => {
          if (fromOpen) AppStorage.open(this.context);
          this.resetContextBridgedContent();
        });
      } else {
        if (fromOpen) AppStorage.open(this.context);
      }
    });
    
    ipcMain.on('to:file:saveas', (event, data) => {
      AppStorage.save(this.context, {
        id: event.sender.id,
        data,
        encoding: 'utf-8'
      }).then(() => {
        this.resetContextBridgedContent();
      });
    });
  }
  
  promptForChangedContextBridgeContent (event: Event) {
    if (this.contextBridgedContentHasChanged()) {
      return this.promptUserForUnsavedChanges(event);
    }
  }

  promptUserForUnsavedChanges (event: Event, message = null) {
    const choice = dialog.showMessageBoxSync(this.context, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: message ?? 'You have unsaved changes, are you sure you want to quit?'
    });

    if (choice) {
      event.preventDefault();
    }
  }
  
  contextBridgedContentHasChanged () {
    return this.contextBridgedContent.current !== this.contextBridgedContent.original;
  }
  
  updateContextBridgedContent (orginal: string, current: string) {
    this.contextBridgedContent.original = orginal;
    this.contextBridgedContent.current = current;
  }
  
  resetContextBridgedContent () {
    this.contextBridgedContent.original = null;
    this.contextBridgedContent.current = null;
  }
}
