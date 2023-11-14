import './mappings/icons';
import Split from 'split.js';
import { Editor } from './lib/Editor';
import { EditorDispatcher } from './events/EditorDispatcher';
import { Command } from './lib/Command';
import { Settings } from './lib/Settings';
import { Bridge } from './lib/Bridge';
import { setupTooltips } from './dom';
import { getExecutionBridge } from './util';

// The bi-directional synchronous bridge to the main execution context.
// Exposed on the window object through the preloader.
const api = getExecutionBridge();

// App mode (desktop or web).
const mode = api !== 'web' ? 'desktop' : 'web';

// Create new custom event dispatcher.
const dispatcher = new EditorDispatcher();

// Create a new editor.
const mkeditor = new Editor(mode, dispatcher);
mkeditor.create({ watch: true });

// Get the editor model.
const model = mkeditor.model;

if (model) {
  // Register new command handler for the model to provide and handle editor
  // commands and actions (e.g. bold, alertblock etc.)
  mkeditor.provide('command', new Command(mode, model, dispatcher));

  // Register a new settings handler for the model to provide editor settings.
  mkeditor.provide('settings', new Settings(mode, model, dispatcher));

  // If running within electron app, register IPC handler for communication between
  // main and renderer execution contexts.
  if (api !== 'web') {    
    // Create a new bridge communication handler.
    const bridge = new Bridge(api, model, dispatcher);
    
    // Attach providers.
    bridge.provide('settings', mkeditor.providers.settings);
    bridge.provide('command', mkeditor.providers.command);
    mkeditor.provide('bridge', bridge);
  }

  // Setup application tooltips.
  setupTooltips();
  
  // Implement draggable splitter.
  Split(['#editor-split', '#preview-split'], {
    onDrag () { model.layout(); }
  });
}