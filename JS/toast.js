Aegis.register("toast", {

    version:"1.0.0",


    container:null,


    init(){

        this.container =
        document.createElement(
            "div"
        );


        this.container.id =
        "aegis-toast-container";


        document.body.appendChild(
            this.container
        );


        console.log(
            "Toast Manager initialized."
        );

    },


    show(notification){


        if(!this.container){

            this.init();

        }



        const toast =
        document.createElement(
            "div"
        );


        toast.className =
        "aegis-toast";


        toast.innerHTML = `

        <div class="toast-icon">

        ${notification.icon || "🔔"}

        </div>


        <div class="toast-content">

        <strong>

        ${notification.title}

        </strong>


        <p>

        ${notification.message}

        </p>

        </div>


        <button>

        ×

        </button>

        `;



        toast
        .querySelector("button")
        .onclick = ()=>{

            toast.remove();

        };



        this.container.appendChild(
            toast
        );


        setTimeout(()=>{

            toast.remove();

        },8000);


    }

});