/*======================================
        AEGIS VOICE MODULE v1.1.0
======================================*/

let voiceSettings = {

    volume:0.9,

    provider:"browser",

    voice:null,

    queue:[]

};




// Configurable tiers — set XTTS_ENABLED to true and update
// XTTS_SERVER_URL once your local Coqui XTTS server is ready.
// While false, XTTS is skipped entirely (no reachability check,
// no network attempt) and ElevenLabs becomes the primary voice.

const XTTS_ENABLED = false;

const XTTS_SERVER_URL =
"http://localhost:8020/api/tts";

const ELEVENLABS_VOICE_ID =
"21m00Tcm4TlvDq8ikWAM";

const ELEVENLABS_FUNCTION_URL =
"https://tgsrvnbzxufwsskuerhv.supabase.co/functions/v1/eleven-tts";


let xttsAvailable = false;

let xttsChecked = false;


function processVoiceQueue(){


    if(
        speechSynthesis.speaking
    ){

        return;

    }


    const next =
    voiceSettings.queue.shift();



    if(!next){

        return;

    }



    next.onend = ()=>{

        processVoiceQueue();

    };



    speechSynthesis.speak(
        next
    );

}

function loadDefaultVoice(){


    const voices =
    speechSynthesis.getVoices();



    const preferred =
    voices.find(
        voice =>
        voice.name.includes("David")
    )
    ||
    voices.find(
        voice =>
        voice.lang.includes("en-US")
    );



    if(preferred){

        voiceSettings.voice =
        preferred;

        console.log(
            "AEGIS voice selected:",
            preferred.name
        );

    }

}


async function checkXttsAvailability(){

    try{

        const controller =
        new AbortController();

        const timeout =
        setTimeout(
            () => controller.abort(),
            1500
        );

        const response =
        await fetch(
            XTTS_SERVER_URL,
            {
                method:"HEAD",
                signal:controller.signal
            }
        );

        clearTimeout(timeout);

        xttsAvailable =
        response.ok;

    }
    catch(error){

        xttsAvailable = false;

    }

    xttsChecked = true;

    console.log(
        xttsAvailable
        ? "🟢 Local XTTS server reachable — will be used for voice."
        : "⚪ Local XTTS server unavailable — falling back to ElevenLabs/browser voice."
    );

}


function getSpeechGainValue(){

    const globalVolume =
    Aegis.getModule("audio")
    ?.api
    .globalVolume ?? 1;

    return voiceSettings.volume *
    globalVolume;

}


function playAudioBlobThroughGain(blob){

    const audioModule =
    Aegis.getModule("audio")?.api;

    const audioContext =
    audioModule?.audioContext;

    const url =
    URL.createObjectURL(blob);

    const audioEl =
    new Audio(url);

    audioEl.crossOrigin =
    "anonymous";

    return new Promise((resolve, reject) => {

        audioEl.onended = () => {

            URL.revokeObjectURL(url);

            resolve();

        };

        audioEl.onerror = (error) => {

            URL.revokeObjectURL(url);

            reject(error);

        };

        if(audioContext){

            if(audioContext.state === "suspended"){

                audioContext.resume();

            }

            const source =
            audioContext.createMediaElementSource(audioEl);

            const gainNode =
            audioContext.createGain();

            gainNode.gain.value =
            getSpeechGainValue();

            source.connect(gainNode);

            gainNode.connect(
                audioContext.destination
            );

        }
        else{

            audioEl.volume =
            getSpeechGainValue();

        }

        audioEl.play().catch(reject);

    });

}


async function speakViaXtts(text){

    const response =
    await fetch(XTTS_SERVER_URL, {

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({ text })

    });

    if(!response.ok){

        throw new Error(
            `XTTS server responded ${response.status}`
        );

    }

    const blob =
    await response.blob();

    await playAudioBlobThroughGain(blob);

}


async function speakViaElevenLabs(text){

    if(typeof supabaseClient === "undefined"){

        throw new Error(
            "Supabase client is not available."
        );

    }

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();

    if(error || !data?.session?.access_token){

        throw new Error(
            "No authenticated Supabase session — cannot call ElevenLabs function."
        );

    }

    const response =
    await fetch(ELEVENLABS_FUNCTION_URL, {

        method:"POST",

        headers:{

            "Content-Type":"application/json",

            "Authorization":`Bearer ${data.session.access_token}`

        },

        body:JSON.stringify({

            text,

            voiceId:ELEVENLABS_VOICE_ID

        })

    });

    if(!response.ok){

        throw new Error(
            `ElevenLabs function responded ${response.status}`
        );

    }

    const blob =
    await response.blob();

    await playAudioBlobThroughGain(blob);

}


function speakViaBrowser(text, style){

    if(!("speechSynthesis" in window)){

        console.warn(
            "Speech synthesis unavailable."
        );

        return;

    }


    const utterance =
    new SpeechSynthesisUtterance(text);

    if(
        voiceSettings.voice
    ){

        utterance.voice =
        voiceSettings.voice;

    }

    const effectiveVolume =
    getSpeechGainValue();

    switch(style){


        case "Jarvis":

            utterance.rate = 0.95;

            utterance.pitch = 0.85;

            utterance.volume =
            effectiveVolume;

        break;



        case "Friendly":

            utterance.rate = 1.05;

            utterance.pitch = 1.15;

            utterance.volume =
            effectiveVolume;

        break;



        case "Minimal":

            utterance.rate = 1;

            utterance.pitch = 1;

            utterance.volume =
            effectiveVolume;

        break;



        case "Professional":

        default:

            utterance.rate = 0.95;

            utterance.pitch = 1;

            utterance.volume =
            effectiveVolume;

        break;


    }

    voiceSettings.queue.push(
        utterance
    );

    processVoiceQueue();

}


Aegis.register("voice", {

    version:"1.1.0",


    enabled:true,
    volume:0.9,

    currentVoice:null,
    

    getSettings(){

        return {

            enabled:this.enabled,

            volume:voiceSettings.volume,

            voice:this.currentVoice,

            xttsAvailable:xttsAvailable,

            xttsChecked:xttsChecked

        };

    },

/*======================================
    VOICE.JS API PATCH — ElevenLabs settings

    voice.js v1.1.0 already speaks through
    ElevenLabs (speakWithElevenLabs), but the
    module API exposes no way to save, read,
    or test the credentials from a UI.

    Add these three methods inside
    Aegis.register("voice", { ... }),
    next to getSettings(). Nothing else in
    voice.js changes.
======================================*/

    getElevenLabsConfig(){

        const apiKey =
        localStorage.getItem(
            "elevenLabsApiKey"
        ) || "";

        const voiceId =
        localStorage.getItem(
            "elevenLabsVoiceId"
        ) || "";

        return {

            configured:
            !!(apiKey && voiceId),

            hasKey:
            !!apiKey,

            maskedKey:
            apiKey
            ? "••••" + apiKey.slice(-4)
            : "",

            voiceId:
            voiceId

        };

    },


    // Pass null for a value to keep the saved one.
    setElevenLabs(apiKey, voiceId){

        if(
            apiKey &&
            apiKey.trim()
        ){

            localStorage.setItem(
                "elevenLabsApiKey",
                apiKey.trim()
            );

        }

        if(
            voiceId &&
            voiceId.trim()
        ){

            localStorage.setItem(
                "elevenLabsVoiceId",
                voiceId.trim()
            );

        }

        Aegis.broadcast(
            "voiceUpdated"
        );

    },


    clearElevenLabs(){

        localStorage.removeItem(
            "elevenLabsApiKey"
        );

        localStorage.removeItem(
            "elevenLabsVoiceId"
        );

        Aegis.broadcast(
            "voiceUpdated"
        );

    },


    // Forces ElevenLabs even when the local
    // XTTS server is running, so the test
    // always exercises the cloud voice.
    async testElevenLabs(text){

        const globalVolume =
        Aegis.getModule("audio")
        ?.api
        .globalVolume ?? 1;

        const effectiveVolume =
        voiceSettings.volume *
        globalVolume;

        await speakWithElevenLabs(
            text ||
            "ElevenLabs voice check complete.",
            effectiveVolume
        );

    },

    toggle(){

        this.enabled =
        !this.enabled;


        Aegis.broadcast(
            "voiceUpdated"
        );


        return this.enabled;

    },


    setVolume(value){

        voiceSettings.volume =
        value;

        saveData(
            "voiceVolume",
            [{ volume:value }]
        );

    },

        init(){

        console.log(
            "Voice system initialized."
        );

        const savedVolume =
        loadData("voiceVolume")[0];

        if(
            savedVolume &&
            typeof savedVolume.volume === "number"
        ){

            voiceSettings.volume =
            savedVolume.volume;

        }

        loadDefaultVoice();


        speechSynthesis.onvoiceschanged =
        ()=>{

            loadDefaultVoice();

        };


        // One reachability check per app load, not a manual toggle —
        // skipped entirely while XTTS_ENABLED is false, so boot
        // doesn't wait on a server that isn't running yet.

        if(XTTS_ENABLED){

            checkXttsAvailability();

        }
        else{

            xttsAvailable = false;

            xttsChecked = true;

            console.log(
                "⚪ XTTS skipped (disabled) — ElevenLabs is the primary voice."
            );

        }


    },


    async speak(text){

        if(!this.enabled){
            return;
        }


        const profile =
            Aegis
            .getModule("profile")
            ?.api
            .getProfile();


            const style =
            profile?.style || "Professional";


        // Tier 1: local XTTS, if reachable.

        if(xttsAvailable){

            try{

                await speakViaXtts(text);

                return;

            }
            catch(error){

                console.warn(
                    "XTTS failed, falling back to ElevenLabs:",
                    error
                );

                xttsAvailable = false;

            }

        }


        // Tier 2: ElevenLabs, via the Supabase edge function.

        try{

            await speakViaElevenLabs(text);

            return;

        }
        catch(error){

            console.warn(
                "ElevenLabs failed, falling back to browser voice:",
                error
            );

        }


        // Tier 3: browser speechSynthesis — always available.

        speakViaBrowser(text, style);


    },


    speakNotification(notification){


        const profile =
        Aegis
        .getModule("profile")
        ?.api
        .getProfile();



        if(
            profile &&
            profile.voiceEnabled === false
        ){

            return;

        }



        const name =
        profile?.name || "there";


        const style =
        profile?.style || "Professional";



        let message;



        switch(style){


            case "Jarvis":


                if(notification.source === "reminders"){

                    message =
                    `${name}, a reminder. ${notification.title}.`;

                }
                else if(notification.source === "weather"){

                    message =
                    `${name}, weather update. ${notification.message}`;

                }
                else {

                    message =
                    `${name}, ${notification.title}. ${notification.message}`;

                }

            break;



            case "Friendly":


                message =
                `Hey ${name}, just letting you know. ${notification.title}. ${notification.message}`;

            break;



            case "Minimal":


                message =
                `${notification.title}. ${notification.message}`;

            break;



            case "Professional":
            default:


                message =
                `${name}, ${notification.title}. ${notification.message}`;

            break;


        }



        this.speak(
            message
        );


    },


    getVoices(){

        return speechSynthesis.getVoices();

    },


    setVoice(voice){

        voiceSettings.voice =
        voice;

    },


    stop(){

        speechSynthesis.cancel();

    },


    status(){

        return {

            online:true,

            version:this.version,

            xttsAvailable:xttsAvailable

        };

    }


});