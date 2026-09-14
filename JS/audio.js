/*======================================
        AEGIS AUDIO ENGINE v1.1.0
======================================*/

Aegis.register("audio", {

    version: "1.1.0",

    layers: {},

    layerGains: {},

    audioContext: null,

    effects: {},

    masterVolume: 0.30,

    globalVolume: 1.0,

    unlocked: false,

    currentState: "idle",

    fadeTimers: {},

        init(){

        console.log("Audio Engine initialized.");

        this.loadLayers();

        this.loadVolumeSettings();

        const unlock = ()=>{

            this.unlock();

            document.removeEventListener(
                "pointerdown",
                unlock
            );

            document.removeEventListener(
                "keydown",
                unlock
            );

        };

        document.addEventListener(
            "pointerdown",
            unlock,
            {once:true}
        );

        document.addEventListener(
            "keydown",
            unlock,
            {once:true}
        );

        // Play a click effect for any button press,
        // app-wide. Delegated on document so it covers
        // buttons rendered later (dashboard cards,
        // dynamic lists) without needing extra wiring.

        document.addEventListener(
            "click",
            (event)=>{

                if(event.target.closest("button")){

                    this.playEffect("click");

                }

            }
        );

    },

    loadVolumeSettings(){

        const saved =
        loadData("audioSettings")[0];

        if(!saved){

            return;

        }

        if(typeof saved.global === "number"){

            this.globalVolume = saved.global;

        }

        if(typeof saved.background === "number"){

            this.masterVolume = saved.background;

        }

        if(typeof saved.clicks === "number"){

            this.effectVolumes.click = saved.clicks;

        }

    },

    saveVolumeSettings(){

        saveData("audioSettings", [{

            global:this.globalVolume,

            background:this.masterVolume,

            clicks:this.effectVolumes.click

        }]);

    },

    setGlobalVolume(value){

        this.globalVolume = value;

        this.saveVolumeSettings();

        this.setState(this.currentState);

    },

    setBackgroundVolume(value){

        this.masterVolume = value;

        this.saveVolumeSettings();

        this.setState(this.currentState);

    },

    setClickVolume(value){

        this.effectVolumes.click = value;

        this.saveVolumeSettings();

    },
    states:{

        idle: {
            reactor: 1.0
        },

        focus: {
            reactor: 0.45,
            focus: 1.0
        },

        thinking: {
            reactor: 0.75,
            thinking: 1.0
        },

        night: {
            night: 1.0
        }

    },

    setState(stateName){

        const state = this.states[stateName];

        if(!state){
            return;
        }

        this.currentState = stateName;

        Object.keys(this.layers).forEach(layerName=>{

            const target =
            state[layerName] || 0;

            const volume =
            target * this.masterVolume * this.globalVolume;

            const layer =
            this.layers[layerName];

            if(target > 0){

                if(layer.paused){

                    layer.play().catch(()=>{});

                }

                this.fadeTo(
                    layerName,
                    volume,
                    2000
                );

            }else{

                this.fadeTo(
                    layerName,
                    0,
                    2000
                );

                setTimeout(()=>{

                    const gainNode =
                    this.layerGains[layerName];

                    if(gainNode && gainNode.gain.value <= 0.01){

                        layer.pause();

                    }

                },2000);

            }

        });

    },

    effects: {

        notification:
        "assets/audio/effects/notification.mp3",

        success:
        "assets/audio/effects/success.mp3",

        error:
        "assets/audio/effects/error.mp3",

        click:
        "assets/audio/effects/click.mp3"

    },

    effectVolumes: {

        notification: 0.7,

        success: 0.5,

        error: 0.8,

        click: 0.15

    },

    playEffect(effectName){

        const file =
        this.effects[effectName];


        if(!file){

            console.warn(
                "Effect not found:",
                effectName
            );

            return;

        }


        const sound =
        new Audio(file);

        sound.crossOrigin =
        "anonymous";


        // iOS Safari ignores HTMLMediaElement.volume entirely —
        // the only way to control an <audio> element's level
        // there is by routing it through a Web Audio GainNode.
        // This also works identically everywhere else, so it
        // fully replaces setting sound.volume directly.

        if(this.audioContext){

            if(this.audioContext.state === "suspended"){

                this.audioContext.resume();

            }

            const source =
            this.audioContext.createMediaElementSource(sound);

            const gainNode =
            this.audioContext.createGain();

            gainNode.gain.value =
            this.globalVolume *
            (this.effectVolumes[effectName] || 1);

            source.connect(gainNode);

            gainNode.connect(
                this.audioContext.destination
            );

        }
        else{

            // Very old browser without Web Audio support —
            // fall back to plain volume (works everywhere
            // except iOS Safari, which is the case this
            // whole rewrite exists to fix).

            sound.volume =
            this.globalVolume *
            (this.effectVolumes[effectName] || 1);

        }


        sound.play()
        .catch(error=>{

            console.warn(
                "Audio blocked:",
                error
            );

        });

    },
    loadLayers(){

        this.layers = {

            reactor: new Audio("assets/audio/core_ambience.mp3"),

            night: new Audio("assets/audio/core_night.mp3"),

            focus: new Audio("assets/audio/core_focus.mp3"),

            thinking: new Audio("assets/audio/thinking.mp3")

        };

        Object.values(this.layers).forEach(layer=>{

            layer.loop = true;

            layer.volume = 1;

            layer.preload = "auto";

            layer.crossOrigin = "anonymous";

        });


        // Set up the Web Audio graph: each background layer
        // gets its own GainNode, which is what the sliders in
        // Settings actually control from now on — see the note
        // in playEffect() above for why .volume alone won't work.

        const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

        if(AudioContextClass && !this.audioContext){

            this.audioContext =
            new AudioContextClass();

        }

        if(this.audioContext){

            Object.entries(this.layers).forEach(
                ([layerName, layer]) => {

                    const source =
                    this.audioContext.createMediaElementSource(
                        layer
                    );

                    const gainNode =
                    this.audioContext.createGain();

                    gainNode.gain.value = 0;

                    source.connect(gainNode);

                    gainNode.connect(
                        this.audioContext.destination
                    );

                    this.layerGains[layerName] =
                    gainNode;

                }
            );

        }
        else{

            console.warn(
                "Web Audio API unavailable — volume sliders will not work on this browser."
            );

        }

    },
    
    unlock(){

        if(this.unlocked){
            return;
        }

        this.unlocked = true;

        console.log("🔊 Audio Engine Unlocked");

        if(
            this.audioContext &&
            this.audioContext.state === "suspended"
        ){

            this.audioContext.resume();

        }

        Object.values(this.layers).forEach(layer=>{

            layer.play().catch(()=>{});

            layer.pause();

            layer.currentTime = 0;

        });

        this.setState("idle");

    },
    refresh(){},
    
    
    start(layerName){

        const layer = this.layers[layerName];

        if(!layer){
            return;
        }

        this.fadeTo(layerName, 0, 0);

        layer.play().catch(()=>{});

        this.fadeTo(
            layerName,
            this.masterVolume * this.globalVolume,
            2500
        );

    },

    fadeTo(layerName, targetVolume, duration = 2500){

        const gainNode =
        this.layerGains[layerName];

        const layer =
        this.layers[layerName];

        if(!gainNode || !layer){
            return;
        }

        clearInterval(this.fadeTimers[layerName]);

        const startVolume = gainNode.gain.value;

        const difference = targetVolume - startVolume;

        const fps = 60;

        const steps = Math.max(1, Math.floor(duration / (1000 / fps)));

        let currentStep = 0;

        this.fadeTimers[layerName] = setInterval(()=>{

            currentStep++;

            gainNode.gain.value =
            startVolume +
            (difference * (currentStep / steps));

            if(currentStep >= steps){

                gainNode.gain.value = targetVolume;

                clearInterval(
                    this.fadeTimers[layerName]
                );

            }

        },1000 / fps);

    },

    stop(layerName){

        const layer = this.layers[layerName];

        if(!layer){
            return;
        }

        this.fadeTo(
            layerName,
            0,
            1500
        );

        setTimeout(()=>{

            layer.pause();

            layer.currentTime = 0;

        },1500);

    },

    shutdown(){},

        status(){

        return{

            online: true,

            state: this.currentState,

            layers: Object.keys(this.layers).length,

            globalVolume: this.globalVolume,

            backgroundVolume: this.masterVolume,

            clickVolume: this.effectVolumes.click,

            audioContextState:
            this.audioContext?.state || "unavailable"

        };

    }

});