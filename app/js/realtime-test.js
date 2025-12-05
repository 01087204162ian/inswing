// app/js/realtime-test.js

(function () {
  const logEl = document.getElementById("log");
  const sessionInput = document.getElementById("sessionId");
  const connectBtn = document.getElementById("connectBtn");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  let socket = null;
  let channel = null;

  function log(...args) {
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
    console.log("[Realtime TEST]", ...args);
  }

  function setupSocket() {
    if (!window.Phoenix || !window.Phoenix.Socket) {
      log("❌ Phoenix.Socket 이 정의되지 않았습니다.");
      return;
    }

    socket = new window.Phoenix.Socket("wss://realtime.inswing.ai/socket");
    
    socket.onOpen(() => {
      log("✅ 소켓 연결 성공");
    });
    
    socket.onError((error) => {
      log("❌ 소켓 연결 오류:", error);
    });
    
    socket.onClose((event) => {
      log("🔌 소켓 연결 종료:", event.code, event.reason);
    });
    
    socket.connect();
    log("🔌 소켓 연결 시도...");
  }

  function joinSession() {
    const sessionId = sessionInput.value.trim();
    if (!sessionId) {
      alert("세션 ID를 입력해주세요.");
      return;
    }
    if (!socket) {
      setupSocket();
    }
    if (!socket) return;

    channel = socket.channel("session:" + sessionId, {});
    log(`➡️ 채널 join 시도: session:${sessionId}`);

    channel
      .join()
      .receive("ok", resp => {
        log("✅ JOIN OK:", resp);
      })
      .receive("error", err => {
        log("❌ JOIN ERROR:", err);
      });

    // 서버에서 오는 이벤트 수신
    channel.on("chat:added", payload => {
      log("💬 [chat:added]", payload);
    });

    channel.on("presence:state", payload => {
      log("👥 [presence:state]", payload);
    });
  }

  function sendMessage() {
    if (!channel) {
      alert("먼저 세션에 join 해주세요.");
      return;
    }
    const text = messageInput.value.trim();
    if (!text) return;

    const payload = {
      message: text,
      meta: { ts: Date.now() }
    };

    log("➡️ chat:new 전송:", payload);

    channel
      .push("chat:new", payload)
      .receive("ok", resp => {
        log("✅ chat:new 응답:", resp);
      })
      .receive("error", err => {
        log("❌ chat:new 오류:", err);
      });
  }

  connectBtn.addEventListener("click", () => {
    if (!socket) {
      setupSocket();
      // 약간의 딜레이 후 join
      setTimeout(joinSession, 300);
    } else {
      joinSession();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  log("INSWING Realtime 테스트 스크립트 로드 완료");
})();

