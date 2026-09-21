/*======================================
        AEGIS VOICE MODULE v1.1.0
        Tiered TTS: local XTTS → ElevenLabs → Browser
======================================*/

// ---- Config ----

const XTTS_LOCAL_URL = "http://localhost:8020/tts";
const XTTS_PING_URL = "http://localhost:8020/health";
const XTTS_PING_TIMEOUT_MS = 800;

const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// ElevenLabs credentials live in localStorage, not hardcoded here:
//   localStorage.setItem("elevenLabsApiKey", "sk_...")
//   localStorage.setItem("elevenLabsVoiceId", "your_voice_id")

let voiceSettings = {

    volume:0.9,

    provider:"browser",

    voice:null,

    queue:[]

};

let voiceAudioContext = null;
let voicePlaybackChain = Promise.resolve();

function getVoiceAudioContext(){

    if(!voiceAudioContext){

        voiceAudioContext =
        new (window.AudioContext || window.webkitAudioContext)();

    }

    if(voiceAudioContext.state === "suspended"){

        voiceAudioContext.resume().catch(()=>{});

    }

    return voiceAudioContext;

}

function playArrayBufferThroughGain(arrayBuffer, volume){

    const context =
    getVoiceAudioContext();

    return context
    .decodeAudioData(arrayBuffer.slice(0))
    .then(audioBuffer => {

        return new Promise((resolve, reject) => {

            const source =
            context.createBufferSource();

            source.buffer =
            audioBuffer;

            const gain =
            context.createGain();

            gain.gain.value =
            volume;

            source.connect(gain);
            gain.connect(context.destination);

            source.onended = resolve;

            try{

                source.start(0);

            }
            catch(error){

                reject(error);

            }

        });

    });

}

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

// ---- Fallback chain helpers ----

async function checkXttsAvailable(){

    const controller =
    new AbortController();

    const timeout =
    setTimeout(
        () => controller.abort(),
        XTTS_PING_TIMEOUT_MS
    );

    try{

        const response =
        await fetch(XTTS_PING_URL, {

            method:"GET",

            signal:controller.signal

        });

        clearTimeout(timeout);

        return response.ok;

    }
    catch(error){

        clearTimeout(timeout);

        return false;

    }

}

async function speakWithXtts(text, volume){

    const response =
    await fetch(XTTS_LOCAL_URL, {

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({ text })

    });

    if(!response.ok){

        throw new Error(
            `XTTS request failed: ${response.status}`
        );

    }

    const arrayBuffer =
    await response.arrayBuffer();

    await playArrayBufferThroughGain(
        arrayBuffer,
        volume
    );

}

async function speakWithElevenLabs(text, volume){

    const apiKey =
    localStorage.getItem("elevenLabsApiKey");

    const voiceId =
    localStorage.getItem("elevenLabsVoiceId");

    if(!apiKey || !voiceId){

        throw new Error(
            "ElevenLabs not configured."
        );

    }

    const response =
    await fetch(
        `${ELEVENLABS_TTS_URL}/${voiceId}`,
        {

            method:"POST",

            headers:{

                "Content-Type":"application/json",

                "xi-api-key":apiKey

            },

            body:JSON.stringify({

                text,

                model_id:"eleven_turbo_v2_5",

                voice_settings:{

                    stability:0.5,

                    similarity_boost:0.75

                }

            })

        }
    );

    if(!response.ok){

        throw new Error(
            `ElevenLabs request failed: ${response.status}`
        );

    }

    const arrayBuffer =
    await response.arrayBuffer();

    await playArrayBufferThroughGain(
        arrayBuffer,
        volume
    );

}

function speakWithBrowser(text, style, volume){

    if(!("speechSynthesis" in window)){

        console.warn(
            "Speech synthesis unavailable."
        );

        return;

    }

    const utterance =
    new SpeechSynthesisUtterance(text);

    if(voiceSettings.voice){

        utterance.voice =
        voiceSettings.voice;

    }

    switch(style){

        case "Jarvis":

            utterance.rate = 0.95;
            utterance.pitch = 0.85;
            utterance.volume = volume;

        break;

        case "Friendly":

            utterance.rate = 1.05;
            utterance.pitch = 1.15;
            utterance.volume = volume;

        break;

        case "Minimal":

            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = volume;

        break;

        case "Professional":
        default:

            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.volume = volume;

        break;

    }

    voiceSettings.queue.push(utterance);

    processVoiceQueue();

}

Aegis.register("voice", {

    version:"1.1.0",


    enabled:true,
    volume:0.9,

    currentVoice:null,

    xttsAvailable:false,


    getSettings(){

        return {

            enabled:this.enabled,

            volume:voiceSettings.volume,

            voice:this.currentVoice,

            engine:
                this.xttsAvailable ? "xtts" :
                (localStorage.getItem("elevenLabsApiKey") ? "elevenlabs" : "browser")

        };

    },


    toggle(){

        this.enabled =
        !this.enabled;


        Aegis.broadcast(
            "voiceUpdated"
        );


        return this.enabled;

    },


    async init(){

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

        // One quick reachability check per app load —
        // no manual toggle needed.
        this.xttsAvailable =
        await checkXttsAvailable();

        console.log(
            this.xttsAvailable
            ? "🎙️ Local XTTS detected — using it as the primary voice."
            : "🎙️ No local XTTS found — will use ElevenLabs/browser voice."
        );

        Aegis.broadcast("voiceUpdated");

    },


    speak(text){

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


        const globalVolume =
        Aegis.getModule("audio")
        ?.api
        .globalVolume ?? 1;


        const effectiveVolume =
        voiceSettings.volume *
        globalVolume;

        // Chained so overlapping calls play in order instead
        // of stacking on top of each other.
        voicePlaybackChain =
        voicePlaybackChain
        .then(async () => {

            if(this.xttsAvailable){

                try{

                    await speakWithXtts(
                        text,
                        effectiveVolume
                    );

                    return;

                }
                catch(error){

                    console.warn(
                        "XTTS failed, falling back to ElevenLabs:",
                        error
                    );

                    this.xttsAvailable = false;

                }

            }

            try{

                await speakWithElevenLabs(
                    text,
                    effectiveVolume
                );

                return;

            }
            catch(error){

                console.warn(
                    "ElevenLabs unavailable, falling back to browser voice:",
                    error
                );

            }

            speakWithBrowser(
                text,
                style,
                effectiveVolume
            );

        })
        .catch(error => {

            console.error(
                "Voice playback chain error:",
                error
            );

        });

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


    setVolume(value){

        voiceSettings.volume =
        value;

        saveData(
            "voiceVolume",
            [{ volume:value }]
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

        voicePlaybackChain =
        Promise.resolve();

    },


    async recheckXtts(){

        this.xttsAvailable =
        await checkXttsAvailable();

        Aegis.broadcast("voiceUpdated");

        return this.xttsAvailable;

    },


    status(){

        return {

            online:true,

            version:this.version,

            xttsAvailable:this.xttsAvailable

        };

    }


});