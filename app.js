// ===== 이미지 베이스 URL =====
const IMG_BASE = "https://i.namu.wiki/i/";
const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="100%" height="100%" rx="14" ry="14" fill="#0f1114" stroke="#2a2d36"/>
  <text x="50%" y="54%" text-anchor="middle" font-size="14" fill="#9b9b9b" font-family="Arial">agent</text>
</svg>`);

// ===== Agents =====
const AGENTS = {
  jett: {
    name: "제트",
    img: "_ScoZkw_dp5eGn66y8GXGqzGRHAUQiZD-AEGqpt0FQTpO3sLAdALfP37rzLppNRUFUK505MkSXf31Es-p2hE0g.webp",
    tag: "WIND RUNNER // DUELIST",
    quick: ["에임 팁 알려줘.", "스모크 타이밍 어떻게 잡아?", "에코 라운드 운영법 알려줘."]
  },
  reyna: {
    name: "레이나",
    img: "THZZ8MlhetJzmWZNYTsHi69SPcjCnuQwkbgkHoM8SF7cbgXpvNg2gXSlEpPec_SXHX08Y3gDP2llILTFdRRbdQ.webp",
    tag: "SOUL HARVESTER // DUELIST",
    quick: ["솔로 캐리 각?", "교전 후 힐 타이밍?", "에임 자신감 키우는 법."]
  },
  brimstone: {
    name: "브림스톤",
    img: "UvL7SmnIwxyZuVEHFnHlwPpMTQlD0RhmAlm-gIfTyctIrb3Vnmor4A_nRiKCQlYMxIxi7G73NITfwQIt27Xvzw.webp",
    tag: "COMMANDER // CONTROLLER",
    quick: ["공격 스모크 기본 자리.", "수비 셋업 루틴 알려줘.", "궁극기 최적 활용."]
  },
  sage: {
    name: "세이지",
    img: "jqodeZWsC3MyJzJ8DwABim3K0uuZ37PgksNux_GREfl65HoYrX0L2XIs4cTdm0cpwP7Db1z73YnbpHMctb6hiQ.webp",
    tag: "HEALER // SENTINEL",
    quick: ["힐/벽 타이밍 팁.", "수비 앵글 추천.", "팀 합 맞추는 법."]
  }
};

// ===== DOM =====
const agentBar = document.getElementById("agent-bar");
const pad = document.getElementById("pad");
const padName = document.getElementById("pad-name");
const padTag = document.getElementById("pad-tag");
const quickGrid = document.getElementById("quick-grid");
const screenFeed = document.getElementById("screen-feed");
const screenTitle = document.getElementById("screen-title");
const padClose = document.getElementById("pad-close");
const padMin = document.getElementById("pad-min");
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const messages = document.getElementById('messages');

// ===== Threads / Feeds (agent-scoped) =====
const THREADS = {
  jett: [{ role: "bot", text: "연결 준비 완료. 제트 채널입니다." }],
  reyna: [{ role: "bot", text: "연결 준비 완료. 레이나 채널입니다." }],
  brimstone: [{ role: "bot", text: "연결 준비 완료. 브림스톤 채널입니다." }],
  sage: [{ role: "bot", text: "연결 준비 완료. 세이지 채널입니다." }],
};
const FEEDS = {
  jett: ["VAL-SECURE UPLINK ONLINE..."],
  reyna: ["VAL-SECURE UPLINK ONLINE..."],
  brimstone: ["VAL-SECURE UPLINK ONLINE..."],
  sage: ["VAL-SECURE UPLINK ONLINE..."],
};

let currentAgent = "jett";

// ===== Utils =====
const fullImg = (url)=> url.startsWith("http") ? url : IMG_BASE + url;
function setAvatar(src, altText){
  const el = document.getElementById("pad-avatar");
  el.alt = altText || "agent";
  el.onerror = ()=>{ el.src = FALLBACK_IMG; };
  el.src = fullImg(src);
}
function renderMessages(agentKey){
  messages.innerHTML = "";
  (THREADS[agentKey] || []).forEach(m=>{
    const d = document.createElement('div');
    d.className = `msg ${m.role}`; d.textContent = m.text; messages.appendChild(d);
  });
  messages.scrollTop = messages.scrollHeight;
}
function pushMessage(agentKey, role, text){
  if(!THREADS[agentKey]) THREADS[agentKey] = [];
  THREADS[agentKey].push({ role, text });
}
function renderFeed(agentKey){
  screenFeed.innerHTML = "";
  (FEEDS[agentKey] || []).forEach(t=>{
    const row = document.createElement("div");
    row.className = "feed-row sys"; row.textContent = t; screenFeed.appendChild(row);
  });
  screenFeed.scrollTop = screenFeed.scrollHeight;
}
function pushFeed(agentKey, text){
  if(!FEEDS[agentKey]) FEEDS[agentKey] = [];
  FEEDS[agentKey].push(text); renderFeed(agentKey);
}
function rippleAt(btn, x, y){
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.left = x + "px"; r.style.top = y + "px"; btn.appendChild(r);
  setTimeout(()=>r.remove(), 600);
}

// ===== Build Agent Buttons =====
function buildAgentBar(){
  agentBar.innerHTML = "";
  Object.entries(AGENTS).forEach(([key,a])=>{
    const b = document.createElement("button"); b.className = "agent-btn";
    const img = new Image(); img.src = fullImg(a.img); img.width = 48; img.height = 48;
    img.onerror = ()=>{ img.src = FALLBACK_IMG; };
    const box = document.createElement("div");
    const nm = document.createElement("div"); nm.className="name"; nm.textContent=a.name;
    const rl = document.createElement("div"); rl.className="role"; rl.textContent=a.tag.split("//")[0].trim();
    box.appendChild(nm); box.appendChild(rl);
    b.appendChild(img); b.appendChild(box);
    b.addEventListener("click",(e)=>{
      const r = b.getBoundingClientRect();
      rippleAt(b, e.clientX - r.left, e.clientY - r.top);
      switchWithAnimation(key);     // ★ 전환 애니메이션 호출
    });
    agentBar.appendChild(b);
  });
}

// ===== Open/Update Pad contents (no animation here) =====
function updatePadContents(key){
  const a = AGENTS[key];
  setAvatar(a.img, a.name);
  padName.textContent = a.name;
  padTag.textContent = a.tag;
  screenTitle.textContent = `DIRECT MESSAGE — ${a.name}`;
  quickGrid.innerHTML = "";
  a.quick.forEach(q=>{
    const qb = document.createElement("button");
    qb.className="quick-btn"; qb.textContent=q;
    qb.addEventListener("click",()=>{ input.value=q; pushFeed(key, `> ${q}`); });
    quickGrid.appendChild(qb);
  });
}

// ===== Switch Thread (renders) =====
function switchThread(key){
  currentAgent = key;
  renderMessages(key);
  renderFeed(key);
}

// ===== Transition Animation: closing -> V swoosh -> opening =====
function switchWithAnimation(targetKey){
  if(targetKey === currentAgent && pad.classList.contains('open')) return;

  // 이미 열린 상태가 아니면(첫 오픈) 그냥 열고 렌더
  if(!pad.classList.contains('open')){
    pad.classList.add('open');
    updatePadContents(targetKey);
    switchThread(targetKey);
    pushFeed(targetKey, `채널 ${AGENTS[targetKey].name} 링크됨.`);
    return;
  }

  // 1) 닫힘
  pad.classList.remove('opening');
  pad.classList.add('closing');

  const onClosed = () => {
    pad.removeEventListener('animationend', onClosed);

    // 2) V 스윽 오버레이 추가
    const swoosh = document.createElement('div');
    swoosh.className = 'v-swoosh';
    pad.appendChild(swoosh);

    // 3) 내용 교체
    updatePadContents(targetKey);
    switchThread(targetKey);
    pushFeed(targetKey, `채널 ${AGENTS[targetKey].name} 링크됨.`);

    // 4) 열림
    // 오버레이는 자체 애니 끝나면 제거
    swoosh.addEventListener('animationend', ()=> swoosh.remove(), { once:true });
    pad.classList.remove('closing');
    // opening 애니 끝나면 상태만 정리
    pad.classList.add('opening');
    pad.addEventListener('animationend', ()=> pad.classList.remove('opening'), { once:true });
  };

  pad.addEventListener('animationend', onClosed);
}

// ===== Close / Minimize Buttons =====
padClose.addEventListener("click", ()=>{
  pad.classList.remove("opening"); pad.classList.add("closing");
  pad.addEventListener('animationend', ()=>{
    pad.classList.remove("open","closing");
    pad.setAttribute("aria-hidden","true");
  }, { once:true });
});
padMin.addEventListener("click", ()=>{
  const screen = document.querySelector(".pad-screen");
  screen.style.opacity = screen.style.opacity === "0.22" ? "1" : "0.22";
});

// ===== Chat submit =====
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;

  pushMessage(currentAgent,'user',text);
  renderMessages(currentAgent);
  pushFeed(currentAgent, `> ${text}`);
  input.value = '';

  pushMessage(currentAgent,'bot','생각 중…');
  renderMessages(currentAgent);

  try{
    const res = await fetch('/.netlify/functions/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        message:`[요원:${AGENTS[currentAgent].name}] ${text}`,
        agent: currentAgent
      })
    });
    if(!res.ok){
      const err = await res.text();
      THREADS[currentAgent].pop();
      pushMessage(currentAgent,'bot',`서버 오류: ${err}`);
      renderMessages(currentAgent);
      pushFeed(currentAgent, `서버 오류: ${err}`);
      return;
    }
    const data = await res.json();
    THREADS[currentAgent].pop();
    pushMessage(currentAgent,'bot', data.reply || '응답이 비었어.');
    renderMessages(currentAgent);
    pushFeed(currentAgent, data.reply || '응답이 비었어.');
  }catch(err){
    THREADS[currentAgent].pop();
    pushMessage(currentAgent,'bot',`네트워크 오류: ${err}`);
    renderMessages(currentAgent);
    pushFeed(currentAgent, `네트워크 오류: ${err}`);
  }
});

// ===== Init =====
(function boot(){
  buildAgentBar();
  pad.classList.add('open');
  updatePadContents("jett");
  switchThread("jett");
})();
