/*======================================
        AEGIS WORKSPACE MODULE v1.0.0
======================================*/

let workspaceDocuments =
loadData("workspaceDocuments") || [];

let activeWorkspaceDocId = null;

let workspaceAutosaveTimer = null;


function createWorkspaceDocument(){

    const doc = {

        id: Date.now(),

        title: "Untitled Document",

        type: "document",

        content: "",

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

    };

    workspaceDocuments.unshift(doc);

    saveData(
        "workspaceDocuments",
        workspaceDocuments
    );

    activeWorkspaceDocId = doc.id;

    renderWorkspaceList();

    renderWorkspaceEditor();

    syncWorkspaceDocument(doc);

    Aegis.broadcast("workspaceUpdated");

}


function selectWorkspaceDocument(id){

    activeWorkspaceDocId = id;

    renderWorkspaceList();

    renderWorkspaceEditor();

}


function getActiveWorkspaceDocument(){

    return workspaceDocuments.find(
        doc => doc.id === activeWorkspaceDocId
    ) || null;

}


function localSaveActiveDocument(){

    const doc =
    getActiveWorkspaceDocument();

    if(!doc) return;

    const titleInput =
    document.getElementById(
        "workspaceDocTitle"
    );

    const editor =
    document.getElementById(
        "workspaceDocContent"
    );

    if(!titleInput || !editor) return;

    doc.title =
    titleInput.value || "Untitled Document";

    doc.content =
    editor.innerHTML;

    doc.updatedAt =
    new Date().toISOString();

    saveData(
        "workspaceDocuments",
        workspaceDocuments
    );

}


function saveActiveDocument(){

    localSaveActiveDocument();

    const doc =
    getActiveWorkspaceDocument();

    if(!doc) return;

    renderWorkspaceList();

    syncWorkspaceDocument(doc);

    Aegis.broadcast("workspaceUpdated");

    const status =
    document.getElementById(
        "workspaceSaveStatus"
    );

    if(status){

        status.innerText =
        "Saved " +
        new Date().toLocaleTimeString();

    }

}


async function deleteWorkspaceDocument(id){

    const confirmed =
    confirm(
        "Delete this document? This cannot be undone."
    );

    if(!confirmed) return;

    const cloud =
    Aegis.getModule("cloud")?.api;

    if(cloud){

        await cloud.delete(
            "workspace_documents",
            id
        );

    }

    workspaceDocuments =
    workspaceDocuments.filter(
        doc => doc.id !== id
    );

    saveData(
        "workspaceDocuments",
        workspaceDocuments
    );

    if(activeWorkspaceDocId === id){

        activeWorkspaceDocId = null;

    }

    renderWorkspaceList();

    renderWorkspaceEditor();

    Aegis.broadcast("workspaceUpdated");

}


function formatWorkspaceDoc(command){

    document.execCommand(
        command,
        false,
        null
    );

    document.getElementById(
        "workspaceDocContent"
    )?.focus();

}


function exportActiveDocumentAsWord(){

    const doc =
    getActiveWorkspaceDocument();

    if(!doc) return;

    localSaveActiveDocument();

    const html = `

        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>

        <head>
            <meta charset='utf-8'>
            <title>${doc.title}</title>
        </head>

        <body>

            <h1>${doc.title}</h1>

            ${doc.content}

        </body>

        </html>

    `;

    const blob =
    new Blob(
        [html],
        { type: "application/msword" }
    );

    const link =
    document.createElement("a");

    link.href =
    URL.createObjectURL(blob);

    link.download =
    `${doc.title || "Untitled"}.doc`;

    link.click();

    URL.revokeObjectURL(link.href);

}


function exportActiveDocumentAsText(){

    const doc =
    getActiveWorkspaceDocument();

    if(!doc) return;

    localSaveActiveDocument();

    const temp =
    document.createElement("div");

    temp.innerHTML =
    doc.content;

    const plainText =
    `${doc.title}\n\n${temp.innerText}`;

    const blob =
    new Blob(
        [plainText],
        { type: "text/plain" }
    );

    const link =
    document.createElement("a");

    link.href =
    URL.createObjectURL(blob);

    link.download =
    `${doc.title || "Untitled"}.txt`;

    link.click();

    URL.revokeObjectURL(link.href);

}


function printActiveDocument(){

    const doc =
    getActiveWorkspaceDocument();

    if(!doc) return;

    localSaveActiveDocument();

    const printWindow =
    window.open("", "_blank");

    if(!printWindow) return;

    printWindow.document.write(`

        <html>

        <head>

            <title>${doc.title}</title>

            <style>

                body{

                    font-family:Georgia,serif;

                    color:#111;

                    padding:40px;

                    max-width:800px;

                    margin:auto;

                }

                h1{

                    border-bottom:2px solid #333;

                    padding-bottom:10px;

                }

            </style>

        </head>

        <body>

            <h1>${doc.title}</h1>

            ${doc.content}

        </body>

        </html>

    `);

    printWindow.document.close();

    printWindow.focus();

    printWindow.print();

}


function renderWorkspaceList(){

    const list =
    document.getElementById(
        "workspaceList"
    );

    if(!list) return;

    const sorted =
    [...workspaceDocuments].sort(
        (a, b) =>
        new Date(b.updatedAt) -
        new Date(a.updatedAt)
    );

    if(sorted.length === 0){

        list.innerHTML = `

            <p class="empty-state">
                No projects yet. Tap "New Document" to start one.
            </p>

        `;

        return;

    }

    list.innerHTML =
    sorted.map(doc => `

        <div
            class="workspace-doc-item ${doc.id === activeWorkspaceDocId ? "active" : ""}"
            onclick="selectWorkspaceDocument(${doc.id})"
        >

            <div class="workspace-doc-info">

                <strong>
                    ${doc.title || "Untitled Document"}
                </strong>

                <small>
                    ${new Date(doc.updatedAt).toLocaleString()}
                </small>

            </div>

            <button onclick="event.stopPropagation(); deleteWorkspaceDocument(${doc.id})">

                🗑️

            </button>

        </div>

    `)
    .join("");

}


function renderWorkspaceEditor(){

    const editorContainer =
    document.getElementById(
        "workspaceEditor"
    );

    if(!editorContainer) return;

    const doc =
    getActiveWorkspaceDocument();

    if(!doc){

        editorContainer.innerHTML = `

            <p class="empty-state">
                Select a project, or create a new one to get started.
            </p>

        `;

        return;

    }

    editorContainer.innerHTML = `

        <input
            id="workspaceDocTitle"
            class="workspace-title-input"
            value="${doc.title}"
            placeholder="Document title"
        >

        <div class="workspace-toolbar">

            <button type="button" data-cmd="bold"><b>B</b></button>

            <button type="button" data-cmd="italic"><i>I</i></button>

            <button type="button" data-cmd="underline"><u>U</u></button>

            <button type="button" data-cmd="insertUnorderedList">• List</button>

            <button type="button" data-cmd="insertOrderedList">1. List</button>

        </div>

        <div
            id="workspaceDocContent"
            class="workspace-content"
            contenteditable="true"
        >${doc.content}</div>

        <div class="workspace-actions">

            <button id="workspaceSaveButton">
                💾 Save
            </button>

            <button id="workspaceExportWordButton">
                📄 Export Word (.doc)
            </button>

            <button id="workspaceExportTextButton">
                📃 Export Text (.txt)
            </button>

            <button id="workspacePrintButton">
                🖨️ Print / Save PDF
            </button>

            <span id="workspaceSaveStatus" class="empty-state"></span>

        </div>

    `;

    editorContainer
    .querySelectorAll(".workspace-toolbar button")
    .forEach(button => {

        button.addEventListener("click", () => {

            formatWorkspaceDoc(
                button.dataset.cmd
            );

        });

    });

    document.getElementById(
        "workspaceSaveButton"
    ).addEventListener(
        "click",
        saveActiveDocument
    );

    document.getElementById(
        "workspaceExportWordButton"
    ).addEventListener(
        "click",
        exportActiveDocumentAsWord
    );

    document.getElementById(
        "workspaceExportTextButton"
    ).addEventListener(
        "click",
        exportActiveDocumentAsText
    );

    document.getElementById(
        "workspacePrintButton"
    ).addEventListener(
        "click",
        printActiveDocument
    );

    const contentEl =
    document.getElementById(
        "workspaceDocContent"
    );

    contentEl.addEventListener("input", () => {

        clearTimeout(workspaceAutosaveTimer);

        workspaceAutosaveTimer =
        setTimeout(() => {

            localSaveActiveDocument();

            const status =
            document.getElementById(
                "workspaceSaveStatus"
            );

            if(status){

                status.innerText =
                "Autosaved locally";

            }

        }, 1200);

    });

}


async function syncWorkspaceDocument(doc){

    const cloud =
    Aegis.getModule("cloud")?.api;

    if(!cloud) return;

    await cloud.save(
        "workspace_documents",
        doc
    );

}


async function loadWorkspaceFromCloud(){

    const cloud =
    Aegis.getModule("cloud")?.api;

    if(!cloud) return;

    const cloudDocs =
    await cloud.load(
        "workspace_documents"
    );

    if(!cloudDocs || cloudDocs.length === 0){

        return;

    }

    workspaceDocuments =
    cloudDocs.map(doc => ({

        id: doc.id,

        title: doc.title,

        type: doc.type || "document",

        content: doc.content,

        createdAt: doc.createdAt || doc.created_at,

        updatedAt: doc.updatedAt || doc.updated_at

    }));

    saveData(
        "workspaceDocuments",
        workspaceDocuments
    );

    renderWorkspaceList();

    console.log(
        "Workspace documents loaded from cloud."
    );

}


Aegis.register("workspace", {

    version: "1.0.0",

    init(){

        console.log(
            "Workspace initialized."
        );

        loadWorkspaceFromCloud();

        Aegis.listen(
            "navigation:workspace",
            () => {

                renderWorkspaceList();

                renderWorkspaceEditor();

            }
        );

    },

    refresh(){

        renderWorkspaceList();

    },

    shutdown(){},

    status(){

        return {

            online:true,

            version:this.version,

            documentCount:
            workspaceDocuments.length

        };

    }

});

window.createWorkspaceDocument =
createWorkspaceDocument;

window.selectWorkspaceDocument =
selectWorkspaceDocument;

window.deleteWorkspaceDocument =
deleteWorkspaceDocument;