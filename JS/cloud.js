/*======================================
        AEGIS CLOUD MODULE v1.0.0
======================================*/

const SUPABASE_URL =
"https://tgsrvnbzxufwsskuerhv.supabase.co";


const SUPABASE_KEY =
"sb_publishable_R2wr2I-2lLboaE0zc9In5g_SzmrTACw";


const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let cloudUser = null;

let cloudConnected = false;



Aegis.register("cloud", {


    version:"1.0.0",

    syncProfile(profile){

        console.log(
            "Preparing profile sync:",
            profile
        );


        /*
            Later:

            send profile
            to Supabase

        */


        return true;

    },

    async init(){

        console.log(
            "Cloud system initialized."
        );


        this.loadSession();


        await this.testConnection();


    },
    async testConnection(){

        const {
            data,
            error
        } =
        await supabaseClient
        .from("profiles")
         .select("*")
         .limit(1);


          if(error){

               console.error(
                 "Supabase connection failed:",
                    error
              );

              return false;

           }


            console.log(
                "Supabase connected:",
                data
            );


            return true;

        },


    loadSession(){


        const saved =

        loadData(
            "cloudUser"
        );



        if(
            saved &&
            saved.length
        ){


            cloudUser =
            saved[0];


            cloudConnected =
            true;


            console.log(
                "Cloud session loaded:",
                cloudUser
            );


        }
        else{


            console.log(
                "No cloud session."
            );


        }


    },



    login(user){


        cloudUser =
        user;



        saveData(

            "cloudUser",

            [
                user
            ]

        );



        cloudConnected =
        true;



        Aegis.broadcast(
            "cloudUpdated"
        );



        console.log(
            "Cloud login:",
            user
        );


    },



    logout(){


        cloudUser =
        null;



        saveData(

            "cloudUser",

            []

        );



        cloudConnected =
        false;



        Aegis.broadcast(
            "cloudUpdated"
        );



        console.log(
            "Cloud logout"
        );


    },



    getUser(){


        return cloudUser;


    },



    isConnected(){


        return cloudConnected;


    },



    status(){


        return {


            online:true,


            version:this.version,


            connected:
            cloudConnected,


            user:
            cloudUser


        };


    }



});