/*======================================
        AEGIS BRAIN v3.0.0
======================================
Triple-provider conversational core for AEGIS.

WHAT IT DOES
- Connects to the Command Bar through
  CommandBar.setAIHandler(), so anything typed
  (not starting with /) is answered by the
  active provider.
- Keeps conversation history per session.
- Can operate AEGIS modules through function
  calling (e.g. "refresh the weather"
  runs the weather module, "system status"
  lists module health).
- Speaks replies through the voice module.
  Toggle with: Aegis.run("brain","setSpeakReplies",false)

PROVIDERS (v3.0.0)
- openai (default): direct browser calls to
  api.openai.com. Key in localStorage.
- claude: routes through your Supabase edge
  function (claude-chat). The Anthropic key
  lives server-side in Supabase — the browser
  only ever sees your function URL.
- gemini: routes through your Supabase edge
  function (gemini-chat). The Google key
  lives server-side in Supabase — the browser
  only ever sees your function URL. Free tier
  via Google AI Studio (no credit card).
  Multi-user option: each user can paste their
  own free API key (Settings > Brain) and the
  browser calls Google directly — their key,
  their quota, their data.

Switch in Settings > Brain, or:
  Aegis.run("brain", "setProvider", "gemini")

SETUP
1. Save this file as JS/brain.js
2. In index.html, add AFTER commandBar.js:
     <script src="JS/brain.js"></script>
3. Add brainSettings.js the same way for the
   Settings UI (optional but recommended).
4. OpenAI: paste your key in Settings > Brain.
5. Claude: deploy supabase/functions/claude-chat,
   set ANTHROPIC_API_KEY as a Supabase secret,
   paste the function URL in Settings > Brain.
6. Gemini: deploy supabase/functions/gemini-chat,
   set GEMINI_API_KEY as a Supabase secret,
   paste the function URL in Settings > Brain.
   Other users can instead paste their own free
   Gemini key in Settings > Brain (no proxy
   needed for them).

The OpenAI key lives in localStorage and only
ever goes to api.openai.com — same pattern the
voice module already uses for ElevenLabs.

This module registers with Aegis Core and is
initialized automatically by Aegis.initModules().
======================================*/

(function (global) {

    "use strict";


    const OPENAI_URL =
        "https://api.openai.com/v1/chat/completions";


    const Brain = {

        name: "brain",

        version: "3.0.0",


        // ==================================
        // STATE
        // ==================================

        _history: [],

        _busy: false,

        _connected: false,


        _config: {

            provider:
                localStorage.getItem("brainProvider") ||
                "openai",

            model:
                localStorage.getItem("openAiModel") ||
                "gpt-4o-mini",

            claudeModel:
                localStorage.getItem("claudeModel") ||
                "claude-sonnet-4-5",

            claudeMaxTokens: 1024,

            geminiModel:
                localStorage.getItem("geminiModel") ||
                "gemini-2.5-flash",

            geminiMaxTokens: 1024,

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


        getProvider() {

            return this._config.provider;
        },


        setProvider(provider) {

            const p =
                provider === "claude"
                    ? "claude"
                    : provider === "gemini"
                        ? "gemini"
                        : "openai";

            if (p !== this._config.provider) {

                this._config.provider = p;

                localStorage.setItem(
                    "brainProvider",
                    p
                );

                // History formats differ per
                // provider — start fresh.
                this._history = [];
            }

            return (
                "Brain provider set to " +
                p +
                "."
            );
        },


        getClaudeProxyUrl() {

            return (
                localStorage.getItem(
                    "claudeProxyUrl"
                ) || ""
            );
        },


        setClaudeProxyUrl(url) {

            localStorage.setItem(
                "claudeProxyUrl",
                url
            );

            return "Claude proxy URL saved.";
        },


        setClaudeModel(model) {

            this._config.claudeModel = model;

            localStorage.setItem(
                "claudeModel",
                model
            );

            return (
                "Claude model set to " +
                model +
                "."
            );
        },


        getGeminiProxyUrl() {

            return (
                localStorage.getItem(
                    "geminiProxyUrl"
                ) || ""
            );
        },


        setGeminiProxyUrl(url) {

            localStorage.setItem(
                "geminiProxyUrl",
                url
            );

            return "Gemini proxy URL saved.";
        },


        // Per-user Gemini API key (optional).
        // Same pattern as the OpenAI key: lives
        // in this user's localStorage and only
        // ever goes to Google's API — never to
        // the shared Supabase proxy.
        getGeminiApiKey() {

            return (
                localStorage.getItem(
                    "geminiApiKey"
                ) || ""
            );

        },


        setGeminiApiKey(key) {

            localStorage.setItem(
                "geminiApiKey",
                key
            );

            return "Gemini API key saved.";
        },


        setGeminiModel(model) {

            this._config.geminiModel = model;

            localStorage.setItem(
                "geminiModel",
                model
            );

            return (
                "Gemini model set to " +
                model +
                "."
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

                provider:
                    this._config.provider,

                model:
                    this._config.provider ===
                    "claude"
                        ? this._config
                              .claudeModel
                        : this._config.provider ===
                          "gemini"
                            ? this._config
                                  .geminiModel
                            : this._config.model,

                historyLength:
                    this._history.length,

                keySet:
                    this._config.provider ===
                    "claude"
                        ? !!this.getClaudeProxyUrl()
                        : this._config.provider ===
                          "gemini"
                            ? !!(
                                  this.getGeminiApiKey() ||
                                  this.getGeminiProxyUrl()
                              )
                            : !!this.getApiKey(),

                // Gemini transport: "direct" (the
                // user's own key — the browser calls
                // Google), "proxy" (the shared Supabase
                // function), "none" (not configured).
                // Null for other providers.
                geminiMode:
                    this._config.provider ===
                    "gemini"
                        ? this.getGeminiApiKey()
                            ? "direct"
                            : this.getGeminiProxyUrl()
                                ? "proxy"
                                : "none"
                        : null,

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

            const provider = this._config.provider;

            if (provider === "claude") {

                if (!this.getClaudeProxyUrl()) {

                    return [
                        "No Claude proxy URL is set.",
                        "Open Settings > Brain, paste your",
                        "Cloudflare Worker URL, and try again."
                    ].join("\n");
                }

            } else if (provider === "gemini") {

                if (
                    !this.getGeminiApiKey() &&
                    !this.getGeminiProxyUrl()
                ) {

                    return [
                        "No Gemini key or function URL is set.",
                        "Open Settings > Brain: paste your own",
                        "free API key (Google AI Studio) or the",
                        "Supabase gemini-chat function URL,",
                        "and try again."
                    ].join("\n");
                }

            } else if (!this.getApiKey()) {

                return [
                    "No OpenAI API key is set.",
                    "Open Settings > Brain and paste your",
                    "API key, then ask me again."
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
                    provider === "claude"
                        ? await this._thinkClaude(
                              text,
                              context
                          )
                        : provider === "gemini"
                            ? await this._thinkGemini(
                                  text,
                                  context
                              )
                            : await this._think(
                                  context
                              );


                if (provider === "openai") {

                    this._history.push({

                        role: "assistant",
                        content: reply

                    });

                    this._trimHistory();
                }


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
                    "reaching " +
                    (provider === "claude"
                        ? "Claude"
                        : provider === "gemini"
                            ? "Gemini"
                            : "OpenAI") +
                    ": " +
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

                    let toolArgs = {};

                    try {

                        toolArgs = JSON.parse(
                            (call.function &&
                                call.function
                                    .arguments) ||
                            "{}"
                        );

                    } catch (error) {

                        toolArgs = {};
                    }

                    const result =
                        await this._runTool(
                            call.function &&
                                call.function.name,
                            toolArgs,
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


        // ==================================
        // CLAUDE (via Supabase edge fn)
        // ==================================

        _claudeSystemPrompt() {

            const now = new Date();

            return [
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
            ].join(" ");
        },


        _claudeTools() {

            return [
                {
                    name: "aegis_run",

                    description:
                        "Run a command on an AEGIS " +
                        "module. Use this when Ty asks " +
                        "AEGIS to DO something (refresh " +
                        "the weather, check reminders, " +
                        "report system status, etc).",

                    input_schema: {

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
                },

                {
                    name: "aegis_status",

                    description:
                        "List the registered AEGIS " +
                        "modules and their online status.",

                    input_schema: {

                        type: "object",

                        properties: {}
                    }
                }
            ];
        },


        async _callClaude(messages, noTools) {

            const proxyUrl =
                this.getClaudeProxyUrl().replace(
                    /\/$/,
                    ""
                );

            const body = {

                model:
                    this._config.claudeModel,

                max_tokens:
                    this._config
                        .claudeMaxTokens,

                system:
                    this._claudeSystemPrompt(),

                messages: messages

            };

            if (!noTools) {

                body.tools =
                    this._claudeTools();
            }

            const response = await fetch(
                proxyUrl,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify(body)

                }
            );

            if (!response.ok) {

                const errText =
                    await response.text();

                throw new Error(
                    "Claude " +
                    response.status +
                    ": " +
                    errText.slice(0, 200)
                );
            }

            return response.json();
        },


        async _thinkClaude(text, context) {

            // Working messages in Claude's native
            // format. Simple text history is kept
            // in _history; tool blocks stay local
            // to this turn.
            const messages = this._history.map(
                (m) => ({
                    role: m.role,
                    content: m.content
                })
            );

            for (
                let round = 0;
                round <
                this._config.maxToolRounds;
                round++
            ) {

                const data =
                    await this._callClaude(
                        messages,
                        false
                    );

                const blocks =
                    (data &&
                        data.content) ||
                    [];

                const textParts = blocks
                    .filter(
                        (b) =>
                            b.type === "text"
                    )
                    .map((b) => b.text || "");

                const toolUses = blocks.filter(
                    (b) =>
                        b.type === "tool_use"
                );

                // Keep the full assistant turn
                // (text + tool_use blocks) so
                // tool_results line up.
                messages.push({

                    role: "assistant",

                    content: blocks

                });

                if (!toolUses.length) {

                    const reply =
                        textParts.join("");

                    this._history.push({

                        role: "assistant",

                        content: reply

                    });

                    this._trimHistory();

                    return reply;
                }

                const toolResults = [];

                for (
                    const tu of toolUses
                ) {

                    const result =
                        await this._runTool(
                            tu.name,
                            tu.input || {},
                            context
                        );

                    toolResults.push({

                        type: "tool_result",

                        tool_use_id: tu.id,

                        content: String(
                            result
                        )

                    });
                }

                messages.push({

                    role: "user",

                    content: toolResults

                });
            }

            // Out of tool rounds — final answer,
            // no more tools.
            const data =
                await this._callClaude(
                    messages,
                    true
                );

            const reply = (
                (data && data.content) ||
                []
            )
                .filter(
                    (b) => b.type === "text"
                )
                .map((b) => b.text || "")
                .join("");

            this._history.push({

                role: "assistant",

                content: reply

            });

            this._trimHistory();

            return reply;
        },


        // ==================================
        // GEMINI (via Supabase edge fn)
        // ==================================

        _geminiSystemPrompt() {

            const now = new Date();

            return [
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
            ].join(" ");
        },


        // Same two tools, translated to
        // Gemini's functionDeclarations format.
        _geminiTools() {

            return [
                {
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
                },

                {
                    name: "aegis_status",

                    description:
                        "List the registered AEGIS " +
                        "modules and their online status.",

                    parameters: {

                        type: "object",

                        properties: {}
                    }
                }
            ];
        },


        // Shared generateContent request body.
        // Both transports (direct and proxy) use
        // it; only the target URL and auth differ.
        _geminiRequestBody(contents, noTools) {

            const body = {

                model:
                    this._config.geminiModel,

                systemInstruction: {

                    parts: [
                        {
                            text:
                                this._geminiSystemPrompt()
                        }
                    ]

                },

                contents: contents,

                generationConfig: {

                    temperature:
                        this._config
                            .temperature,

                    maxOutputTokens:
                        this._config
                            .geminiMaxTokens

                }

            };

            if (!noTools) {

                body.tools = [
                    {
                        functionDeclarations:
                            this._geminiTools()
                    }
                ];
            }

            return body;
        },


        async _callGemini(contents, noTools) {

            const body =
                this._geminiRequestBody(
                    contents,
                    noTools
                );

            const userKey =
                this.getGeminiApiKey();

            let url;

            let headers;

            let mode;


            if (userKey) {

                // Per-user key: the browser calls
                // Google directly. Their key, their
                // quota, their data — the shared
                // proxy is never involved.
                mode = "direct";

                url =
                    "https://generativelanguage.googleapis.com" +
                    "/v1beta/models/" +
                    encodeURIComponent(
                        this._config.geminiModel
                    ) +
                    ":generateContent";

                headers = {

                    "Content-Type":
                        "application/json",

                    "x-goog-api-key":
                        userKey

                };

                // The model rides in the URL on
                // the direct path.
                delete body.model;

            } else {

                // Shared proxy: the key lives
                // server-side in Supabase.
                mode = "proxy";

                url =
                    this.getGeminiProxyUrl().replace(
                        /\/$/,
                        ""
                    );

                headers = {

                    "Content-Type":
                        "application/json"

                };
            }


            const response = await fetch(
                url,
                {

                    method: "POST",

                    headers: headers,

                    body: JSON.stringify(body)

                }
            );

            if (!response.ok) {

                const errText =
                    await response.text();

                throw new Error(
                    "Gemini" +
                    (
                        mode === "direct"
                            ? " (direct)"
                            : " (proxy)"
                    ) +
                    " " +
                    response.status +
                    ": " +
                    errText.slice(0, 200)
                );
            }

            return response.json();
        },


        _geminiParts(data) {

            const cand =
                data &&
                data.candidates &&
                data.candidates[0];

            if (
                !cand ||
                !cand.content ||
                !Array.isArray(cand.content.parts)
            ) {

                throw new Error(
                    "Empty or blocked response " +
                    "from Gemini."
                );
            }

            return cand.content.parts;
        },


        async _thinkGemini(text, context) {

            // Working contents in Gemini's native
            // format: roles are "user" / "model"
            // (not "assistant"). Simple text history
            // is kept in _history; functionCall /
            // functionResponse parts stay local to
            // this turn.
            const contents = this._history.map(
                (m) => ({

                    role:
                        m.role === "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        { text: m.content }
                    ]

                })
            );

            for (
                let round = 0;
                round <
                this._config.maxToolRounds;
                round++
            ) {

                const data =
                    await this._callGemini(
                        contents,
                        false
                    );

                const parts =
                    this._geminiParts(data);

                const textParts = parts
                    .filter(
                        (p) =>
                            typeof p.text ===
                            "string"
                    )
                    .map((p) => p.text);

                const calls = parts.filter(
                    (p) => p.functionCall
                );

                // Keep the full model turn
                // (text + functionCall parts) so
                // functionResponses line up.
                contents.push({

                    role: "model",

                    parts: parts

                });

                if (!calls.length) {

                    const reply =
                        textParts.join("");

                    this._history.push({

                        role: "assistant",

                        content: reply

                    });

                    this._trimHistory();

                    return reply;
                }

                const responseParts = [];

                for (
                    const c of calls
                ) {

                    const fc =
                        c.functionCall;

                    const result =
                        await this._runTool(
                            fc.name,
                            fc.args || {},
                            context
                        );

                    responseParts.push({

                        functionResponse: {

                            name: fc.name,

                            response: {

                                result: String(
                                    result
                                )

                            }

                        }

                    });
                }

                contents.push({

                    role: "user",

                    parts: responseParts

                });
            }

            // Out of tool rounds — final answer,
            // no more tools.
            const data =
                await this._callGemini(
                    contents,
                    true
                );

            const reply = this._geminiParts(data)
                .filter(
                    (p) =>
                        typeof p.text ===
                        "string"
                )
                .map((p) => p.text)
                .join("");

            this._history.push({

                role: "assistant",

                content: reply

            });

            this._trimHistory();

            return reply;
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


        async _runTool(name, args, context) {

            if (!args || typeof args !== "object") {
                args = {};
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
