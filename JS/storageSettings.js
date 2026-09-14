/*======================================
    AEGIS STORAGE SETTINGS v1.0.0
======================================*/

function getStorageBreakdown(){

    const keys = [

        "events",

        "reminders",

        "categories",

        "profile",

        "notifications",

        "notifiedItems",

        "weatherAlerts",

        "audioSettings",

        "voiceVolume",

        "aegisWidgetSettings",

        "aegisDashboardLayout"

    ];

    let total = 0;

    const breakdown = keys.map(key => {

        const raw =
        localStorage.getItem(key);

        const bytes =
        raw ? new Blob([raw]).size : 0;

        total += bytes;

        return { key, bytes };

    });

    return { breakdown, total };

}

function formatBytes(bytes){

    if(bytes < 1024){

        return `${bytes} B`;

    }

    return `${(bytes / 1024).toFixed(1)} KB`;

}

function renderStorageUsage(){

    const container =
    document.getElementById("storageUsage");

    if(!container) return;

    const { breakdown, total } =
    getStorageBreakdown();

    const rows = breakdown
    .filter(item => item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .map(item => `

        <div class="widget-item">

            <strong>
                ${item.key}
            </strong>

            ${formatBytes(item.bytes)}

        </div>

    `)
    .join("");

    container.innerHTML = `

        <div class="widget-item">

            <strong>
                Total Used
            </strong>

            ${formatBytes(total)}

        </div>

        ${rows || `

            <p class="empty-state">
                No local data stored yet.
            </p>

        `}

    `;

}

function clearLocalData(){

    const confirmed =
    confirm(

        "This will permanently delete all locally stored events, reminders, categories, and profile data on this device. Data already synced to your cloud account will not be affected. Continue?"

    );

    if(!confirmed){

        return;

    }

    const keysToRemove = [

        "events",

        "reminders",

        "categories",

        "profile",

        "notifications",

        "notifiedItems",

        "weatherAlerts"

    ];

    keysToRemove.forEach(key => {

        localStorage.removeItem(key);

    });

    console.log(
        "Local data cleared:",
        keysToRemove
    );

    location.reload();

}

Aegis.register("storageSettings", {

    version:"1.0.0",

    init(){

        console.log(
            "Storage settings initialized."
        );

        Aegis.listen(
            "navigation:settings",
            () => {

                renderStorageUsage();

                const clearButton =
                document.getElementById(
                    "clearLocalDataButton"
                );

                if(clearButton){

                    clearButton.onclick =
                    clearLocalData;

                }

            }
        );

    },

    refresh(){

        renderStorageUsage();

    },

    shutdown(){},

    status(){

        return {

            online:true,

            version:this.version

        };

    }

});