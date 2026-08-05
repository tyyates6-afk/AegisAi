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
            🟢 Cloud Connected
            </p>


            <p>
            Email:
            ${user.email}
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


            <input
            id="accountEmail"
            placeholder="Email"
            >


            <input
            id="accountPassword"
            type="password"
            placeholder="Password"
            >


            <button id="createAccount">

            Create Account

            </button>


            <button id="loginAccount">

            Login

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


                const email =
                document.getElementById(
                    "accountEmail"
                ).value;


                const password =
                document.getElementById(
                    "accountPassword"
                ).value;



                cloud.createAccount(
                    email,
                    password
                );


            };

        }



        const login =
        document.getElementById(
            "loginAccount"
        );


        if(login){

            login.onclick = ()=>{


                const email =
                document.getElementById(
                    "accountEmail"
                ).value;


                const password =
                document.getElementById(
                    "accountPassword"
                ).value;



                cloud.login(
                    email,
                    password
                );


            };

        }

        



    }


});