let dailyVerse = null;


async function loadVerse(){


    try{


        let response =
        await fetch(
            "https://beta.ourmanna.com/api/v1/get/?format=json"
        );


        let data =
        await response.json();



        dailyVerse = {

            text:
            data.verse.details.text,


            reference:
            data.verse.details.reference

        };


        Aegis.broadcast(
            "verseUpdated"
        );


    }


    catch(error){

        console.error(
            "Unable to load verse.",
            error
        );

    }

}



Aegis.register("bible", {

    version: "1.1.5",


    getDailyVerse(){

        return dailyVerse;

    },



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