/*======================================
    AEGIS VOLUME SETTINGS v1.0.0
======================================*/

function wireVolumeSettings(){

    const audio =
    Aegis.getModule("audio")?.api;

    const voice =
    Aegis.getModule("voice")?.api;

    if(!audio || !voice){

        return;

    }

        const masterSlider =
    document.getElementById("masterVolumeSlider");

    const backgroundSlider =
    document.getElementById("backgroundVolumeSlider");

    const voiceSlider =
    document.getElementById("voiceVolumeSlider");

    const clickSlider =
    document.getElementById("clickVolumeSlider");

    const testClickButton =
    document.getElementById("testClickButton");

    if(
        !masterSlider ||
        !backgroundSlider ||
        !voiceSlider ||
        !clickSlider ||
        !testClickButton
    ){

        return;

    }

    masterSlider.value =
    audio.globalVolume;

    backgroundSlider.value =
    audio.masterVolume;

    clickSlider.value =
    audio.effectVolumes.click;

    voiceSlider.value =
    voice.getSettings().volume;

    masterSlider.oninput = (event) => {

        audio.setGlobalVolume(
            Number(event.target.value)
        );

    };

    backgroundSlider.oninput = (event) => {

        audio.setBackgroundVolume(
            Number(event.target.value)
        );

    };

        clickSlider.oninput = (event) => {

        audio.setClickVolume(
            Number(event.target.value)
        );

        audio.playEffect("click");

    };

    voiceSlider.oninput = (event) => {

        voice.setVolume(
            Number(event.target.value)
        );

    };

    testClickButton.onclick = () => {

        console.log(
            "Testing click effect:",
            audio.effects.click,
            "at volume",
            audio.globalVolume * audio.effectVolumes.click
        );

        audio.playEffect("click");

    };

}

    

Aegis.register("volumeSettings", {

    version:"1.0.0",

    init(){

        console.log("Volume settings initialized.");

        Aegis.listen(
            "navigation:settings",
            () => {

                wireVolumeSettings();

            }
        );

    },

    refresh(){

        wireVolumeSettings();

    },

    shutdown(){},

    status(){

        return {

            online:true,

            version:this.version

        };

    }

});