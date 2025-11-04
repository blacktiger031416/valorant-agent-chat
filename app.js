// === Agent data (이미지 경로는 필요에 따라 수정) ===
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

// 만약 위 문자열이 '완전한 URL'이 아니라면, /images 폴더에 파일을 넣고 img 값을 "images/파일명" 으로 바꿔줘.
const IMAGE_RESOLVE = (src) => src.startsWith("http") ? src : src;

// === DOM refs ===
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

// === UI helpers ===
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

// === Build agent buttons ===
function buildAgentBar(){
  agentBar.innerHTML = "";
  Object.entries(AGENTS).forEach(([key, a])=>{
    const b = document.createElement("button");
    b.className = "agent-btn";
    b.innerHTML = `
      <img src="${IMAGE_RESOLVE(a.img)}" alt="${a.name}" />
      <div>
        <div class="name">${a.name}</div>
        <div class="role">${a.tag.split("//")[0].trim()}</div>
      </div>
    `;
    b.addEventListener("click", ()=> openPad(key));
    agentBar.appendChild(b);
  });
}

// === Open / Update Pad ===
function openPad(key){
  currentAgent = key;
  const a = AGENTS[key];
  padAvatar.src = IMAGE_RESOLVE(a.img);
  padName.textContent = a.name;
  padTag.textContent = a.tag;
  screenTitle.textContent = `DIRECT MESSAGE — ${a.name}`;
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

  pad.classList.add("open");
  pad.setAttribute("aria-hidden", "false");
  addFeedRow(`채널 ${a.name} 링크됨.`, "sys");
}
padClose.addEventListener("click", ()=>{
  pad.classList.remove("open");
  pad.setAttribute("aria-hidden", "true");
});
padMin.addEventListener("click", ()=>{
  // 간단한 미니마이즈 느낌: 스크린만 투명하게
  const screen = document.querySelector(".pad-screen");
  screen.style.opacity = screen.style.opacity === "0.2" ? "1" : "0.2";
});

// === Chat submit ===
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
// 첫 진입 시 제트 패널 오픈(원하지 않으면 주석)
openPad("jett");
