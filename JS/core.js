/*======================================
        AEGIS CORE v1.1.5
======================================*/

const Aegis = {

    modules: {},

    listeners: {},

    register(name, module) {

    this.modules[name] = {

        name: name,

        version: module.version || "1.0.0",

        status: "REGISTERED",

        loadedAt: new Date(),

        api: module

    };

    console.log(
    `✓ ${name} v${this.modules[name].version} REGISTERED`
    );

},

    run(name, method, ...args) {

    const module = this.modules[name];

    if (!module) {

        console.error(
            `Module "${name}" not found.`
        );

        return;

    }

    const fn = module.api[method];

    if (typeof fn !== "function") {

        console.error(
            `${name}.${method}() does not exist.`
        );

        return;

    }

    return fn(...args);

},

    refreshAll(){

        Object.values(this.modules).forEach(module => {

            if (typeof module.api.refresh === "function") {

                try {

                    module.api.refresh();

                } catch (error) {

                    console.error(
                        `Failed to refresh ${module.name}`,
                        error
                    );

                }

            }

        });

    },

    broadcast(eventName, data = null){

        window.dispatchEvent(

            new CustomEvent(eventName, {

                detail: data

            })

        );

    },

    listen(eventName, callback){

        window.addEventListener(

            eventName,

            (event)=>{

                callback(event.detail);

            }

        );

    },

    systemStatus() {

        console.table(

            Object.values(this.modules).map(module => ({

                Module: module.name,

                Version: module.version,

                Status: module.status,

                Loaded: module.loadedAt.toLocaleTimeString()

            }))

        );

    },

    

initmodules(){
    const bootStart = performance.now();
    console.log("==========");
    console.log("Starting AEGIS...");
    console.log("==========");

    Object.values(this.modules).forEach(module => {
        module.status = "INITIALIZING";

        
        if(typeof module.api.init === "function"){

            console.log(`Initializing ${module.name}...`);

            try {

                module.api.init();
                
                module.status = "ONLINE";

                console.log(`🟢 ${module.name} ONLINE`);

            } catch (error) {

                module.status = "ERROR";

                console.error(`🔴 ${module.name} ERROR`, error);
                

            }

        }

    });

    console.log("==========");
    console.log("AEGIS READY");
    console.log("==========");
    const bootEnd = performance.now();

    console.log(
        `Boot completed in ${(bootEnd - bootStart).toFixed(2)} ms`
    );
},

};

console.log("AEGIS CORE ONLINE");

window.addEventListener(

    "DOMContentLoaded",

    () => {

        Aegis.initmodules();

    }

);

getModule(name);{
    return this.modules[name];

};

refresh(name);{

    const module = this.modules[name];

    if (!module) return;

    if (typeof module.api.refresh === "function") {

        module.api.refresh();

    }

};