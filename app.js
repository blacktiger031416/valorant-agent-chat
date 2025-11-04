const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const messages = document.getElementById('messages');

function addMessage(text, role = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  input.value = '';

  const thinking = addMessage('생각 중…', 'bot');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const err = await res.text();
      thinking.textContent = `서버 오류: ${err}`;
      return;
    }
    const data = await res.json();
    thinking.textContent = data.reply || '응답이 비었어.';
  } catch (err) {
    thinking.textContent = `네트워크 오류: ${err}`;
  }
});
