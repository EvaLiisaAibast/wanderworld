/* =============================================
   WANDERWORLD — game.js
   No var, no template literals, no fancy syntax
   ============================================= */

const API_URL = "https://tinkr.tech/sdb/Wanderworld/Wanderworld";

// ── State ────────────────────────────────────
let playerKey = null;
let myUsername = null;
let pollInterval = null;
let lastPlayerCount = 0;

// ── DOM refs ─────────────────────────────────
const joinScreen      = document.getElementById("join-screen");
const gameScreen      = document.getElementById("game-screen");
const usernameInput   = document.getElementById("username-input");
const joinBtn         = document.getElementById("join-btn");
const joinError       = document.getElementById("join-error");
const worldContainer  = document.getElementById("world-container");
const hudPlayerName   = document.getElementById("hud-player-name");
const playerCount     = document.getElementById("player-count");
const talkBtn         = document.getElementById("talk-btn");
const talkPanel       = document.getElementById("talk-panel");
const talkInput       = document.getElementById("talk-input");
const talkSendBtn     = document.getElementById("talk-send-btn");
const talkCancelBtn   = document.getElementById("talk-cancel-btn");
const talkError       = document.getElementById("talk-error");
const leaveBtn        = document.getElementById("leave-btn");

// ── Init: restore session ────────────────────
function init() {
  let savedKey  = localStorage.getItem("ww_player_key");
  let savedName = localStorage.getItem("ww_username");

  if (savedKey && savedName) {
    playerKey  = savedKey;
    myUsername = savedName;
    enterGame();
  }

  usernameInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      handleJoin();
    }
  });

  joinBtn.addEventListener("click", handleJoin);

  worldContainer.addEventListener("click", handleWorldClick);

  talkBtn.addEventListener("click", function() {
    talkPanel.classList.remove("hidden");
    talkInput.value = "";
    talkError.textContent = "";
    talkInput.focus();
  });

  talkCancelBtn.addEventListener("click", function() {
    talkPanel.classList.add("hidden");
  });

  talkSendBtn.addEventListener("click", handleTalk);

  talkInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTalk();
    }
  });

  talkPanel.addEventListener("click", function(e) {
    if (e.target === talkPanel) {
      talkPanel.classList.add("hidden");
    }
  });

  leaveBtn.addEventListener("click", handleLeave);
}

// ── Join ─────────────────────────────────────
function handleJoin() {
  let username = usernameInput.value.trim();
  if (!username) {
    joinError.textContent = "Please enter a name.";
    return;
  }

  joinBtn.disabled = true;
  joinBtn.textContent = "Entering...";
  joinError.textContent = "";

  let body = JSON.stringify({ action: "join", username: username });

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.ok) {
      playerKey  = data.player_key;
      myUsername = username;
      localStorage.setItem("ww_player_key", playerKey);
      localStorage.setItem("ww_username", myUsername);
      enterGame();
    } else {
      joinError.textContent = friendlyError(data.error);
      joinBtn.disabled = false;
      joinBtn.textContent = "Enter World";
    }
  })
  .catch(function() {
    joinError.textContent = "Could not reach server.";
    joinBtn.disabled = false;
    joinBtn.textContent = "Enter World";
  });
}

// ── Enter game ───────────────────────────────
function enterGame() {
  joinScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  hudPlayerName.textContent = myUsername;

  fetchAndRender();
  pollInterval = setInterval(fetchAndRender, 1000);
}

// ── Leave ────────────────────────────────────
function handleLeave() {
  clearInterval(pollInterval);
  playerKey  = null;
  myUsername = null;
  localStorage.removeItem("ww_player_key");
  localStorage.removeItem("ww_username");
  gameScreen.classList.add("hidden");
  joinScreen.classList.remove("hidden");
  joinBtn.disabled = false;
  joinBtn.textContent = "Enter World";
  usernameInput.value = "";
}

// ── Fetch & render world ─────────────────────
function fetchAndRender() {
  fetch(API_URL)
  .then(function(res) { return res.json(); })
  .then(function(state) {
    renderWorld(state);
  })
  .catch(function() {
    // silently retry next tick
  });
}

function renderWorld(state) {
  let players = state.players || [];

  // Update player count
  playerCount.textContent = "👥 " + players.length;

  // Clear old render
  worldContainer.innerHTML = "";

  for (let i = 0; i < players.length; i++) {
    let p = players[i];

    let wrap = document.createElement("div");
    wrap.className = "player-wrap";

    if (p.username === myUsername) {
      wrap.classList.add("is-me");
    }
    if (p.username === "Cow") {
      wrap.classList.add("is-cow");
    }

    wrap.style.left = p.x + "px";
    wrap.style.top  = p.y + "px";

    // Speech bubble
    if (p.message) {
      let bubble = document.createElement("div");
      bubble.className = "speech-bubble";
      bubble.textContent = p.message;
      wrap.appendChild(bubble);
    }

    // Sprite image
    let img = document.createElement("img");
    img.className = "player-sprite";
    img.src = "https://tinkr.tech" + p.image;
    img.alt = p.username;
    wrap.appendChild(img);

    // Username label
    let nameLabel = document.createElement("div");
    nameLabel.className = "player-name";
    nameLabel.textContent = p.username;
    wrap.appendChild(nameLabel);

    worldContainer.appendChild(wrap);
  }
}

// ── Move ─────────────────────────────────────
function handleWorldClick(e) {
  if (!playerKey) return;

  let rect = worldContainer.getBoundingClientRect();
  let x = Math.round(e.clientX - rect.left);
  let y = Math.round(e.clientY - rect.top);

  // Clamp to valid bounds
  x = Math.max(0, Math.min(800, x));
  y = Math.max(0, Math.min(600, y));

  // Visual click ripple
  let ripple = document.createElement("div");
  ripple.className = "click-ripple";
  ripple.style.left = x + "px";
  ripple.style.top  = y + "px";
  worldContainer.appendChild(ripple);
  setTimeout(function() {
    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
  }, 600);

  let body = JSON.stringify({
    action: "move",
    player_key: playerKey,
    x: x,
    y: y
  });

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.ok) {
      if (data.error === "invalid_player") {
        handleLeave();
      }
    }
  })
  .catch(function() {});
}

// ── Talk ─────────────────────────────────────
function handleTalk() {
  let message = talkInput.value.trim();
  if (!message) {
    talkError.textContent = "Type something first!";
    return;
  }
  if (message.length > 200) {
    talkError.textContent = "Max 200 characters.";
    return;
  }

  talkSendBtn.disabled = true;
  talkError.textContent = "";

  let body = JSON.stringify({
    action: "talk",
    player_key: playerKey,
    message: message
  });

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.ok) {
      talkPanel.classList.add("hidden");
    } else {
      talkError.textContent = friendlyError(data.error);
    }
    talkSendBtn.disabled = false;
  })
  .catch(function() {
    talkError.textContent = "Could not reach server.";
    talkSendBtn.disabled = false;
  });
}

// ── Error messages ───────────────────────────
function friendlyError(code) {
  if (code === "username_taken")  return "That name is already taken!";
  if (code === "invalid_username") return "Invalid name (too long, empty, or reserved).";
  if (code === "invalid_player")  return "Session expired. Please rejoin.";
  if (code === "out_of_bounds")   return "Out of bounds!";
  if (code === "message_too_long") return "Message too long (max 200 chars).";
  return "Error: " + code;
}

// ── Start ────────────────────────────────────
init();
