import { Modal, Dropdown } from 'bootstrap';
import { KeyMod, KeyCode } from 'monaco-editor/esm/vs/editor/editor.api';
import { commands, alertblocks, codeblocks } from './mappings/commands';

/**
 * Command Handler
 */
class CommandHandler {
    constructor (instance, register = false) {
        this.instance = instance;
        this.settings = new Modal(document.getElementById('settings'));
        this.alerts = new Dropdown(document.getElementById('alertMenuButton'));
        this.codeblocks = new Dropdown(document.getElementById('codeBlockMenuButton'));

        if (register) {
            this.register();
        }
    }

    register () {
        this.instance.onKeyDown((e) => {
            if (e.ctrlKey && e.keyCode === 42 /* L */) {
                this.alerts.toggle();
            }

            if (e.ctrlKey && e.keyCode === 41 /* K */) {
                this.codeblocks.toggle();
            }

            this.instance.focus();
        });

        for (const cmd in commands) {
            if (Object.prototype.hasOwnProperty.call(commands[cmd], 'op')) {
                commands[cmd].run = () => this.execute(commands[cmd].op);
            } else {
                commands[cmd].run = () => this[cmd]();
            }

            this.instance.addAction(commands[cmd]);
        }

        this.instance.addAction({
            id: 'settings',
            label: 'Open Settings Dialog',
            keybindings: [KeyMod.CtrlCmd | KeyCode.Semicolon],
            run: () => {
                this.settings.toggle();
            }
        });

        for (const block of alertblocks) {
            this.instance.addAction({
                id: `alert-${block.type}`,
                label: `Insert ${block.type} Alert`,
                keybindings: [KeyMod.chord(
                    KeyMod.CtrlCmd | KeyCode.KeyL,
                    KeyCode[`Key${block.key}`]
                )],
                run: () => {
                    this.alert(block.type.toLowerCase());
                    this.alerts.hide();
                }
            });
        }

        for (const block of codeblocks) {
            this.instance.addAction({
                id: `codeblock-${block.type}`,
                label: `Insert ${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Codeblock`,
                keybindings: [KeyMod.chord(
                    KeyMod.CtrlCmd | KeyCode.KeyK,
                    KeyCode[`Key${block.key}`]
                )],
                run: () => {
                    this.codeblock(block.type.toLowerCase());
                    this.codeblocks.hide();
                }
            });
        }

        // Map monaco editor commands to editor UI buttons (e.g. bold, alertblock etc.)
        const toolbarButtons = document.getElementById('editor-functions').querySelectorAll('button');
        if (toolbarButtons) {
            toolbarButtons.forEach((btn) => {
                btn.addEventListener('click', (event) => {
                    const target = event.currentTarget || event.target;
                    if (Object.prototype.hasOwnProperty.call(target.dataset, 'op')) {
                        const { op } = target.dataset;
                        target.dataset.syntax && !(commands[op] instanceof Function)
                            // If function contains data-syntax
                            ? this.execute(target.dataset.syntax)
                            // Otherwise
                            : this[op](target);

                        this.instance.focus();
                    }
                });
            });
        }
    }

    execute (op) {
        this.do(op + this.model() + op);
    }

    do (text) {
        this.instance.executeEdits(null, [{
            range: this.instance.getSelection(),
            text,
            forceMoveMarkers: true
        }]);
    }

    model () {
        return this.instance.getModel().getValueInRange(this.instance.getSelection());
    }

    unorderedList () {
        this.do(this.model().replace(/^[a-zA-Z]+?/gm, (match) => `- ${match}`));
    }

    orderedList () {
        let i = 0;
        this.do(this.model().replace(/^[a-zA-Z]+?/gm, (match) => `${++i}. ${match}`));
    }

    orderedListToTaskList () {
        let i = 0;
        this.do(this.model().replace(
            /^([0-9]+)\.\s+(?!\[)/gm,
            (match) => `${++i}. [ ] ${match.replace(/^([0-9]+)\.\s+(?!\[)/, '')}`)
        );
    }

    alert (params, content = null) {
        const type = params.dataset ? params.dataset.type : params;
        content = content || this.model();
        this.do('::: ' + type + '\n' + content + '\n:::');
    }

    codeblock (params, content = null) {
        const language = params.dataset ? params.dataset.language : params;
        content = content || this.model();
        this.do('```' + language + '\n' + content + '\n```');
    }
}

export default CommandHandler;
