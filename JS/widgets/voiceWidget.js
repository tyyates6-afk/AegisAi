Dashboard.register("voiceWidget", {


title:"Voice",

icon:"🎙️",

description:
"AEGIS voice controls",

category:"system",

size:"small-card",

movable:true,

removable:true,

resizable:true,


init(){

    this.refresh();

},


refresh(){


const container =
document.getElementById(
"voiceWidget"
);


if(!container)
return;



const voice =
Aegis
.getModule("voice")
.api;



const settings =
voice.getSettings();



const profile =
Aegis
.getModule("profile")
.api
.getProfile();



container.innerHTML = `


<div class="widget-header">

<h3>
🎙️ AEGIS Voice
</h3>

</div>


<p>

Assistant:
${profile.style}

</p>


<p>

Status:
${settings.enabled ?
"🟢 Enabled":
"🔴 Disabled"}

</p>


<label>

Volume

</label>


<input

type="range"

min="0"

max="1"

step="0.1"

value="${settings.volume}"

id="voiceVolume"

>



<br><br>



<button id="voiceToggle">

${settings.enabled ?
"Disable Voice":
"Enable Voice"}

</button>


<button id="voiceTest">

🔊 Test

</button>


<button id="voiceStop">

⏹ Stop

</button>


`;



document
.getElementById(
"voiceVolume"
)
.oninput=(e)=>{

    voice.setVolume(
        Number(e.target.value)
    );

};



document
.getElementById(
"voiceToggle"
)
.onclick=()=>{

    voice.toggle();

    this.refresh();

};



document
.getElementById(
"voiceTest"
)
.onclick=()=>{


voice.speak(

`Hello ${profile.name || "there"}. AEGIS voice systems are online.`

);


};



document
.getElementById(
"voiceStop"
)
.onclick=()=>{

    voice.stop();

};


}


});