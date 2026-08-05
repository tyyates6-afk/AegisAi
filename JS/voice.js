/*======================================
        AEGIS VOICE MODULE v1.0.0
======================================*/
let voiceSettings = {

    volume:0.9,

    provider:"browser",

    voice:null,

    queue:[]

};

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

Aegis.register("voice", {

    version:"1.0.0",


    enabled:true,
    volume:0.9,

    currentVoice:null,


    getSettings(){

        return {

            enabled:this.enabled,

            volume:this.volume,

            voice:this.currentVoice

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


    setVolume(value){

        this.volume =
        value;


        Aegis.broadcast(
            "voiceUpdated"
        );

    },

    init(){

        console.log(
            "Voice system initialized."
        );


        loadDefaultVoice();


        speechSynthesis.onvoiceschanged =
        ()=>{

            loadDefaultVoice();

        };


    },


    speak(text){

        if(!this.enabled){
            return;
        }


        if(!("speechSynthesis" in window)){

            console.warn(
                "Speech synthesis unavailable."
            );

            return;

        }


        const profile =
            Aegis
            .getModule("profile")
            ?.api
            .getProfile();


            const style =
            profile?.style || "Professional";



            const utterance =
            new SpeechSynthesisUtterance(text);

            if(
                voiceSettings.voice
            ){

                utterance.voice =
                voiceSettings.voice;

            }

            switch(style){


                case "Jarvis":

                    utterance.rate = 0.95;

                    utterance.pitch = 0.85;

                    utterance.volume =
                    voiceSettings.volume;

                break;



                case "Friendly":

                    utterance.rate = 1.05;

                    utterance.pitch = 1.15;

                    utterance.volume =
                    voiceSettings.volume;

                break;



                case "Minimal":

                    utterance.rate = 1;

                    utterance.pitch = 1;

                    utterance.volume =
                    voiceSettings.volume;

                break;



                case "Professional":

                default:

                    utterance.rate = 0.95;

                    utterance.pitch = 1;

                    utterance.volume =
                    voiceSettings.volume;

                break;


            }



            voiceSettings.queue.push(
                utterance
            );


            processVoiceQueue();


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

            version:this.version

        };

    }


});