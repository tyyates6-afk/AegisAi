/*======================================
    AEGIS ELEVENLABS SETTINGS v1.0.0

    Settings-page wiring for the ElevenLabs
    cloud voice already built into voice.js.

    Install:
      1. Drop this file into JS/
         as JS/elevenLabsSettings.js
      2. Add the settings card from
         settings-card.html to the settings
         page in index.html
      3. Add the script tag to index.html
         next to the other settings scripts
      4. Apply the three new API methods
         from voice-api-patch.js inside
         Aegis.register("voice", {...})
======================================*/

function wireElevenLabsSettings(){

    const voice =
    Aegis.getModule("voice")?.api;

    if(!voice){

        return;

    }

    const keyInput =
    document.getElementById(
        "elevenLabsApiKey"
    );

    const voiceInput =
    document.getElementById(
        "elevenLabsVoiceId"
    );

    const saveButton =
    document.getElementById(
        "elevenLabsSave"
    );

    const clearButton =
    document.getElementById(
        "elevenLabsClear"
    );

    const testButton =
    document.getElementById(
        "elevenLabsTest"
    );

    const statusElement =
    document.getElementById(
        "elevenLabsStatus"
    );

    if(
        !keyInput ||
        !voiceInput ||
        !saveButton ||
        !clearButton ||
        !testButton ||
        !statusElement
    ){

        return;

    }

    function refreshStatus(){

        const config =
        voice.getElevenLabsConfig();

        const engine =
        voice.getSettings().engine;

        let engineLabel =
        "browser";

        if(engine === "xtts"){

            engineLabel =
            "local XTTS";

        }
        else if(engine === "elevenlabs"){

            engineLabel =
            "ElevenLabs";

        }

        statusElement.textContent =
        config.configured
        ? `✅ Configured (key ${config.maskedKey}). Active engine: ${engineLabel}.`
        : `⚠️ Not configured. Active engine: ${engineLabel}.`;

        // Never put the real key back into the field.
        keyInput.value = "";

        keyInput.placeholder =
        config.configured
        ? `Saved (${config.maskedKey}) — leave blank to keep`
        : "sk_...";

        voiceInput.value =
        config.voiceId || "";

    }

    saveButton.onclick = () => {

        const apiKey =
        keyInput.value.trim();

        const voiceId =
        voiceInput.value.trim();

        if(!apiKey && !voiceId){

            refreshStatus();

            return;

        }

        // Blank key field = keep the saved key.
        // Blank voice field = keep the saved voice.
        voice.setElevenLabs(
            apiKey || null,
            voiceId || null
        );

        refreshStatus();

    };

    clearButton.onclick = () => {

        if(
            !confirm(
                "Remove the saved ElevenLabs key and voice ID?"
            )
        ){

            return;

        }

        voice.clearElevenLabs();

        refreshStatus();

    };

    testButton.onclick = () => {

        voice.testElevenLabs(
            "ElevenLabs voice check complete. AEGIS cloud voice is online."
        );

    };

    refreshStatus();

}

Aegis.register("elevenLabsSettings", {

    version:"1.0.0",

    init(){

        console.log(
            "ElevenLabs settings initialized."
        );

        Aegis.listen(
            "navigation:settings",
            () => {

                wireElevenLabsSettings();

            }
        );

    },

    refresh(){

        wireElevenLabsSettings();

    },

    shutdown(){},

    status(){

        return {

            online:true,

            version:this.version

        };

    }

});
