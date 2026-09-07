/*======================================
AEGIS COMMAND BAR v1.0.0
========================================
Chat-style command interface for AEGIS.

Supports:

1. Direct AEGIS commands
   /weather refresh
   /system status
   /module method arg1 arg2

2. Built-in commands
   /help
   /clear
   /modules

3. Natural-language commands
   "What's the weather?"
   "Refresh everything."

   These are passed to an AI handler through:
   CommandBar.setAIHandler(fn)

The AI handler can use:
   context.run(module, method, ...args)

This module registers with Aegis Core and is
initialized automatically by Aegis.initModules().
======================================*/

(function (global) {

    "use strict";


    const CommandBar = {

        name: "commandBar",

        version: "1.0.0",


        // ==================================
        // STATE
        // ==================================

        _isOpen: false,

        _history: [],

        _historyIndex: -1,

        _aiHandler: null,

        _els: {},

        _commands: new Map(),

        _initialized: false,


        // ==================================
        // LIFECYCLE
        // ==================================

        init() {

            if (this._initialized) {
                return this;
            }

            this._buildDOM();

            this._bindGlobalShortcut();

            this._registerBuiltinCommands();

            this._initialized = true;

            this._broadcast(
                "commandBar:ready",
                {
                    version: this.version
                }
            );

            console.log(
                `✓ Command Bar v${this.version} initialized`
            );

            return this;
        },


        refresh() {

            if (!this._initialized) {
                return;
            }

            this._renderSuggestions(
                this._els.input.value
            );

        },


        shutdown() {

            if (!this._initialized) {
                return;
            }

            this.close();

            if (this._els.root) {
                this._els.root.remove();
            }

            if (this._els.fab) {
                this._els.fab.remove();
            }

            document.removeEventListener(
                "keydown",
                this._onGlobalKeydown
            );

            this._initialized = false;

        },


        status() {

            return {

                open: this._isOpen,

                historyLength:
                    this._history.length,

                aiConnected:
                    !!this._aiHandler,

                initialized:
                    this._initialized

            };

        },


        // ==================================
        // PUBLIC API
        // ==================================

        setAIHandler(fn) {

            if (typeof fn !== "function") {

                console.error(
                    "CommandBar.setAIHandler() requires a function."
                );

                return false;

            }

            this._aiHandler = fn;

            this._broadcast(
                "commandBar:aiConnected",
                {}
            );

            return true;
        },


        registerCommand(keyword, description, run) {

            if (
                typeof keyword !== "string" ||
                typeof run !== "function"
            ) {

                console.error(
                    "Invalid command registration."
                );

                return false;
            }


            const key =
                keyword
                    .replace(/^\//, "")
                    .toLowerCase();


            this._commands.set(
                key,
                {
                    desc: description || "",
                    run: run
                }
            );


            return true;
        },


        open() {

            if (!this._initialized) {
                return;
            }

            this._isOpen = true;

            this._els.root.classList.add(
                "cmdbar-open"
            );

            this._els.input.value = "";

            this._els.output.innerHTML = "";

            this._historyIndex =
                this._history.length;

            this._renderSuggestions("");

            this._els.input.focus();


            this._broadcast(
                "commandBar:opened",
                {}
            );

        },


        close() {

            if (!this._isOpen) {
                return;
            }

            this._isOpen = false;

            this._els.root.classList.remove(
                "cmdbar-open"
            );

            this._historyIndex =
                this._history.length;


            this._broadcast(
                "commandBar:closed",
                {}
            );

        },


        toggle() {

            if (this._isOpen) {
                this.close();
            } else {
                this.open();
            }

        },


        // ==================================
        // DOM
        // ==================================

        _buildDOM() {

            const root =
                document.createElement("div");

            root.className =
                "cmdbar-overlay";


            root.innerHTML = `

                <div
                    class="cmdbar-panel"
                    role="dialog"
                    aria-label="AEGIS Command Bar"
                >

                    <div class="cmdbar-inputRow">

                        <span class="cmdbar-prompt">
                            >
                        </span>

                        <input
                            class="cmdbar-input"
                            type="text"
                            placeholder="Ask AEGIS or type /help..."
                            autocomplete="off"
                            spellcheck="false"
                            aria-label="AEGIS command input"
                        />

                    </div>


                    <div class="cmdbar-suggestions"></div>


                    <div
                        class="cmdbar-output"
                        aria-live="polite"
                    ></div>

                </div>

            `;


            document.body.appendChild(root);


            this._els.root =
                root;

            this._els.input =
                root.querySelector(
                    ".cmdbar-input"
                );

            this._els.suggestions =
                root.querySelector(
                    ".cmdbar-suggestions"
                );

            this._els.output =
                root.querySelector(
                    ".cmdbar-output"
                );


            // Close when clicking background

            root.addEventListener(
                "mousedown",
                (event) => {

                    if (
                        event.target === root
                    ) {

                        this.close();

                    }

                }
            );


            // Floating button

            const fab =
                document.createElement("button");

            fab.className =
                "cmdbar-fab";

            fab.type =
                "button";

            fab.setAttribute(
                "aria-label",
                "Open AEGIS Command Bar"
            );

            fab.textContent =
                ">_";


            fab.addEventListener(
                "click",
                () => this.toggle()
            );


            document.body.appendChild(fab);

            this._els.fab =
                fab;


            // Input

            this._els.input.addEventListener(
                "keydown",
                (event) =>
                    this._onInputKeydown(event)
            );


            this._els.input.addEventListener(
                "input",
                (event) =>
                    this._renderSuggestions(
                        event.target.value
                    )
            );


            this._injectStyles();

        },


        _injectStyles() {

            if (
                document.getElementById(
                    "aegis-commandbar-styles"
                )
            ) {
                return;
            }


            const style =
                document.createElement("style");

            style.id =
                "aegis-commandbar-styles";


            style.textContent = `

                .cmdbar-overlay {

                    position: fixed;

                    inset: 0;

                    display: none;

                    align-items: flex-start;

                    justify-content: center;

                    padding-top: 12vh;

                    background:
                        rgba(0, 0, 0, 0.50);

                    backdrop-filter:
                        blur(4px);

                    z-index: 9999;

                }


                .cmdbar-overlay.cmdbar-open {

                    display: flex;

                }


                .cmdbar-panel {

                    width:
                        min(700px, 92vw);

                    background:
                        #171a21;

                    color:
                        #e6e9ef;

                    border:
                        1px solid
                        rgba(255,255,255,0.10);

                    border-radius:
                        12px;

                    box-shadow:
                        0 20px 60px
                        rgba(0,0,0,0.55);

                    overflow:
                        hidden;

                    font-family:
                        system-ui,
                        sans-serif;

                }


                .cmdbar-inputRow {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        12px;

                    padding:
                        16px 18px;

                    border-bottom:
                        1px solid
                        rgba(255,255,255,0.08);

                }


                .cmdbar-prompt {

                    color:
                        #7dd3fc;

                    font-weight:
                        700;

                    font-size:
                        18px;

                }


                .cmdbar-input {

                    flex:
                        1;

                    background:
                        transparent;

                    border:
                        none;

                    outline:
                        none;

                    color:
                        inherit;

                    font-size:
                        16px;

                }


                .cmdbar-input::placeholder {

                    color:
                        #777f8d;

                }


                .cmdbar-suggestions {

                    max-height:
                        220px;

                    overflow-y:
                        auto;

                }


                .cmdbar-suggestion {

                    padding:
                        10px 18px;

                    display:
                        flex;

                    justify-content:
                        space-between;

                    gap:
                        16px;

                    cursor:
                        pointer;

                    font-size:
                        13px;

                }


                .cmdbar-suggestion:hover {

                    background:
                        rgba(255,255,255,0.06);

                }


                .cmdbar-suggestion .kw {

                    color:
                        #7dd3fc;

                    font-weight:
                        600;

                }


                .cmdbar-suggestion .desc {

                    color:
                        #8b93a1;

                }


                .cmdbar-output {

                    padding:
                        12px 18px;

                    max-height:
                        300px;

                    overflow-y:
                        auto;

                    border-top:
                        1px solid
                        rgba(255,255,255,0.06);

                }


                .cmdbar-output:empty {

                    display:
                        none;

                }


                .cmdbar-line {

                    padding:
                        5px 0;

                    white-space:
                        pre-wrap;

                    line-height:
                        1.5;

                }


                .cmdbar-line.error {

                    color:
                        #f87171;

                }


                .cmdbar-line.ai {

                    color:
                        #a5b4fc;

                }


                .cmdbar-line.success {

                    color:
                        #86efac;

                }


                .cmdbar-fab {

                    position:
                        fixed;

                    right:
                        20px;

                    bottom:
                        20px;

                    width:
                        52px;

                    height:
                        52px;

                    border-radius:
                        50%;

                    border:
                        1px solid
                        rgba(255,255,255,0.12);

                    background:
                        #171a21;

                    color:
                        #7dd3fc;

                    font-size:
                        16px;

                    font-weight:
                        700;

                    cursor:
                        pointer;

                    z-index:
                        9998;

                    box-shadow:
                        0 6px 20px
                        rgba(0,0,0,0.40);

                }


                .cmdbar-fab:active {

                    transform:
                        scale(0.94);

                }


                @media (max-width: 640px) {

                    .cmdbar-overlay {

                        padding-top:
                            0;

                        align-items:
                            flex-end;

                    }


                    .cmdbar-panel {

                        width:
                            100%;

                        border-radius:
                            14px 14px 0 0;

                        max-height:
                            80dvh;

                    }


                    .cmdbar-input {

                        font-size:
                            16px;

                    }


                    .cmdbar-fab {

                        width:
                            56px;

                        height:
                            56px;

                    }

                }

            `;


            document.head.appendChild(style);

        },


        // ==================================
        // KEYBOARD
        // ==================================

       _bindGlobalShortcut() {

            this._onGlobalKeydown = (event) => {

                // Ctrl + K on Windows/Linux
                // Cmd + K on Mac
                if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key.toLowerCase() === "k"
                ) {

                    event.preventDefault();
                    event.stopPropagation();

                    this.toggle();

                    return;
                }

                // Escape closes the Command Bar
                if (
                    event.key === "Escape" &&
                    this._isOpen
                ) {

                    event.preventDefault();

                    this.close();

                }

            };

            document.addEventListener(
                "keydown",
                this._onGlobalKeydown,
                true
            );

        },


        _onInputKeydown(event) {

            if (event.key === "Enter") {

                event.preventDefault();

                this._submit(
                    this._els.input.value
                );

                return;

            }


            if (event.key === "ArrowUp") {

                event.preventDefault();

                this._navigateHistory(-1);

                return;

            }


            if (event.key === "ArrowDown") {

                event.preventDefault();

                this._navigateHistory(1);

            }

        },


        // ==================================
        // HISTORY
        // ==================================

        _navigateHistory(direction) {

            if (!this._history.length) {
                return;
            }


            this._historyIndex +=
                direction;


            this._historyIndex =
                Math.max(
                    0,
                    Math.min(
                        this._historyIndex,
                        this._history.length
                    )
                );


            if (
                this._historyIndex ===
                this._history.length
            ) {

                this._els.input.value =
                    "";

            } else {

                this._els.input.value =
                    this._history[
                        this._historyIndex
                    ];

            }

        },


        // ==================================
        // SUGGESTIONS
        // ==================================

        _renderSuggestions(value) {

            const box =
                this._els.suggestions;


            box.innerHTML =
                "";


            if (
                !value.startsWith("/")
            ) {

                return;

            }


            const partial =
                value
                    .slice(1)
                    .toLowerCase();


            const matches =
                [...this._commands.entries()]
                    .filter(
                        ([keyword]) =>
                            keyword.startsWith(partial)
                    );


            matches
                .slice(0, 8)
                .forEach(
                    ([keyword, command]) => {

                        const row =
                            document.createElement(
                                "div"
                            );


                        row.className =
                            "cmdbar-suggestion";


                        const keywordSpan =
                            document.createElement(
                                "span"
                            );

                        keywordSpan.className =
                            "kw";

                        keywordSpan.textContent =
                            `/${keyword}`;


                        const descSpan =
                            document.createElement(
                                "span"
                            );

                        descSpan.className =
                            "desc";

                        descSpan.textContent =
                            command.desc;


                        row.appendChild(
                            keywordSpan
                        );

                        row.appendChild(
                            descSpan
                        );


                        row.addEventListener(
                            "click",
                            () => {

                                this._els.input.value =
                                    `/${keyword} `;

                                this._els.input.focus();

                            }
                        );


                        box.appendChild(row);

                    }
                );

        },


        // ==================================
        // SUBMISSION
        // ==================================

        async _submit(rawText) {

            const text =
                rawText.trim();


            if (!text) {
                return;
            }


            this._history.push(text);

            this._historyIndex =
                this._history.length;


            this._els.input.value =
                "";

            this._renderSuggestions("");


            if (
                text.startsWith("/")
            ) {

                await this._runDirectCommand(
                    text.slice(1)
                );

            } else {

                await this._runAICommand(
                    text
                );

            }

        },


        // ==================================
        // DIRECT COMMANDS
        // ==================================

        async _runDirectCommand(body) {

            const parts =
                body.split(/\s+/);


            const keyword =
                parts.shift()
                    ?.toLowerCase();


            if (!keyword) {
                return;
            }


            const args =
                parts;


            // Registered local command

            const local =
                this._commands.get(
                    keyword
                );


            if (local) {

                try {

                    const result =
                        await local.run(args);


                    if (
                        result !== undefined &&
                        result !== null &&
                        result !== ""
                    ) {

                        this._printLine(
                            result,
                            "success"
                        );

                    }

                } catch (error) {

                    this._printLine(
                        `Error running /${keyword}: ${error.message}`,
                        "error"
                    );

                }

                return;

            }


            // AEGIS module command
            //
            // /moduleName method arg1 arg2

            const moduleName =
                keyword;


            const method =
                args.shift();


            if (
                !moduleName ||
                !method
            ) {

                this._printLine(
                    "Usage: /moduleName method arg1 arg2",
                    "error"
                );

                return;

            }


            if (
                !global.Aegis ||
                typeof global.Aegis.run !== "function"
            ) {

                this._printLine(
                    "AEGIS Core is unavailable.",
                    "error"
                );

                return;

            }


            try {

                const result =
                    await global.Aegis.run(
                        moduleName,
                        method,
                        ...args
                    );


                if (
                    result !== undefined &&
                    result !== null
                ) {

                    this._printLine(
                        result,
                        "success"
                    );

                } else {

                    this._printLine(
                        `✓ ${moduleName}.${method}() executed`,
                        "success"
                    );

                }

            } catch (error) {

                this._printLine(
                    `Error: ${error.message}`,
                    "error"
                );

            }

        },


        // ==================================
        // AI
        // ==================================

        async _runAICommand(text) {

            this._printLine(
                `You: ${text}`
            );


            if (!this._aiHandler) {

                this._printLine(
                    "AI handler is not connected.",
                    "error"
                );

                return;

            }


            try {

                const response =
                    await this._aiHandler(
                        text,
                        {

                            // Allow AI layer
                            // to execute AEGIS commands.

                            run:
                                (
                                    moduleName,
                                    method,
                                    ...args
                                ) => {

                                    return global.Aegis?.run(
                                        moduleName,
                                        method,
                                        ...args
                                    );

                                },


                            // Give AI access
                            // to module information.

                            getModule:
                                (name) =>
                                    global.Aegis?.getModule(
                                        name
                                    ),


                            // Give AI access
                            // to all modules.

                            modules:
                                () =>
                                    global.Aegis?.modules || {}

                        }
                    );


                if (
                    response !== undefined &&
                    response !== null
                ) {

                    this._printLine(
                        response,
                        "ai"
                    );

                }

            } catch (error) {

                this._printLine(
                    `AI error: ${error.message}`,
                    "error"
                );

            }

        },


        // ==================================
        // OUTPUT
        // ==================================

        _printLine(text, className = "") {

            const line =
                document.createElement(
                    "div"
                );


            line.className =
                `cmdbar-line ${className}`
                    .trim();


            if (
                typeof text === "string"
            ) {

                line.textContent =
                    text;

            } else {

                try {

                    line.textContent =
                        JSON.stringify(
                            text,
                            null,
                            2
                        );

                } catch {

                    line.textContent =
                        String(text);

                }

            }


            this._els.output.appendChild(
                line
            );


            this._els.output.scrollTop =
                this._els.output.scrollHeight;

        },


        // ==================================
        // BUILT-IN COMMANDS
        // ==================================

        _registerBuiltinCommands() {

            this.registerCommand(
                "help",
                "Show available commands",
                () => {

                    return [
                        "AEGIS COMMANDS",
                        "",
                        ...[
                            ...this._commands.entries()
                        ].map(
                            ([keyword, command]) =>
                                `/${keyword} — ${command.desc}`
                        ),
                        "",
                        "MODULE COMMANDS",
                        "/moduleName method arg1 arg2"
                    ].join("\n");

                }
            );


            this.registerCommand(
                "clear",
                "Clear command output",
                () => {

                    this._els.output.innerHTML =
                        "";

                }
            );


            this.registerCommand(
                "modules",
                "List registered AEGIS modules",
                () => {

                    if (
                        !global.Aegis
                    ) {

                        return "AEGIS Core unavailable.";

                    }


                    const modules =
                        Object.values(
                            global.Aegis.modules
                        );


                    if (!modules.length) {

                        return "No modules registered.";

                    }


                    return modules
                        .map(
                            module =>
                                `${module.name} v${module.version} — ${module.status}`
                        )
                        .join("\n");

                }
            );


            this.registerCommand(
                "status",
                "Show AEGIS system status",
                () => {

                    if (
                        !global.Aegis
                    ) {

                        return "AEGIS Core unavailable.";

                    }


                    const modules =
                        Object.values(
                            global.Aegis.modules
                        );


                    return modules
                        .map(
                            module =>
                                `${module.name}: ${module.status}`
                        )
                        .join("\n");

                }
            );

        },


        // ==================================
        // EVENTS
        // ==================================

        _broadcast(eventName, data = {}) {

            if (
                global.Aegis &&
                typeof global.Aegis.broadcast ===
                    "function"
            ) {

                global.Aegis.broadcast(
                    eventName,
                    data
                );

            }

        }

    };


    // ==================================
    // REGISTER WITH AEGIS CORE
    // ==================================

    if (
        global.Aegis &&
        typeof global.Aegis.register ===
            "function"
    ) {

        global.Aegis.register(
            CommandBar.name,
            CommandBar
        );

    } else {

        console.error(
            "AEGIS Core must load before commandBar.js"
        );

        global.CommandBar =
            CommandBar;

    }


})(window);