const DragManager = {
    activeCard:null,

    isDragging:false,

   

    init(){

        document
        .querySelectorAll(
            ".dashboard-card"
        )
        .forEach(card=>{


            card.addEventListener(
                "pointerdown",
                this.pointerDown
            );


            card.addEventListener(
                "pointermove",
                this.pointerMove
            );


            card.addEventListener(
                "pointerup",
                this.pointerUp
            );


            card.addEventListener(
                "pointercancel",
                this.pointerUp
            );


        });


    },



    dragged:null,



    dragStart(event){

        DragManager.dragged =
        this;


        this.style.opacity =
        "0.5";


    },



    dragOver(event){

        event.preventDefault();


    },



    drop(event){

        event.preventDefault();


        if(
            !DragManager.dragged ||
            DragManager.dragged === this
        ){

            return;

        }



        const grid =
        document.querySelector(
            ".dashboard-grid"
        );



        const cards =
        [...grid.children];



        const draggedIndex =
        cards.indexOf(
            DragManager.dragged
        );


        const targetIndex =
        cards.indexOf(
            this
        );



        if(
            draggedIndex <
            targetIndex
        ){

            this.after(
                DragManager.dragged
            );

        }

        else{

            this.before(
                DragManager.dragged
            );

        }



        DragManager.dragged.style.opacity =
        "1";



        DragManager.save();


    },

    save(){


        const layout =

        [
            ...document
            .querySelectorAll(
                ".dashboard-card"
            )
        ]

        .map(card=>card.id);



        localStorage.setItem(

            "aegisDashboardLayout",

            JSON.stringify(
                layout
            )

        );


        Dashboard.layout =
        layout;


        console.log(
            "Dashboard Layout Saved",
            layout
        );


    },
    pointerDown(event){


    if(
        event.pointerType === "mouse" &&
        event.button !== 0
    ){

        return;

    }


    if(!Dashboard.editMode){
        return;
    }
    

    event.preventDefault();
    },

    pointerMove(event){


        if(
            !DragManager.isDragging ||
            !DragManager.activeCard
        ){
            return;
        }
        event.preventDefault();

        const element =
        document.elementFromPoint(
            event.clientX,
            event.clientY
        );


        const target =
        element?.closest(
            ".dashboard-card"
        );


        if(
            target &&
            target !== DragManager.activeCard
        ){


            const cards =
            [
                ...document.querySelectorAll(
                    ".dashboard-card"
                )
            ];


            const from =
            cards.indexOf(
                DragManager.activeCard
            );


            const to =
            cards.indexOf(
                target
            );


            if(from < to){

                target.after(
                    DragManager.activeCard
                );

            }
            else{

                target.before(
                    DragManager.activeCard
                );

            }

        }

    },



    pointerUp(){


        if(
            !DragManager.activeCard
        ){
            return;
        }


        DragManager.activeCard.classList.remove(
            "dragging"
        );


        DragManager.save();


        DragManager.activeCard =
        null;


        DragManager.isDragging =
        false;


    }

};