const IMG_BASE = "https://i.namu.wiki/i/";
const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="100%" height="100%" rx="14" ry="14" fill="#0f1114" stroke="#2a2d36"/>
  <text x="50%" y="54%" text-anchor="middle" font-size="14" fill="#9b9b9b" font-family="Arial">agent</text>
</svg>`);

const AGENTS = {
  jett: { name:"제트",
    img:"_ScoZkw_dp5eGn66y8GXGqzGRHAUQiZD-AEGqpt0FQTpO3sLAdALfP37rzLppNRUFUK505MkSXf31Es-p2hE0g.webp",
    tag:"WIND RUNNER // DUELIST",
    quick:["에임 팁 알려줘.","스모크 타이밍 어떻게 잡아?","에코 라운드 운영법 알려줘."]},
  reyna:{ name:"레이나",
    img:"THZZ8MlhetJzmWZNYTsHi69SPcjCnuQwkbgkHoM8SF7cbgXpvNg2gXSlEpPec_SXHX08Y3gDP2llILTFdRRbdQ.webp",
    tag:"SOUL HARVESTER // DUELIST",
    quick:["솔로 캐리 각?","교전 후 힐 타이밍?","에임 자신감 키우는 법."]},
  brimstone:{ name:"브림스톤",
    img:"UvL7SmnIwxyZuVEHFnHlwPpMTQlD0RhmAlm-gIfTyctIrb3Vnmor4A_nRiKCQlYMxIxi7G73NITfwQIt27Xvzw.webp",
    tag:"COMMANDER // CONTROLLER",
    quick:["공격 스모크 기본 자리.","수비 셋업 루틴 알려줘.","궁극기 최적 활용."]},
  sage:{ name:"세이지",
    img:"jqodeZWsC3MyJzJ8DwABim3K0uuZ37PgksNux_GREfl65HoYrX0L2XIs4cTdm0cpwP7Db1z73YnbpHMctb6hiQ.webp",
    tag:"HEALER // SENTINEL",
    quick:["힐/벽 타이밍 팁.","수비 앵글 추천.","팀 합 맞추는 법."]}
};
const ORDER = Object.keys(AGENTS);

const agentBar = document.getElementById("agent-bar");
const stage = document.getElementById("pad-stage");
const padClose = document.getElementById("pad-close");
const padMin = document.getElementById("pad-min");

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const messages = document.getElementById('messages');

const THREADS = {}; const FEEDS = {};
ORDER.forEach(k=>{
  THREADS[k] = [{role:"bot", text:`연결 준비 완료. ${AGENTS[k].name} 채널입니다.`}];
  FEEDS[k]   = ["VAL-SECURE UPLINK ONLINE..."];
});
let current = "jett";

const fullImg = (u)=> u.startsWith("http") ? u : IMG_BASE + u;

function buildView(key){
  const a = AGENTS[key];
  const view = document.createElement("div");
  view.className = "pad-view";
  view.dataset.agent = key;

  const left = document.createElement("aside");
  left.className = "pad-left";
  left.innerHTML = `
    <div class="agent-card">
      <img alt="agent">
      <div class="agent-meta">
        <h2>${a.name}</h2>
        <p>${a.tag}</p>
      </div>
    </div>
    <div class="quick-section">
      <h3>QUICK LINES</h3>
      <div class="quick-grid"></div>
    </div>
  `;
  const img = left.querySelector("img");
  img.src = fullImg(a.img); img.onerror = ()=>{ img.src = FALLBACK_IMG; };

  const qgrid = left.querySelector(".quick-grid");
  a.quick.forEach(q=>{
    const b = document.createElement("button");
    b.className = "quick-btn"; b.textContent = q;
    b.addEventListener("click", ()=>{ input.value = q; pushFeed(key, `> ${q}`); });
    qgrid.appendChild(b);
  });

  const right = document.createElement("section");
  right.className = "pad-right";
  right.innerHTML = `
    <div class="pad-screen">
      <div class="screen-head">
        <span class="title">DIRECT MESSAGE — ${a.name}</span>
        <span class="light-dot"></span>
      </div>
      <div class="screen-feed"></div>
    </div>
  `;
  const feed = right.querySelector(".screen-feed");
  (FEEDS[key] || []).forEach(t=>{
    const r = document.createElement("div");
    r.className = "feed-row sys"; r.textContent = t; feed.appendChild(r);
  });

  view.appendChild(left); view.appendChild(right);
  return view;
}

function mountFirstView(){
  const v = buildView(current);
  stage.innerHTML = ""; stage.appendChild(v);
  renderMessages(current);
}

function renderMessages(key){
  messages.innerHTML = "";
  (THREADS[key] || []).forEach(m=>{
    const d = document.createElement("div");
    d.className = `msg ${m.role}`; d.textContent = m.text;
    messages.appendChild(d);
  });
  messages.scrollTop = messages.scrollHeight;
}
function pushMessage(key, role, text){ THREADS[key].push({role,text}); }
function pushFeed(key, text){
  FEEDS[key].push(text);
  if (key === current){
    const feed = stage.querySelector('.pad-view[data-agent="'+key+'"] .screen-feed');
    if (feed){
      const r = document.createElement("div");
      r.className = "feed-row sys"; r.textContent = text; feed.appendChild(r);
      feed.scrollTop = feed.scrollHeight;
    }
  }
}
function dir(from, to){
  const f = ORDER.indexOf(from), t = ORDER.indexOf(to);
  if (f === t) return 0; return t > f ? +1 : -1;
}
function slideTo(target){
  if (target === current) return;
  const d = dir(current, target) || +1;
  const curView = stage.querySelector('.pad-view');
  const nextView = buildView(target);

  nextView.classList.add(d>0 ? 'enter-from-right' : 'enter-from-left');
  stage.appendChild(nextView);

  requestAnimationFrame(()=>{
    curView.classList.add(d>0 ? 'leave-to-left' : 'leave-to-right');
    nextView.classList.remove('enter-from-right','enter-from-left');
  });

  const onDone = ()=>{
    curView.removeEventListener('transitionend', onDone);
    stage.removeChild(curView);
    current = target;
    renderMessages(current);
  };
  curView.addEventListener('transitionend', onDone, { once:true });

  pushFeed(target, `채널 ${AGENTS[target].name} 링크됨.`);
}

function buildAgentBar(){
  ORDER.forEach(key=>{
    const a = AGENTS[key];
    const b = document.createElement("button");
    b.className = "agent-btn";
    const avatar = new Image();
    avatar.src = fullImg(a.img); avatar.onerror = ()=>{ avatar.src = FALLBACK_IMG; };
    avatar.width = 48; avatar.height = 48;
    const box = document.createElement("div");
    const nm = document.createElement("div"); nm.className="name"; nm.textContent=a.name;
    const rl = document.createElement("div"); rl.className="role"; rl.textContent=a.tag.split("//")[0].trim();
    box.appendChild(nm); box.appendChild(rl);
    b.appendChild(avatar); b.appendChild(box);
    b.addEventListener("click", ()=> slideTo(key));
    agentBar.appendChild(b);
  });
}

padClose?.addEventListener("click", ()=>{
  stage.style.opacity = stage.style.opacity === "0" ? "1" : "0";
});
padMin?.addEventListener("click", ()=>{
  const v = stage.querySelector(".pad-view");
  if (v) v.style.opacity = v.style.opacity === "0.25" ? "1" : "0.25";
});

document.getElementById('chat-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  pushMessage(current,'user',text);
  renderMessages(current);
  pushFeed(current, `> ${text}`);
  input.value = '';

  pushMessage(current,'bot','생각 중…');
  renderMessages(current);

  try{
    const res = await fetch('/.netlify/functions/chat',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message:`[요원:${AGENTS[current].name}] ${text}`, agent: current })
    });
    if(!res.ok){
      const err = await res.text();
      THREADS[current].pop();
      pushMessage(current,'bot',`서버 오류: ${err}`);
      renderMessages(current); pushFeed(current, `서버 오류: ${err}`);
      return;
    }
    const data = await res.json();
    THREADS[current].pop();
    pushMessage(current,'bot', data.reply || '응답이 비었어.');
    renderMessages(current); pushFeed(current, data.reply || '응답이 비었어.');
  }catch(err){
    THREADS[current].pop();
    pushMessage(current,'bot',`네트워크 오류: ${err}`);
    renderMessages(current); pushFeed(current, `네트워크 오류: ${err}`);
  }
});

(function boot(){ buildAgentBar(); mountFirstView(); })();
