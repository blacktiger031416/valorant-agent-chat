// ===== 이미지 베이스 URL 설정 =====
// 네가 준 파일명들은 나무위키 이미지 서버(i.namu.wiki)에 있어.
// 전체 URL = BASE + 파일명
const IMG_BASE = "https://i.namu.wiki/i/";

// SVG 폴백(이미지 로드 실패 시)
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
const padAvatar = document.getElementById("pad-avatar");
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

let currentAgent = "jett";

// ===== Helpers =====
function fullImg(url){ return url.startsWith("http") ? url : IMG_BASE + url; }

function imageWithFallback(src){
  const img = new Image();
  img.src = fullImg(src);
  img.alt = "agent";
  img.onerror = ()=>{ img.src = FALLBACK_IMG; };
  return img;
}

function addMessage(text, role = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function addFeedRow(text, cls="") {
  const row = document.createElement("div");
  row.className = `feed-row ${cls}`;
  row.textContent = text;
  screenFeed.appendChild(row);
  screenFeed.scrollTop = screenFeed.scrollHeight;
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
    const avatar = imageWithFallback(a.img);
    avatar.width = 48; avatar.height = 48;

    const box = document.createElement("div");
    const nm = document.createElement("div"); nm.className = "name"; nm.textContent = a.name;
    const rl = document.createElement("div"); rl.className = "role"; rl.textContent = a.tag.split("//")[0].trim();
    box.appendChild(nm); box.appendChild(rl);

    b.appendChild(avatar); b.appendChild(box);

    b.addEventListener("click", (e)=>{
      const rect = b.getBoundingClientRect();
      rippleAt(b, e.clientX - rect.left, e.clientY - rect.top);
      openPad(key, true);
    });

    agentBar.appendChild(b);
  });
}

// ===== Open / Update Pad =====
function openPad(key, animate=false){
  currentAgent = key;
  const a = AGENTS[key];

  // 왼쪽 카드
  const img = imageWithFallback(a.img);
  padAvatar.replaceWith(img);
  img.id = "pad-avatar";
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
      addFeedRow(`> ${q}`, "sys");
    });
    quickGrid.appendChild(qb);
  });

  // 패널 열기 + 팝 애니메이션 리트리거
  pad.classList.add("open");
  pad.setAttribute("aria-hidden", "false");
  if(animate){
    pad.classList.remove("pop");
    void pad.offsetWidth; // reflow
    pad.classList.add("pop");
  }
  addFeedRow(`채널 ${a.name} 링크됨.`, "sys");
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

  addMessage(text, 'user');
  addFeedRow(`> ${text}`, "sys");
  input.value = '';

  const thinking = addMessage('생각 중…', 'bot');

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
      thinking.textContent = `서버 오류: ${err}`;
      addFeedRow(`서버 오류: ${err}`);
      return;
    }
    const data = await res.json();
    thinking.textContent = data.reply || '응답이 비었어.';
    addFeedRow(data.reply || '응답이 비었어.');
  } catch (err) {
    thinking.textContent = `네트워크 오류: ${err}`;
    addFeedRow(`네트워크 오류: ${err}`);
  }
});

// init
buildAgentBar();
openPad("jett", true);
