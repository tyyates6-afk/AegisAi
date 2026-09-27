/*======================================
        AEGIS BRAIN v1.0.0
======================================
OpenAI-powered conversational core for AEGIS.

WHAT IT DOES
- Connects to the Command Bar through
  CommandBar.setAIHandler(), so anything typed
  (not starting with /) is answered by OpenAI.
- Keeps conversation history per session.
- Can operate AEGIS modules through OpenAI
  function calling (e.g. "refresh the weather"
  runs the weather module, "system status"
  lists module health).
- Speaks replies through the voice module.
  Toggle with: Aegis.run("brain","setSpeakReplies",false)

SETUP
1. Save this file as JS/brain.js
2. In index.html, add AFTER commandBar.js:
     <script src="JS/brain.js"></script>
3. In the browser console (once):
     localStorage.setItem("openAiApiKey", "sk-...")
   Optional model override:
     localStorage.setItem("openAiModel", "gpt-4o-mini")

The key is never hardcoded. It lives in
localStorage and only ever goes to
api.openai.com — same pattern the voice
module already uses for ElevenLabs.

This module registers with Aegis Core and is
initialized automatically by Aegis.initModules().
======================================*/

(function (global) {

    "use strict";


    const OPENAI_URL =
        "https://api.openai.com/v1/chat/completions";


    const Brain = {

        name: "brain",

        version: "1.0.0",


        // ==================================
        // STATE
        // ==================================

        _history: [],

        _busy: false,

        _connected: false,


        _config: {

            model:
                localStorage.getItem("openAiModel") ||
                "gpt-4o-mini",

            temperature: 0.7,

            // Max messages kept (not counting
            // the system prompt).
            maxHistory: 20,

            speakReplies: true,

            // Max back-and-forth tool rounds
            // per user message.
            maxToolRounds: 5

        },


        // ==================================
        // LIFECYCLE
        // ==================================

        init() {

            this._connect();

            // If the command bar is not up yet,
            // connect when it announces itself.
            if (
                global.Aegis &&
                typeof global.Aegis.listen ===
                    "function"
            ) {

                global.Aegis.listen(
                    "commandBar:ready",
                    () => this._connect()
                );

            }

            console.log(
                "✓ Brain v" +
                this.version +
                " initialized"
            );

            return this;
        },


        _connect() {

            if (
                !global.Aegis ||
                this._connected
            ) {

                return this._connected;
            }


            const bar =
                global.Aegis.getModule(
                    "commandBar"
                );


            if (
                !bar ||
                !bar.api ||
                typeof bar.api.setAIHandler !==
                    "function"
            ) {

                return false;
            }


            const ok =
                bar.api.setAIHandler(
                    (text, context) =>
                        this._handle(text, context)
                );


            if (ok) {

                this._connected = true;

                console.log(
                    "✓ Brain connected to Command Bar"
                );

            }


            return ok;
        },


        // ==================================
        // PUBLIC API
        // ==================================

        getApiKey() {

            return (
                localStorage.getItem(
                    "openAiApiKey"
                ) || ""
            );

        },


        setApiKey(key) {

            localStorage.setItem(
                "openAiApiKey",
                key
            );

            return "OpenAI API key saved.";
        },


        setModel(model) {

            this._config.model = model;

            localStorage.setItem(
                "openAiModel",
                model
            );

            return (
                "Model set to " + model + "."
            );
        },


        setSpeakReplies(on) {

            this._config.speakReplies =
                !!on;

            return (
                "Voice replies " +
                (
                    this._config.speakReplies
                        ? "on."
                        : "off."
                )
            );
        },


        clearHistory() {

            this._history = [];

            return (
                "Conversation history cleared."
            );
        },


        status() {

            return {

                model:
                    this._config.model,

                historyLength:
                    this._history.length,

                keySet:
                    !!this.getApiKey(),

                commandBarConnected:
                    this._connected,

                speakReplies:
                    this._config.speakReplies

            };
        },


        // Ask the brain directly, outside the
        // command bar (e.g. from the voice
        // widget or a quick-action button).
        ask(text) {

            const context = {

                run: (
                    moduleName,
                    method,
                    ...args
                ) =>
                    global.Aegis
                        ? global.Aegis.run(
                            moduleName,
                            method,
                            ...args
                        )
                        : undefined,

                getModule: (name) =>
                    global.Aegis
                        ? global.Aegis.getModule(
                            name
                        )
                        : undefined,

                modules: () =>
                    global.Aegis
                        ? global.Aegis.modules
                        : {}

            };

            return this._handle(
                text,
                context
            );
        },


        // ==================================
        // CONVERSATION
        // ==================================

        async _handle(text, context) {

            if (!this.getApiKey()) {

                return [
                    "No OpenAI API key is set.",
                    "In the browser console, run:",
                    'localStorage.setItem("openAiApiKey", "sk-...")',
                    "then reload and ask me again."
                ].join("\n");

            }


            if (this._busy) {

                return (
                    "One moment — still thinking " +
                    "about the last one."
                );

            }


            this._busy = true;


            try {

                this._history.push({

                    role: "user",
                    content: text

                });

                this._trimHistory();


                const reply =
                    await this._think(context);


                this._history.push({

                    role: "assistant",
                    content: reply

                });

                this._trimHistory();


                if (
                    this._config.speakReplies &&
                    reply
                ) {

                    this._speak(reply);

                }


                return reply;

            } catch (error) {

                console.error(
                    "Brain error:",
                    error
                );

                return (
                    "Something went wrong " +
                    "reaching OpenAI: " +
                    error.message
                );

            } finally {

                this._busy = false;

            }
        },


        async _think(context) {

            const messages = [

                this._systemMessage(),

                ...this._history

            ];


            for (
                let round = 0;
                round <
                this._config.maxToolRounds;
                round++
            ) {

                const data =
                    await this._callOpenAI(
                        messages
                    );


                const msg =
                    data.choices &&
                    data.choices[0] &&
                    data.choices[0].message;


                if (!msg) {

                    throw new Error(
                        "Empty response from OpenAI."
                    );

                }


                messages.push(msg);


                const toolCalls =
                    msg.tool_calls || [];


                if (!toolCalls.length) {

                    return msg.content || "";
                }


                for (
                    const call of toolCalls
                ) {

                    const result =
                        await this._runTool(
                            call,
                            context
                        );


                    messages.push({

                        role: "tool",

                        tool_call_id:
                            call.id,

                        content: result

                    });
                }
            }


            // Out of tool rounds — ask for a
            // final answer with no more tools.
            const data =
                await this._callOpenAI(
                    messages
                );


            const msg =
                data.choices &&
                data.choices[0] &&
                data.choices[0].message;


            return (
                (msg && msg.content) || ""
            );
        },


        async _callOpenAI(messages) {

            const response =
                await fetch(OPENAI_URL, {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            this.getApiKey()

                    },

                    body: JSON.stringify({

                        model:
                            this._config.model,

                        temperature:
                            this._config
                                .temperature,

                        messages: messages,

                        tools:
                            this._tools()

                    })

                });


            if (!response.ok) {

                const errText =
                    await response.text();

                throw new Error(
                    "OpenAI " +
                    response.status +
                    ": " +
                    errText.slice(0, 200)
                );
            }


            return response.json();
        },


        _trimHistory() {

            const max =
                this._config.maxHistory;

            while (
                this._history.length > max
            ) {

                this._history.shift();

            }
        },


        _speak(text) {

            if (!global.Aegis) {
                return;
            }

            try {

                global.Aegis.run(
                    "voice",
                    "speak",
                    text
                );

            } catch (error) {

                console.warn(
                    "Brain could not speak:",
                    error
                );

            }
        },


        _systemMessage() {

            const now = new Date();

            return {

                role: "system",

                content: [

                    "You are AEGIS — Always Evolving " +
                    "General Intelligence Service.",

                    "You are Ty's personal AI assistant, " +
                    "in the spirit of Jarvis: capable, " +
                    "calm, a little witty, never robotic.",

                    "Keep replies short and conversational " +
                    "unless Ty asks for detail. He reads " +
                    "on his phone.",

                    "You run inside Ty's AEGIS dashboard app. " +
                    "You can act on the app through tools: use " +
                    "aegis_run to operate modules (weather, " +
                    "reminders, calendar, bible, etc.) and " +
                    "aegis_status to see what is online.",

                    "When you use a tool, briefly say what " +
                    "you did in plain words.",

                    "Current date and time: " +
                    now.toLocaleString() +
                    "."

                ].join(" ")

            };
        },


        // ==================================
        // TOOLS (OpenAI function calling)
        // ==================================

        _tools() {

            return [

                {
                    type: "function",

                    function: {

                        name: "aegis_run",

                        description:
                            "Run a command on an AEGIS " +
                            "module. Use this when Ty asks " +
                            "AEGIS to DO something (refresh " +
                            "the weather, check reminders, " +
                            "report system status, etc).",

                        parameters: {

                            type: "object",

                            properties: {

                                module: {

                                    type: "string",

                                    description:
                                        "Module name, e.g. weather, " +
                                        "reminders, calendar, bible"

                                },

                                method: {

                                    type: "string",

                                    description:
                                        "Method to call on the module, " +
                                        "e.g. refresh, status"

                                },

                                args: {

                                    type: "array",

                                    items: {
                                        type: "string"
                                    },

                                    description:
                                        "Arguments for the method"

                                }

                            },

                            required: [
                                "module",
                                "method"
                            ]

                        }

                    }
                },

                {
                    type: "function",

                    function: {

                        name: "aegis_status",

                        description:
                            "List the registered AEGIS " +
                            "modules and their online status.",

                        parameters: {

                            type: "object",

                            properties: {}

                        }

                    }
                }

            ];
        },


        async _runTool(call, context) {

            const name =
                call.function &&
                call.function.name;


            let args = {};

            try {

                args = JSON.parse(
                    call.function.arguments ||
                    "{}"
                );

            } catch (error) {

                return (
                    "Bad arguments: " +
                    error.message
                );
            }


            try {

                if (
                    name === "aegis_status"
                ) {

                    const modules =
                        context.modules
                            ? context.modules()
                            : {};


                    const lines =
                        Object.values(modules)
                            .map(
                                (m) =>
                                    m.name +
                                    " v" +
                                    m.version +
                                    " — " +
                                    m.status
                            );


                    return (
                        lines.join("\n") ||
                        "No modules registered."
                    );
                }


                if (
                    name === "aegis_run"
                ) {

                    const result =
                        await context.run(
                            args.module,
                            args.method,
                            ...(args.args || [])
                        );


                    if (
                        result === undefined ||
                        result === null
                    ) {

                        return "Done.";
                    }


                    return typeof result ===
                        "string"
                        ? result
                        : JSON.stringify(
                            result
                        );
                }


                return (
                    "Unknown tool: " + name
                );

            } catch (error) {

                return (
                    "Tool error: " +
                    error.message
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
            Brain.name,
            Brain
        );

    } else {

        console.error(
            "AEGIS Core must load before brain.js"
        );

        global.AegisBrain = Brain;

    }


})(window);
