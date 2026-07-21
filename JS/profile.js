let profile =
loadData("profile")[0] || {};


function saveProfile(){


profile = {

name:
document.getElementById(
"userName"
).value,


bible:
document.getElementById(
"bibleVersion"
).value,


style:
document.getElementById(
"assistantStyle"
).value

};



saveData(
"profile",
[profile]
);



document.getElementById(
"profileStatus"
).innerText =
"Profile Saved.";

}

Aegis.broadcast("profileUpdated");

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


}


}



Aegis.register("profile", {

    version: "1.1.5",

    init() {

        console.log("Profile initialized.");

    },

    refresh() {

        loadProfile();

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