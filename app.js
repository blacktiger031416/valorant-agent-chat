// ===== 이미지 베이스 URL 설정 =====
const IMG_BASE = "https://i.namu.wiki/i/";

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="100%" height="100%" rx="14" ry="14" fill="#0b131c" stroke="#1b2a38"/>
  <text x="50%" y="54%" text-anchor="middle" font-size="14" fill="#8aa0b6" font-family="Arial">agent</text>
</svg>`);

// ===== 에이전트 데이터 =====
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

// ===== DOM refs =====
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

// ====== 에이전트별 독립 스레드(채팅방) 저장소 ======
const THREADS = {
  jett: [{ role: "bot", text: "연결 준비 완료. 제트 채널입니다." }],
  reyna: [{ role: "bot", text: "연결 준비 완료. 레이나 채널입니다." }],
  brimstone: [{ role: "bot", text: "연결 준비 완료. 브림스톤 채널입니다." }],
  sage: [{ role: "bot", text: "연결 준비 완료. 세이지 채널입니다." }],
};
// 패널 오른쪽 스크린 피드도 요원별 분리
const FEEDS = {
  jett: ["보안 링크가 활성화되었습니다."],
  reyna: ["보안 링크가 활성화되었습니다."],
  brimstone: ["보안 링크가 활성화되었습니다."],
  sage: ["보안 링크가 활성화되었습니다."],
};

let currentAgent = "jett";

// ===== Helpers =====
const fullImg = (url)=> url.startsWith("http") ? url : IMG_BASE + url;

function setAvatar(src, altText){
  const el = document.getElementById("pad-avatar"); // 항상 현재 DOM에서 다시 잡음
  el.alt = altText || "agent";
  el.onerror = ()=>{ el.src = FALLBACK_IMG; };
  el.src = fullImg(src);
}

function renderMessages(agentKey){
  messages.innerHTML = ""; // 현재 요원의 메시지들로 재렌더
  (THREADS[agentKey] || []).forEach(m => {
    const div = document.createElement('div');
    div.className = `msg ${m.role}`;
    div.textContent = m.text;
    messages.appendChild(div);
  });
  messages.scrollTop = messages.scrollHeight;
}

function pushMessage(agentKey, role, text){
  if (!THREADS[agentKey]) THREADS[agentKey] = [];
  THREADS[agentKey].push({ role, text });
}

function renderFeed(agentKey){
  screenFeed.innerHTML = "";
  (FEEDS[agentKey] || []).forEach(t => {
    const row = document.createElement("div");
    row.className = "feed-row sys";
    row.textContent = t;
    screenFeed.appendChild(row);
  });
  screenFeed.scrollTop = screenFeed.scrollHeight;
}

function pushFeed(agentKey, text){
  if (!FEEDS[agentKey]) FEEDS[agentKey] = [];
  FEEDS[agentKey].push(text);
  renderFeed(agentKey);
}

function rippleAt(btn, x, y){
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.left = x + "px";
  r.style.top = y + "px";
  btn.appendChild(r);
  setTimeout(()=> r.remove(), 600);
}

// ===== Build agent buttons =====
function buildAgentBar(){
  agentBar.innerHTML = "";
  Object.entries(AGENTS).forEach(([key, a])=>{
    const b = document.createElement("button");
    b.className = "agent-btn";

    const avatar = new Image();
    avatar.src = fullImg(a.img);
    avatar.width = 48; avatar.height = 48;
    avatar.onerror = ()=>{ avatar.src = FALLBACK_IMG; };

    const box = document.createElement("div");
    const nm = document.createElement("div"); nm.className = "name"; nm.textContent = a.name;
    const rl = document.createElement("div"); rl.className = "role"; rl.textContent = a.tag.split("//")[0].trim();
    box.appendChild(nm); box.appendChild(rl);

    b.appendChild(avatar); b.appendChild(box);

    b.addEventListener("click", (e)=>{
      const rect = b.getBoundingClientRect();
      rippleAt(b, e.clientX - rect.left, e.clientY - rect.top);
      openPad(key, true);            // 패널 왼쪽 정보 갱신
      switchThread(key);             // 채팅방 스위칭(렌더)
    });

    agentBar.appendChild(b);
  });
}

// ===== 채팅방 스위치 =====
function switchThread(key){
  currentAgent = key;
  renderMessages(key);
  renderFeed(key);
}

// ===== Open / Update Pad (왼쪽 프로필/퀵라인/헤더) =====
function openPad(key, animate=false){
  const a = AGENTS[key];

  // 왼쪽 프로필 카드: 같은 img 요소의 src만 갱신
  setAvatar(a.img, a.name);
  padName.textContent = a.name;
  padTag.textContent = a.tag;

  // 오른쪽 화면 헤더
  screenTitle.textContent = `DIRECT MESSAGE — ${a.name}`;

  // 퀵 라인
  quickGrid.innerHTML = "";
  a.quick.forEach(q=>{
    const qb = document.createElement("button");
    qb.className = "quick-btn";
    qb.textContent = q;
    qb.addEventListener("click", ()=>{
      input.value = q;
      pushFeed(key, `> ${q}`);
    });
    quickGrid.appendChild(qb);
  });

  // 패널 열기 + 팝 애니메이션
  pad.classList.add("open");
  pad.setAttribute("aria-hidden", "false");
  if(animate){
    pad.classList.remove("pop");
    void pad.offsetWidth;
    pad.classList.add("pop");
  }
  pushFeed(key, `채널 ${a.name} 링크됨.`);
}

padClose.addEventListener("click", ()=>{
  pad.classList.remove("open","pop");
  pad.setAttribute("aria-hidden", "true");
});
padMin.addEventListener("click", ()=>{
  const screen = document.querySelector(".pad-screen");
  screen.style.opacity = screen.style.opacity === "0.22" ? "1" : "0.22";
});

// ===== Chat submit =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  // 현재 채널 스레드에만 저장/렌더
  pushMessage(currentAgent, 'user', text);
  renderMessages(currentAgent);
  pushFeed(currentAgent, `> ${text}`);
  input.value = '';

  // 자리표시자(생각 중…)
  pushMessage(currentAgent, 'bot', '생각 중…');
  renderMessages(currentAgent);

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[요원:${AGENTS[currentAgent].name}] ${text}`,
        agent: currentAgent
      })
    });

    if (!res.ok) {
      const err = await res.text();
      // 마지막 bot 메시지를 에러로 교체
      THREADS[currentAgent].pop();
      pushMessage(currentAgent, 'bot', `서버 오류: ${err}`);
      renderMessages(currentAgent);
      pushFeed(currentAgent, `서버 오류: ${err}`);
      return;
    }

    const data = await res.json();

    // 마지막 '생각 중…' 교체
    THREADS[currentAgent].pop();
    pushMessage(currentAgent, 'bot', data.reply || '응답이 비었어.');
    renderMessages(currentAgent);
    pushFeed(currentAgent, data.reply || '응답이 비었어.');
  } catch (err) {
    THREADS[currentAgent].pop();
    pushMessage(currentAgent, 'bot', `네트워크 오류: ${err}`);
    renderMessages(currentAgent);
    pushFeed(currentAgent, `네트워크 오류: ${err}`);
  }
});

// ===== Init =====
function firstBoot(){
  buildAgentBar();
  openPad("jett", true);
  switchThread("jett"); // 제트 채널로 시작
}
firstBoot();
