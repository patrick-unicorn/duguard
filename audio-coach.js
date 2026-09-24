(function(){
  const COMMONS = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
  const lib = {
    "a": {file:"Zh-ā.ogg", fallback:"啊", label:"ā"},
    "o": {fallback:"喔", label:"o"},
    "e": {fallback:"鹅", label:"e"},
    "i": {file:"Zh-yī.ogg", fallback:"衣", label:"i"},
    "u": {fallback:"乌", label:"u"},
    "ü": {file:"Zh-yú.ogg", fallback:"鱼", label:"ü"},
    "tones": {file:"FourMandarinTones.ogg", fallback:"妈 麻 马 骂", label:"mā · má · mǎ · mà"},
    "ba": {file:"Zh-bā.ogg", fallback:"八", label:"bā"},
    "ba-tones": {tts:["八","拔","把","爸"], label:"bā · bá · bǎ · bà"},
    "gua": {file:"Zh-guā.ogg", fallback:"瓜", label:"guā"},
    "mama": {file:"Zh-māma.ogg", fallback:"妈妈", label:"mā ma"},
    "baba": {file:"Zh-bàba.ogg", fallback:"爸爸", label:"bà ba"},
    "xiaomao": {fallback:"小猫", label:"xiǎo māo"},
    "dami": {files:["Zh-dà.ogg","Zh-mǐ.ogg"], fallback:"大米", label:"dà mǐ"}
  };

  let audio = new Audio();
  let active = null;
  let slow = false;
  let timer = null;

  const style=document.createElement("style");
  style.textContent=`
    [data-pronounce]{position:relative}
    [data-pronounce].is-playing{outline:4px solid #ffd45e;transform:translateY(-2px)}
    .audio-coach{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:80;width:min(92vw,620px);
      display:none;align-items:center;gap:10px;padding:12px 14px;background:rgba(35,48,76,.96);color:#fff;
      border-radius:20px;box-shadow:0 14px 40px rgba(25,35,60,.28);backdrop-filter:blur(10px)}
    .audio-coach.show{display:flex}
    .audio-coach .coach-icon{font-size:27px}
    .audio-coach .coach-copy{flex:1;min-width:0}
    .audio-coach .coach-title{font-weight:900;font-size:16px}
    .audio-coach .coach-status{font-size:13px;opacity:.8;margin-top:2px}
    .audio-coach button{border:0;border-radius:12px;padding:8px 10px;font-weight:900;cursor:pointer;background:#fff;color:#30457f}
    .audio-coach button.on{background:#ffe49a;color:#765000}
    .audio-badge{display:inline-flex;align-items:center;gap:5px;margin-left:6px;font-size:12px;font-weight:800;opacity:.72}
    @media(max-width:560px){.audio-coach{bottom:10px}.audio-coach .coach-status{display:none}}
  `;
  document.head.appendChild(style);

  const coach=document.createElement("div");
  coach.className="audio-coach";
  coach.setAttribute("role","status");
  coach.innerHTML='<div class="coach-icon">🎧</div><div class="coach-copy"><div class="coach-title" id="coachTitle">发音教练</div><div class="coach-status" id="coachStatus">点一个拼音开始</div></div><button id="coachSlow" type="button">🐢 慢一点</button><button id="coachReplay" type="button">↻ 再听</button>';
  document.body.appendChild(coach);

  const title=coach.querySelector("#coachTitle");
  const status=coach.querySelector("#coachStatus");
  const slowBtn=coach.querySelector("#coachSlow");
  const replayBtn=coach.querySelector("#coachReplay");

  function commons(file){ return COMMONS + encodeURIComponent(file); }
  function clearActive(){
    if(active) active.classList.remove("is-playing");
    active=null;
  }
  function stop(){
    clearTimeout(timer);
    audio.pause();
    audio.currentTime=0;
    if("speechSynthesis" in window) speechSynthesis.cancel();
    clearActive();
  }
  function bestVoice(){
    if(!("speechSynthesis" in window)) return null;
    const vs=speechSynthesis.getVoices();
    const zh=vs.filter(v=>/^zh(-CN)?/i.test(v.lang));
    return zh.find(v=>/xiaoxiao|ting-ting|meijia|huihui|yunxi|yunyang/i.test(v.name)) || zh[0] || null;
  }
  function speakOne(text){
    return new Promise(resolve=>{
      if(!("speechSynthesis" in window)){ resolve(false); return; }
      const u=new SpeechSynthesisUtterance(text);
      u.lang="zh-CN"; u.rate=slow?.74:.9; u.pitch=1.02;
      const v=bestVoice(); if(v) u.voice=v;
      u.onend=()=>resolve(true); u.onerror=()=>resolve(false);
      speechSynthesis.speak(u);
    });
  }
  async function playTtsSequence(items){
    for(let i=0;i<items.length;i++){
      await speakOne(items[i]);
      await new Promise(r=>setTimeout(r,220));
    }
  }
  function playFiles(files, idx, done, fallback){
    if(idx>=files.length){ done(); return; }
    audio=new Audio(commons(files[idx]));
    audio.preload="auto";
    audio.playbackRate=slow?.84:1;
    audio.onended=()=>setTimeout(()=>playFiles(files,idx+1,done,fallback),140);
    audio.onerror=()=>fallback();
    audio.play().catch(()=>fallback());
  }
  function afterPlay(){
    clearActive();
    status.textContent="轮到你啦：跟读一遍 👄";
    timer=setTimeout(()=>{ status.textContent="想确认一下？点“再听”"; },1800);
  }
  async function play(key, el){
    const item=lib[key]; if(!item) return;
    stop(); active=el||active;
    if(active) active.classList.add("is-playing");
    coach.classList.add("show");
    title.textContent=item.label;
    status.textContent=item.file||item.files ? "🎙️ 真人示范 · 仔细听" : "🔊 设备中文语音 · 仔细听";

    const fallback=async()=>{
      audio.pause();
      if(item.tts) await playTtsSequence(item.tts);
      else await speakOne(item.fallback||item.label);
      afterPlay();
    };

    if(item.tts){ await playTtsSequence(item.tts); afterPlay(); return; }
    if(item.files){ playFiles(item.files,0,afterPlay,fallback); return; }
    if(item.file){
      audio=new Audio(commons(item.file)); audio.preload="auto"; audio.playbackRate=slow?.84:1;
      audio.onended=afterPlay; audio.onerror=fallback;
      audio.play().catch(fallback); return;
    }
    await fallback();
  }

  document.querySelectorAll("[data-pronounce]").forEach(el=>{
    const key=el.getAttribute("data-pronounce");
    if(!lib[key]) return;
    el.setAttribute("aria-label",(el.getAttribute("aria-label")||el.textContent.trim())+"，点击听发音");
    el.addEventListener("click",ev=>{ ev.preventDefault(); play(key,el); });
  });

  slowBtn.onclick=()=>{ slow=!slow; slowBtn.classList.toggle("on",slow); slowBtn.textContent=slow?"🐢 慢速中":"🐢 慢一点"; if(active) play(active.getAttribute("data-pronounce"),active); };
  replayBtn.onclick=()=>{ if(active) play(active.getAttribute("data-pronounce"),active); };
  window.PinyinAudioCoach={play,stop,library:lib};
})();