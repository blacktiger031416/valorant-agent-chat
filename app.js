const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const messages = document.getElementById('messages');

function addMessage(text, role = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  input.value = '';

  // 데모 응답 (다음 단계에서 Netlify 함수로 교체)
  await new Promise(r => setTimeout(r, 300));
  addMessage('💡 다음 단계에서 AI 연결을 활성화할 거야. 지금은 UI 확인용 데모야!');
});
