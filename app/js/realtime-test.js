(function () {
    const $ = id => document.getElementById(id);
  
    const logEl = $("log");
    const serverUrlSelect = $("serverUrl");
    const sessionInput = $("sessionId");
    const connectBtn = $("connectBtn");
    const disconnectBtn = $("disconnectBtn");
    const messageInput = $("messageInput");
    const sendBtn = $("sendBtn");
    const presenceEl = $("presence");
  
    let socket = null;
    let channel = null;
  
    let isJoining = false;
    let isJoined = false;
    let lastSessionId = null;
  
    /* -------------------- UI 로그 -------------------- */
    function log(...args) {
      const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
      console.log("[Realtime TEST]", ...args);
    }
  
    /* -------------------- Presence 출력 -------------------- */
    function updatePresence(presenceState) {
      presenceEl.innerHTML = "";
  
      Object.entries(presenceState).forEach(([userId, metas]) => {
        const { name, role } = metas[0];
        const li = document.createElement("li");
        li.textContent = `${name} (${userId}) [${role}]`;
        presenceEl.appendChild(li);
      });
    }
  
    /* -------------------- 소켓 연결 -------------------- */
    function setupSocket() {
      const url = serverUrlSelect.value;
      log(`🔌 서버 연결 시도: ${url}`);
  
      socket = new Phoenix.Socket(url, {
        reconnectAfterMs: () => 1000
      });
  
      socket.onOpen(() => {
        log("✅ 소켓 연결 성공");
        disconnectBtn.disabled = false;
      });
  
      socket.onError(() => {
        log("❌ 소켓 연결 오류");
      });
  
      socket.onClose(() => {
        log("🔌 소켓 연결 종료");
        isJoined = false;
        channel = null;
        sendBtn.disabled = true;
        connectBtn.disabled = false;
      });
  
      socket.connect();
    }
  
    /* -------------------- 채널 JOIN -------------------- */
    function joinSession() {
      const sessionId = sessionInput.value.trim();
      if (!sessionId) return alert("세션 ID를 입력하세요.");
  
      if (!socket || socket.connectionState() !== "open") {
        setupSocket();
        return setTimeout(() => joinSession(), 600);
      }
  
      if (channel) channel.leave();
  
      lastSessionId = sessionId;
      isJoining = true;
      isJoined = false;
  
      channel = socket.channel(`session:${sessionId}`, {});
      log(`➡️ 채널 join 시도: session:${sessionId}`);
  
      channel
        .join()
        .receive("ok", (resp) => {
          log("✅ JOIN OK:", JSON.stringify(resp));
  
          // 딜레이 주어 JOIN 후 push 타이밍 문제 해결
          setTimeout(() => {
            isJoined = true;
            isJoining = false;
            sendBtn.disabled = false;
          }, 200);
        })
        .receive("error", (err) => log("❌ JOIN ERROR:", JSON.stringify(err)))
        .receive("timeout", () => log("⏱️ JOIN TIMEOUT"));
  
      /* ---- 채널 이벤트 ---- */
      channel.on("chat:added", payload => {
        log("💬 [chat:added]", JSON.stringify(payload));
      });
  
      channel.on("presence:state", state => {
        log("👥 presence:state", state);
        updatePresence(state);
      });
  
      channel.on("presence:diff", diff => {
        log("👥 presence:diff", diff);
      });
  
      channel.onClose(() => {
        isJoined = false;
        sendBtn.disabled = true;
        log("ℹ️ 채널 종료됨");
      });
    }
  
    /* -------------------- 메시지 전송 -------------------- */
    function sendMessage() {
      if (!channel || !isJoined || channel.state !== "joined") {
        return log(`⚠️ 채널이 아직 joined 상태가 아닙니다. 현재: ${channel?.state}`);
      }
  
      const msg = messageInput.value.trim();
      if (!msg) return;
  
      const payload = {
        message: msg,
        meta: { ts: Date.now() }
      };
  
      log("➡️ chat:new 전송:", payload);
  
      channel
        .push("chat:new", payload)
        .receive("ok", resp => log("💬 chat:new 응답:", resp))
        .receive("error", err => log("❌ chat:new 오류:", err));
    }
  
    /* -------------------- 끊기 -------------------- */
    function disconnect() {
      if (channel) channel.leave();
      if (socket) socket.disconnect();
      log("🔌 소켓 연결 종료");
      sendBtn.disabled = true;
      connectBtn.disabled = false;
    }
  
    /* -------------------- 이벤트 바인딩 -------------------- */
    connectBtn.addEventListener("click", () => {
      connectBtn.disabled = true;
      setupSocket();
      setTimeout(() => joinSession(), 1000);
    });
  
    disconnectBtn.addEventListener("click", disconnect);
    sendBtn.addEventListener("click", sendMessage);
    sendBtn.disabled = true;
  
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  
    /* -------------------- 초기 메시지 -------------------- */
    log("INSWING Realtime 테스트 스크립트 로드 완료");
    log("💡 팁: 같은 세션 ID로 다른 기기/브라우저에서 접속하면 Presence 변화를 확인할 수 있습니다.");
  })();
  