const WidgetRegistry = {

    widgets: {},

    register(widget){

        this.widgets[widget.id] = widget;

        console.log(
            "✓ Widget Registered:",
            widget.id
        );

    },

    get(id){

        return this.widgets[id];

    },

    getAll(){

        return Object.values(
            this.widgets
        );

    }

};