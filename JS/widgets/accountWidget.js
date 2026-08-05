/*======================================
        AEGIS ACCOUNT WIDGET v1.0.0
======================================*/


Dashboard.register("accountWidget", {


    title:"Account",

    icon:"👤",

    description:
    "AEGIS account and sync status",

    category:"system",

    size:"small-card",

    movable:true,

    removable:true,

    resizable:true,



    init(){

        this.refresh();

    },
    
    onInit(){

        Dashboard.listen(
            "cloudUpdated",
            "accountWidget"
        );

    },


    refresh(){


        const container =
        document.getElementById(
            "accountWidget"
        );


        if(!container)
        return;



        const cloud =
        Aegis
        .getModule("cloud")
        .api;



        const user =
        cloud.getUser();



        container.innerHTML = `


        <div class="widget-header">

            <h3>
            👤 AEGIS Account
            </h3>

        </div>


        ${
            user ?

            `

            <p>
            🟢 Local Account
            </p>


            <p>
            User:
            ${user.name}
            </p>


            <button id="logoutAccount">

                Logout

            </button>

            `

            :

            `

            <p>
            ⚪ No account connected
            </p>


            <button id="createAccount">

                Create Account

            </button>

            `

        }


        `;



        const logout =
        document.getElementById(
            "logoutAccount"
        );


        if(logout){


            logout.onclick = ()=>{


                cloud.logout();


                this.refresh();


            };


        }



        const create =
        document.getElementById(
            "createAccount"
        );


        if(create){


            create.onclick = ()=>{


                cloud.login({

                    id:
                    crypto.randomUUID(),

                    name:
                    "Ty"


                });


                this.refresh();


            };


        }



    }


});