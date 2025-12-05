// app/js/realtime-test.js

(function () {
  const logEl = document.getElementById("log");
  const serverUrlSelect = document.getElementById("serverUrl");
  const sessionInput = document.getElementById("sessionId");
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  let socket = null;
  let channel = null;
  let isJoining = false;

  function log(...args) {
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
    console.log("[Realtime TEST]", ...args);
  }

  function getErrorCodeMessage(code) {
    const codes = {
      1000: "정상 종료",
      1001: "엔드포인트가 사라짐",
      1002: "프로토콜 오류",
      1003: "지원하지 않는 데이터 타입",
      1006: "비정상 종료 (서버 응답 없음 또는 연결 거부)",
      1007: "데이터 형식 오류",
      1008: "정책 위반",
      1009: "메시지가 너무 큼",
      1010: "확장 협상 실패",
      1011: "서버 오류",
      1012: "서비스 재시작",
      1013: "일시적 오류",
      1014: "잘못된 게이트웨이",
      1015: "TLS 핸드셰이크 실패"
    };
    return codes[code] || `알 수 없는 오류 (코드: ${code})`;
  }

  function setupSocket() {
    if (!window.Phoenix || !window.Phoenix.Socket) {
      log("❌ Phoenix.Socket 이 정의되지 않았습니다.");
      return;
    }

    const serverUrl = serverUrlSelect.value;
    log(`🔌 서버 연결 시도: ${serverUrl}`);

    socket = new window.Phoenix.Socket(serverUrl, {
      reconnectAfterMs: () => 1000,
      rejoinAfterMs: () => false  // 자동 rejoin 비활성화 (테스트 목적)
    });
    
    socket.onOpen(() => {
      log("✅ 소켓 연결 성공");
      connectBtn.disabled = false;
      disconnectBtn.disabled = false;
    });
    
    socket.onError((error) => {
      log("❌ 소켓 연결 오류:", error.type || "Unknown error");
      if (error.target && error.target.readyState === WebSocket.CLOSED) {
        log("   → WebSocket이 닫혔습니다. 서버가 실행 중인지 확인하세요.");
      }
    });
    
    socket.onClose((event) => {
      const code = event.code || 1006;
      const reason = event.reason || "";
      const message = getErrorCodeMessage(code);
      log(`🔌 소켓 연결 종료: ${code} - ${message}${reason ? ` (${reason})` : ""}`);
      
      if (code === 1006) {
        log("   → 가능한 원인:");
        log("     1. 서버가 실행되지 않음");
        log("     2. Nginx WebSocket 업그레이드 설정 문제");
        log("     3. 방화벽 또는 네트워크 문제");
        log("     4. SSL/TLS 인증서 문제");
      }
      
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
    });
    
    socket.connect();
  }

  function joinSession() {
    const sessionId = sessionInput.value.trim();
    if (!sessionId) {
      alert("세션 ID를 입력해주세요.");
      return;
    }
    if (!socket || socket.connectionState() !== "open") {
      log("⚠️ 소켓이 연결되지 않았습니다. 먼저 연결을 시도합니다...");
      setupSocket();
      // 소켓 연결 대기 후 join
      setTimeout(() => {
        if (socket && socket.connectionState() === "open") {
          doJoinSession(sessionId);
        } else {
          log("❌ 소켓 연결 실패. join을 시도할 수 없습니다.");
        }
      }, 1000);
      return;
    }
    doJoinSession(sessionId);
  }

  function doJoinSession(sessionId) {
    if (!socket) return;
    
    // 이미 join 중이면 무시
    if (isJoining) {
      log("⚠️ 이미 join 중입니다. 잠시 기다려주세요.");
      return;
    }
    
    // 이미 같은 채널에 join되어 있으면 무시
    if (channel && channel.topic === "session:" + sessionId && channel.state === "joined") {
      log("ℹ️ 이미 해당 세션에 join되어 있습니다.");
      return;
    }

    // 기존 채널이 있으면 먼저 떠나기
    if (channel) {
      channel.leave();
      channel = null;
    }

    isJoining = true;
    channel = socket.channel("session:" + sessionId, {});
    log(`➡️ 채널 join 시도: session:${sessionId}`);

    channel
      .join()
      .receive("ok", resp => {
        isJoining = false;
        log("✅ JOIN OK:", JSON.stringify(resp));
        connectBtn.disabled = false;
      })
      .receive("error", err => {
        isJoining = false;
        log("❌ JOIN ERROR:", JSON.stringify(err));
        connectBtn.disabled = false;
      })
      .receive("timeout", () => {
        isJoining = false;
        log("⏱️ JOIN TIMEOUT: 서버 응답이 없습니다.");
        connectBtn.disabled = false;
      });

    // 서버에서 오는 이벤트 수신 (중복 방지를 위해 기존 리스너 제거 후 등록)
    channel.off("chat:added");
    channel.off("presence:state");
    channel.off("presence:diff");
    
    channel.on("chat:added", payload => {
      log("💬 [chat:added]", JSON.stringify(payload));
    });

    channel.on("presence:state", payload => {
      log("👥 [presence:state]", JSON.stringify(payload));
    });

    channel.on("presence:diff", payload => {
      log("👥 [presence:diff]", JSON.stringify(payload));
    });
  }

  function disconnect() {
    isJoining = false;
    if (channel) {
      channel.leave();
      channel = null;
      log("👋 채널에서 떠남");
    }
    if (socket) {
      socket.disconnect();
      socket = null;
      log("🔌 소켓 연결 종료");
    }
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }

  function sendMessage() {
    if (!channel) {
      alert("먼저 세션에 join 해주세요.");
      return;
    }

    // 채널이 아직 joined 상태가 아니면 전송하지 않음
    if (channel.state !== "joined") {
      log(`⚠️ 채널 상태가 joined가 아닙니다. 현재 상태: ${channel.state}`);
      return;
    }

    // 소켓 연결 상태 확인
    if (!socket || socket.connectionState() !== "open") {
      log("⚠️ 소켓이 열려 있지 않습니다. 다시 연결 후 시도하세요.");
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
    connectBtn.disabled = true;
    if (!socket || socket.connectionState() !== "open") {
      setupSocket();
      // 소켓 연결 대기 후 join
      setTimeout(() => {
        if (socket && socket.connectionState() === "open") {
          joinSession();
        } else {
          log("⚠️ 소켓 연결이 완료되지 않았습니다. 잠시 후 다시 시도하세요.");
          connectBtn.disabled = false;
        }
      }, 1500);
    } else {
      joinSession();
      connectBtn.disabled = false;
    }
  });

  disconnectBtn.addEventListener("click", disconnect);
  disconnectBtn.disabled = true;

  sendBtn.addEventListener("click", sendMessage);

  // Enter 키로 메시지 전송
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  log("INSWING Realtime 테스트 스크립트 로드 완료");
  log("💡 팁: 서버가 실행되지 않은 경우 '로컬 개발' 옵션을 선택하거나");
  log("   서버 관리자(Ian)에게 서버 상태를 확인하세요.");
})();

