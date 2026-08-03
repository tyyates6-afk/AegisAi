Aegis.register("audio", {

    version:"1.0.0",

    sounds:{

        notification:
        "assets/audio/notification.mp3",

        reminder:
        "assets/audio/reminder.mp3",

        startup:
        "assets/audio/startup.mp3"

    },


    ambience:null,


    volume:0.5,


    init(){

        console.log(
            "Audio Manager initialized."
        );

    },


    play(name){

        const file =
        this.sounds[name];


        if(!file)
            return;


        const audio =
        new Audio(file);


        audio.volume =
        this.volume;


        audio.play()
        .catch(error=>{

            console.warn(
                "Audio blocked:",
                error
            );

        });

    },


    setVolume(value){

        this.volume =
        value;

    },


    startAmbience(file){

        this.stopAmbience();


        this.ambience =
        new Audio(file);


        this.ambience.loop = true;

        this.ambience.volume =
        this.volume * 0.3;


        this.ambience.play();

    },


    stopAmbience(){

        if(this.ambience){

            this.ambience.pause();

            this.ambience = null;

        }

    },


    shutdown(){

        this.stopAmbience();

    }


});