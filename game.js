

const API_URL = "https://tinkr.tech/sdb/Wanderworld/Wanderworld";

let playerKey = null;
let myUsername = null;
let pollInterval = null;
let chatHistory = []; 

const joinScreen    = document.getElementById("join-screen");
const gameScreen    = document.getElementById("game-screen");

const usernameInput = document.getElementById("username-input");
const joinBtn       = document.getElementById("join-btn");
const joinError     = document.getElementById("join-error");

const worldContainer = document.getElementById("world-container");
const hudPlayerName  = document.getElementById("hud-player-name");
const playerCount    = document.getElementById("player-count");

const talkBtn       = document.getElementById("talk-btn");
const talkPanel     = document.getElementById("talk-panel");
const talkInput     = document.getElementById("talk-input");
const talkSendBtn   = document.getElementById("talk-send-btn");
const talkCancelBtn = document.getElementById("talk-cancel-btn");
const talkError     = document.getElementById("talk-error");

const leaveBtn      = document.getElementById("leave-btn");

const historyLog    = document.getElementById("history-log");

init();

function init() {
  joinBtn.onclick = handleJoin;

  usernameInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") handleJoin();
  });

  talkBtn.onclick    = openTalk;
  talkCancelBtn.onclick = closeTalk;
  talkSendBtn.onclick   = handleTalk;

  talkPanel.addEventListener("click", function(e) {
    if (e.target === talkPanel) closeTalk();
  });

  talkInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTalk();
    }
  });

  leaveBtn.onclick = handleLeave;
  worldContainer.addEventListener("click", handleMove);
}

function handleJoin() {
  const username = usernameInput.value.trim();

  if (!username) {
    joinError.textContent = "enter a name first 🌱";
    return;
  }

  joinError.textContent = "";
  joinBtn.disabled  = true;
  joinBtn.textContent = "entering...";

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", username })
  })
  .then(res => {
    if (!res.ok) throw new Error("Server returned " + res.status);
    return res.json();
  })
  .then(data => {
    console.log("JOIN:", data);

    if (!data.player_key) {
      throw new Error(data.error || data.message || "No player_key returned");
    }

    playerKey  = data.player_key;  
    myUsername = username;

    enterGame();
  })
  .catch(err => {
    console.error("JOIN ERROR:", err);
    joinError.textContent = "join failed: " + err.message;
    joinBtn.disabled   = false;
    joinBtn.textContent  = "Enter World";
  });
}

function enterGame() {
  joinScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  hudPlayerName.textContent = myUsername;
  chatHistory = [];
  renderHistory();

  fetchWorld();
  pollInterval = setInterval(fetchWorld, 1500);
}

function handleLeave() {
  clearInterval(pollInterval);
  pollInterval = null;

  playerKey  = null;
  myUsername = null;

  gameScreen.classList.add("hidden");
  joinScreen.classList.remove("hidden");

  joinBtn.disabled   = false;
  joinBtn.textContent  = "Enter World";
  usernameInput.value  = "";
}

function fetchWorld() {
  fetch(API_URL)
    .then(res => {
      if (!res.ok) throw new Error("Poll failed " + res.status);
      return res.json();
    })
    .then(state => {
      renderWorld(state);
    })
    .catch(err => {
      console.error("FETCH ERROR:", err);
    });
}

let prevMessages = {}; 

function renderWorld(state) {
  const players = state.players || [];
  playerCount.textContent = "👥 " + players.length;

  for (const p of players) {
    if (p.message && p.message !== prevMessages[p.username]) {
      prevMessages[p.username] = p.message;
      addHistory(p.username, p.message);
    }
  }

  worldContainer.innerHTML = "";

  for (const p of players) {
    const wrap = document.createElement("div");
    wrap.className = "player-wrap";
    wrap.style.left = p.x + "px";
    wrap.style.top  = p.y + "px";

    if (p.message) {
      const bubble = document.createElement("div");
      bubble.className  = "speech-bubble";
      bubble.textContent = p.message;
      wrap.appendChild(bubble);
    }

    const img = document.createElement("img");
    img.className = "player-sprite";
    img.src = "https://tinkr.tech" + p.image;
    wrap.appendChild(img);

    const nameEl = document.createElement("div");
    nameEl.className  = "player-name";
    nameEl.textContent = p.username;
    if (p.username === myUsername) nameEl.classList.add("is-me");
    wrap.appendChild(nameEl);

    worldContainer.appendChild(wrap);
  }
}

function handleMove(e) {
  if (!playerKey) {
    console.warn("MOVE blocked: no playerKey");
    return;
  }

  const rect = worldContainer.getBoundingClientRect();
  let x = Math.round(e.clientX - rect.left);
  let y = Math.round(e.clientY - rect.top);

  x = Math.max(0, Math.min(800, x));
  y = Math.max(0, Math.min(600, y));

  console.log("MOVE →", x, y, "key:", playerKey);

  spawnRipple(x, y);

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "move",
      player_key: playerKey,   
      x,
      y
    })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(d => { throw new Error(d.error || d.message || res.status); });
    }
    return res.json();
  })
  .then(data => {
    console.log("MOVE RESPONSE:", data);
    if (data.error) console.warn("MOVE rejected by server:", data.error);
  })
  .catch(err => {
    console.error("MOVE ERROR:", err.message);
  });
}

function spawnRipple(x, y) {
  const r = document.createElement("div");
  r.className = "click-ripple";
  r.style.left = x + "px";
  r.style.top  = y + "px";
  worldContainer.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

function openTalk() {
  talkPanel.classList.remove("hidden");
  talkInput.value = "";
  talkError.textContent = "";
  talkInput.focus();
}

function closeTalk() {
  talkPanel.classList.add("hidden");
  talkInput.blur();
}

function handleTalk() {
  const msg = talkInput.value.trim();

  if (!msg) {
    talkError.textContent = "say something 🌿";
    return;
  }

  if (!playerKey) {
    talkError.textContent = "not connected";
    return;
  }

  talkSendBtn.disabled = true;
  talkError.textContent = "";

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "talk",
      player_key: playerKey,
      message: msg
    })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(d => { throw new Error(d.error || d.message || res.status); });
    }
    return res.json();
  })
  .then(data => {
    console.log("CHAT:", data);
    if (data.error) {
      talkError.textContent = "server: " + data.error;
    } else {
      closeTalk();
    }
  })
  .catch(err => {
    console.error("CHAT ERROR:", err);
    talkError.textContent = "send failed: " + err.message;
  })
  .finally(() => {
    talkSendBtn.disabled = false;
  });
}

function addHistory(username, message) {
  const now = new Date();
  const time = now.getHours().toString().padStart(2,"0") + ":"
             + now.getMinutes().toString().padStart(2,"0");

  chatHistory.push({ username, message, time });

  if (chatHistory.length > 50) chatHistory.shift();

  renderHistory();
}

function renderHistory() {
  if (!historyLog) return;

  historyLog.innerHTML = chatHistory.length === 0
    ? '<div class="history-empty">no messages yet 🌱</div>'
    : chatHistory.map(e =>
        `<div class="history-entry">
          <span class="history-time">${e.time}</span>
          <span class="history-user">${escHtml(e.username)}</span>
          <span class="history-msg">${escHtml(e.message)}</span>
        </div>`
      ).join("");

  historyLog.scrollTop = historyLog.scrollHeight;
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
