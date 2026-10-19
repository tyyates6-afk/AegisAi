/*======================================
    AEGIS BRAIN SETTINGS v1.1.0

    Runtime Settings card for the Brain
    module (brain.js v3.0.0+).

    - Provider switch: OpenAI / Claude / Gemini
    - OpenAI: API key + model
    - Claude: Supabase edge function URL + model
      (API key lives server-side in Supabase,
       same pattern as eleven-tts)
    - Gemini: Supabase edge function URL + model
      (API key lives server-side in Supabase.
       Free tier via Google AI Studio.)
      Optional per-user API key: with their own
      key, a user's browser calls Google directly
      (their key, their quota, their data).
      "Stream responses" toggle (default on):
      words appear as they generate.

    No index.html changes needed — the card
    injects itself into the Settings page.
======================================*/

(function () {

"use strict";

const CARD_ID = "brainSettingsCard";

function brain() {
    try {
        return window.Aegis
            ? window.Aegis.getModule("brain")
            : null;
    } catch (e) {
        return null;
    }
}

function brainApi() {
    const b = brain();
    return b && b.api ? b.api : b;
}

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function injectCard() {
    try {
        const page = document.querySelector(
            '[data-page="settings"]'
        );
        if (!page || document.getElementById(CARD_ID)) return;

        const api = brainApi();
        const provider = api && api.getProvider
            ? api.getProvider()
            : (localStorage.getItem("brainProvider") || "openai");

        const card = document.createElement("section");
        card.className = "card";
        card.id = CARD_ID;

        card.innerHTML =
            "<h2>\u{1F9E0} Brain</h2>" +
            '<p class="empty-state">Choose which AI powers the ' +
            "command bar. Switching providers clears " +
            "conversation history.</p>" +

            /* Provider toggle */
            '<div style="display:flex;gap:8px;margin-bottom:14px">' +
            '<button type="button" data-brain-provider="openai" ' +
            'style="flex:1;border-radius:999px;padding:9px 4px;' +
            "font-size:12px;letter-spacing:1px;cursor:pointer;" +
            'border:1px solid rgba(80,210,255,0.4)">OpenAI</button>' +
            '<button type="button" data-brain-provider="claude" ' +
            'style="flex:1;border-radius:999px;padding:9px 4px;' +
            "font-size:12px;letter-spacing:1px;cursor:pointer;" +
            'border:1px solid rgba(80,210,255,0.4)">Claude</button>' +
            '<button type="button" data-brain-provider="gemini" ' +
            'style="flex:1;border-radius:999px;padding:9px 4px;' +
            "font-size:12px;letter-spacing:1px;cursor:pointer;" +
            'border:1px solid rgba(80,210,255,0.4)">Gemini</button>' +
            "</div>" +

            /* OpenAI section */
            '<div data-brain-section="openai">' +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">OpenAI API key</label>' +
            '<input type="password" id="brainOpenAiKey" ' +
            'placeholder="sk-..." style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">Model</label>' +
            '<input type="text" id="brainOpenAiModel" ' +
            'placeholder="gpt-4o-mini" style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            "</div>" +

            /* Claude section */
            '<div data-brain-section="claude" style="display:none">' +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">Supabase edge function URL</label>' +
            '<input type="text" id="brainClaudeProxy" ' +
            'placeholder="https://...supabase.co/functions/v1/claude-chat" ' +
            'style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            '<p class="empty-state" style="margin:0 0 10px">The Anthropic ' +
            "API key lives server-side in Supabase — " +
            "it never touches the browser.</p>" +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">Model</label>' +
            '<input type="text" id="brainClaudeModel" ' +
            'placeholder="claude-sonnet-4-5" style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            "</div>" +

            /* Gemini section */
            '<div data-brain-section="gemini" style="display:none">' +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">Supabase edge function URL</label>' +
            '<input type="text" id="brainGeminiProxy" ' +
            'placeholder="https://...supabase.co/functions/v1/gemini-chat" ' +
            'style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">API key (optional — use your own free key)</label>' +
            '<input type="password" id="brainGeminiKey" ' +
            'placeholder="AIza..." style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            '<p class="empty-state" style="margin:0 0 10px">Free from ' +
            "Google AI Studio. Without it, requests share the " +
            "proxy's key and quota.</p>" +
            '<p class="empty-state" style="margin:0 0 10px">The proxy ' +
            "key lives server-side in Supabase — " +
            "it never touches the browser.</p>" +
            '<label style="display:block;font-size:12px;color:#9fdcff;' +
            'margin-bottom:4px">Model</label>' +
            '<input type="text" id="brainGeminiModel" ' +
            'placeholder="gemini-2.5-flash" style="width:100%;box-sizing:border-box;' +
            "padding:10px 12px;font-size:14px;margin-bottom:10px;" +
            'background:rgba(80,210,255,0.06);' +
            "border:1px solid rgba(80,210,255,0.25);border-radius:12px;" +
            'color:#dff2ff;outline:none">' +
            '<label style="display:flex;align-items:center;gap:8px;' +
            'font-size:12px;color:#9fdcff;margin-bottom:10px;cursor:pointer">' +
            '<input type="checkbox" id="brainGeminiStream" ' +
            'style="width:15px;height:15px;accent-color:#50d2ff">' +
            "<span>Stream responses " +
            '<span style="color:#5b7a93">(words appear as they ' +
            "generate)</span></span></label>" +
            "</div>" +

            '<button type="button" id="brainSettingsSave" ' +
            'style="border-radius:999px;border:1px solid ' +
            "rgba(80,210,255,0.5);background:rgba(80,210,255,0.12);" +
            'color:#9fdcff;padding:9px 18px;font-size:12px;' +
            'letter-spacing:1px;cursor:pointer;font-weight:bold">' +
            "SAVE</button>" +
            '<p class="empty-state" id="brainSettingsStatus" ' +
            'style="margin-top:8px"></p>';

        const sys = page.querySelector("#systemSettings");
        if (sys && sys.parentNode === page) {
            page.insertBefore(card, sys.nextSibling);
        } else {
            page.appendChild(card);
        }

        wireCard(card, provider);
    } catch (e) {}
}

function paintProviderButtons(card, provider) {
    const btns = card.querySelectorAll("[data-brain-provider]");
    btns.forEach((b) => {
        const active =
            b.getAttribute("data-brain-provider") === provider;
        b.style.background = active
            ? "#50d2ff"
            : "rgba(80,210,255,0.08)";
        b.style.color = active ? "#06121f" : "#9fdcff";
        b.style.fontWeight = active ? "bold" : "normal";
    });
    const openaiSection = card.querySelector(
        '[data-brain-section="openai"]'
    );
    const claudeSection = card.querySelector(
        '[data-brain-section="claude"]'
    );
    const geminiSection = card.querySelector(
        '[data-brain-section="gemini"]'
    );
    if (openaiSection)
        openaiSection.style.display =
            provider === "openai" ? "block" : "none";
    if (claudeSection)
        claudeSection.style.display =
            provider === "claude" ? "block" : "none";
    if (geminiSection)
        geminiSection.style.display =
            provider === "gemini" ? "block" : "none";
}

function wireCard(card, initialProvider) {
    let provider = initialProvider;
    const api = brainApi();

    paintProviderButtons(card, provider);

    // Fill current values
    const keyInput = card.querySelector("#brainOpenAiKey");
    const openModel = card.querySelector("#brainOpenAiModel");
    const proxyInput = card.querySelector("#brainClaudeProxy");
    const claudeModel = card.querySelector("#brainClaudeModel");
    const geminiProxyInput = card.querySelector("#brainGeminiProxy");
    const geminiKeyInput = card.querySelector("#brainGeminiKey");
    const geminiModel = card.querySelector("#brainGeminiModel");
    const geminiStream = card.querySelector("#brainGeminiStream");
    const status = card.querySelector("#brainSettingsStatus");

    if (keyInput && api && api.getApiKey)
        keyInput.value = api.getApiKey();
    if (openModel)
        openModel.value =
            localStorage.getItem("openAiModel") || "gpt-4o-mini";
    if (proxyInput)
        proxyInput.value =
            localStorage.getItem("claudeProxyUrl") || "";
    if (claudeModel)
        claudeModel.value =
            localStorage.getItem("claudeModel") || "claude-sonnet-4-5";
    if (geminiProxyInput)
        geminiProxyInput.value =
            localStorage.getItem("geminiProxyUrl") || "";
    if (geminiKeyInput && api && api.getGeminiApiKey)
        geminiKeyInput.value = api.getGeminiApiKey();
    if (geminiModel)
        geminiModel.value =
            localStorage.getItem("geminiModel") || "gemini-2.5-flash";
    if (geminiStream)
        geminiStream.checked =
            !api || !api.getGeminiStream
                ? true
                : api.getGeminiStream();

    card.querySelectorAll("[data-brain-provider]").forEach((b) => {
        b.addEventListener("click", () => {
            provider = b.getAttribute("data-brain-provider");
            paintProviderButtons(card, provider);
        });
    });

    const save = card.querySelector("#brainSettingsSave");
    if (save) {
        save.addEventListener("click", () => {
            try {
                if (api && api.setProvider)
                    api.setProvider(provider);

                if (keyInput && keyInput.value.trim() && api && api.setApiKey)
                    api.setApiKey(keyInput.value.trim());
                if (openModel && openModel.value.trim() && api && api.setModel)
                    api.setModel(openModel.value.trim());

                if (proxyInput && api && api.setClaudeProxyUrl)
                    api.setClaudeProxyUrl(proxyInput.value.trim());
                if (claudeModel && claudeModel.value.trim() && api && api.setClaudeModel)
                    api.setClaudeModel(claudeModel.value.trim());

                if (geminiProxyInput && api && api.setGeminiProxyUrl)
                    api.setGeminiProxyUrl(geminiProxyInput.value.trim());
                if (geminiKeyInput && geminiKeyInput.value.trim() && api && api.setGeminiApiKey)
                    api.setGeminiApiKey(geminiKeyInput.value.trim());
                if (geminiModel && geminiModel.value.trim() && api && api.setGeminiModel)
                    api.setGeminiModel(geminiModel.value.trim());
                if (geminiStream && api && api.setGeminiStream)
                    api.setGeminiStream(geminiStream.checked);

                // Clear the key fields after save
                if (keyInput) keyInput.value = "";
                if (geminiKeyInput) geminiKeyInput.value = "";

                if (status) {
                    const st = api && api.status ? api.status() : null;
                    status.textContent =
                        "Saved. Provider: " +
                        provider +
                        (st
                            ? " | " +
                              (st.keySet
                                  ? "connected"
                                  : "missing key/URL")
                            : "");
                }
            } catch (e) {
                if (status)
                    status.textContent =
                        "Save failed: " + e.message;
            }
        });
    }
}

if (
    typeof window !== "undefined" &&
    window.Aegis &&
    typeof window.Aegis.register === "function"
) {
    window.Aegis.register("brainSettings", {
        version: "1.1.0",
        name: "Brain Settings",
        init() {
            // Settings page may render after boot.
            injectCard();
            let n = 0;
            const t = setInterval(() => {
                n += 1;
                if (document.getElementById(CARD_ID) || n >= 20) {
                    clearInterval(t);
                    return;
                }
                injectCard();
            }, 500);
            try {
                console.log("Brain Settings v1.1.0 initialized.");
            } catch (e) {}
        },
    });
}

})();
