let profile = 
    loadData("profile")[0] || {}


function saveProfile(){

    const name =
    document.getElementById("userName").value;


    const bible =
    document.getElementById("bibleVersion").value;


    const style =
    document.getElementById("assistantStyle").value;

    const city =
    document.getElementById("userCity").value;

    const state =
    document.getElementById("userState").value;

    const country =
    document.getElementById("userCountry").value;

    const temperature =
    document.getElementById("temperatureUnit").value;

    const voiceEnabled =
    document.getElementById("voiceEnabled")?.checked ?? true;

    profile = {

        name: name,

        city: city,

        state: state,

        country: country,

        temperature: temperature,

        bible: bible,

        style: style,

        voiceEnabled: voiceEnabled,

        latitude:null,

        longitude:null,
    };


    saveData(
        "profile",
        [profile]
    );

    syncProfileToCloud();
    
    if(
        Aegis.getModule("cloud")
    ){

        Aegis
        .getModule("cloud")
        .api
        .syncProfile(profile);

    }

    document.getElementById(
        "profileStatus"
    ).innerText =
    "Profile Saved.";


    console.log(
        "Profile saved:",
        profile
    );


    Aegis.broadcast(
        "profileUpdated"
    );

}

async function syncProfileToCloud(){

    const cloud =
    Aegis
    .getModule("cloud")
    ?.api;


    const user =
    cloud.getUser();


    if(!user){

        console.log(
            "No cloud user. Skipping sync."
        );

        return;

    }


    await cloud.syncProfile(profile);

}

async function loadCloudProfile(){

    const cloud =
    Aegis
    .getModule("cloud")
    ?.api;


    const cloudProfile =
    await cloud.loadProfileFromCloud();



    if(!cloudProfile){

        console.log(
            "No cloud profile found."
        );

        return;

    }



    profile = {


        name:
        cloudProfile.name,


        city:
        cloudProfile.city,


        state:
        cloudProfile.state,


        country:
        cloudProfile.country,


        temperature:
        cloudProfile.temperature,


        bible:
        cloudProfile.bible,


        style:
        cloudProfile.style


    };



    saveData(
        "profile",
        [profile]
    );


    Aegis.broadcast(
        "profileUpdated"
    );


    console.log(
        "Local profile updated from cloud:",
        profile
    );

}
function loadProfile(){


if(profile.name){


document.getElementById(
"userName"
).value =
profile.name;


document.getElementById(
"bibleVersion"
).value =
profile.bible;


document.getElementById(
"assistantStyle"
).value =
profile.style;

document.getElementById(
"userCity"
).value =
profile.city || "";

document.getElementById(
"userState"
).value =
profile.state || "";

document.getElementById(
"userCountry"
).value =
profile.country || "";

document.getElementById(
"temperatureUnit"
).value =
profile.temperature || "F";

const voiceToggle =
document.getElementById("voiceEnabled");


if(voiceToggle){

    voiceToggle.checked =
    profile.voiceEnabled !== false;

}

}


}



Aegis.register("profile", {

    version: "1.1.5",

    init() {
        
        
        console.log("Profile initialized.");

    },
    onInit(){

        Aegis.listen(
            "cloudUpdated",
            "profile"
        );

    },

    onRefresh(){

        loadCloudProfile();

    },

    refresh() {

        loadProfile();

    },

    getProfile() {

        const profile = loadData("profile");

        if (profile.length === 0) {

            return {

            name: "there",

            city: "",

            state: "",

            country: "",

            temperature: "F",

            bible: "NIV",

            style: "Professional",
            
            voiceEnabled:true
        };

    }

        return profile[0];

    },

    shutdown() {

        console.log("Profile shutting down.");

    },

    status() {

        return {
            online: true,
            version: this.version
        };

    }

});

window.loadCloudProfile =
loadCloudProfile;