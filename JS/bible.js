async function loadVerse(){


try{


let response =
await fetch(
"https://beta.ourmanna.com/api/v1/get/?format=json"
);



let data =
await response.json();



document.getElementById(
"verse"
).innerHTML =

data.verse.details.text
+
"<br><br>— "
+
data.verse.details.reference;



}

catch(error){


document.getElementById(
"verse"
).innerText =
"Unable to load verse.";


}


}



Aegis.register("bible", {

    version: "1.1.5",

    init() {

        console.log("Bible initialized.");

        loadVerse();

    },

    refresh() {

        loadVerse();

    },

    shutdown() {},

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});