const DragManager = {
    touchCard:null,

    touchStartY:0,

    init(){


        document
        .querySelectorAll(
            ".dashboard-card"
        )
        .forEach(card=>{


            card.draggable = true;


            card.addEventListener(
                "dragstart",
                this.dragStart
            );


            card.addEventListener(
                "dragover",
                this.dragOver
            );


            card.addEventListener(
                "drop",
                this.drop
            );

            card.addEventListener(
                "touchstart",
                this.touchStart,
                {passive:false}
            );


            card.addEventListener(
                "touchmove",
                this.touchMove,
                {passive:false}
            );


            card.addEventListener(
                "touchend",
                this.touchEnd
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
    touchStart(event){


        if(!Dashboard.editMode){
            return;
        }


        event.preventDefault();


        DragManager.touchCard =
        this;


        this.classList.add(
            "dragging"
        );


        this.style.opacity =
        "0.6";


    },



    touchMove(event){


        if(!DragManager.touchCard){
            return;
        }


        event.preventDefault();


        const touch =
        event.touches[0];


        const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


        const card =
        target.closest(
            ".dashboard-card"
        );


        if(
            card &&
            card !== DragManager.touchCard
        ){


            const grid =
            document.querySelector(
                ".dashboard-grid"
            );


            const cards =
            [...grid.children];


            const from =
            cards.indexOf(
                DragManager.touchCard
            );


            const to =
            cards.indexOf(
                card
            );


            if(from < to){

                card.after(
                    DragManager.touchCard
                );

            }
            else{

                card.before(
                    DragManager.touchCard
                );

            }

        }


    },



    touchEnd(){


        if(!DragManager.touchCard){
            return;
        }


        DragManager.touchCard.classList.remove(
            "dragging"
        );


        DragManager.touchCard.style.opacity =
        "1";


        DragManager.save();


        DragManager.touchCard =
        null;


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


    }


};