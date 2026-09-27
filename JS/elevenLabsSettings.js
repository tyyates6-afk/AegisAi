/*======================================
    AEGIS ELEVENLABS SETTINGS v1.1.0

    Settings-page wiring for the ElevenLabs
    cloud voice in the LIVE voice.js, which
    routes through the Supabase edge
    function (eleven-tts).

    The API key lives server-side in the
    Supabase function, so this UI manages
    only the voice ID override. No key
    field — nothing secret touches the
    browser.

    Install:
      1. Drop this file into JS/
         as JS/elevenLabsSettings.js
         (replaces v1.0.0)
      2. Use settings-card.html v2 for the
         card (no API key input)
      3. Apply voice-api-patch.js v2 inside
         Aegis.register("voice", {...})
      4. Make the one-line change in
         speakViaElevenLabs (see the patch
         file header)
======================================*/

function wireElevenLabsSettings(){

    const voice =
    Aegis.getModule("voice")?.api;

    if(!voice){

        return;

    }

    const voiceInput =
    document.getElementById(
        "elevenLabsVoiceId"
    );

    const saveButton =
    document.getElementById(
        "elevenLabsSave"
    );

    const resetButton =
    document.getElementById(
        "elevenLabsReset"
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
        !voiceInput ||
        !saveButton ||
        !resetButton ||
        !testButton ||
        !statusElement
    ){

        return;

    }

    function refreshStatus(){

        const config =
        voice.getElevenLabsConfig();

        const tier =
        config.xttsAvailable
        ? "local XTTS"
        : "ElevenLabs (via Supabase) → browser fallback";

        statusElement.textContent =
        `Voice ID: ${config.voiceId}` +
        (
            config.custom
            ? " (custom override)"
            : " (default)"
        ) +
        ` — active tier: ${tier}.`;

        voiceInput.value =
        config.custom
        ? config.voiceId
        : "";

        voiceInput.placeholder =
        `Default: ${config.defaultVoiceId}`;

    }

    saveButton.onclick = () => {

        const voiceId =
        voiceInput.value.trim();

        if(!voiceId){

            refreshStatus();

            return;

        }

        voice.setElevenLabsVoice(
            voiceId
        );

        refreshStatus();

    };

    resetButton.onclick = () => {

        voice.clearElevenLabsVoice();

        refreshStatus();

    };

    testButton.onclick = () => {

        voice.testElevenLabs(
            "ElevenLabs voice check complete. AEGIS cloud voice is online."
        ).catch(error => {

            console.error(
                "ElevenLabs test failed:",
                error
            );

            statusElement.textContent =
            `⚠️ Test failed: ${error.message} — ` +
            `check the Supabase eleven-tts function and your ElevenLabs account status.`;

        });

    };

    refreshStatus();

}

Aegis.register("elevenLabsSettings", {

    version:"1.1.0",

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
