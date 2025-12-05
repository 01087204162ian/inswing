// app/js/realtime-test.js

// app/js/realtime-test.js
// INSWING Realtime WebSocket / Channel / Presence / Chat 테스트 스크립트

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
    let isJoined = false;
    let lastSessionId = null;
  
    // 로그 출력 헬퍼
    function log(...args) {
      const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
      console.log("[Realtime TEST]", ...args);
    }
  
    // WebSocket 종료 코드 설명
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
  
    // Phoenix Socket 생성 및 연결
    function setupSocket() {
      if (!window.Phoenix || !window.Phoenix.Socket) {
        log("❌ Phoenix.Socket 이 정의되지 않았습니다. phoenix.js 로드 여부를 확인하세요.");
        return;
      }
  
      const serverUrl = serverUrlSelect.value;
      log(`🔌 서버 연결 시도: ${serverUrl}`);
  
      socket = new window.Phoenix.Socket(serverUrl, {
        reconnectAfterMs: () => 1000,
        rejoinAfterMs: () => false // 자동 rejoin 비활성화 (테스트 목적)
      });
  
      socket.onOpen(() => {
        log("✅ 소켓 연결 성공");
        connectBtn.disabled = false;
        disconnectBtn.disabled = false;
        if (lastSessionId) {
          log(`ℹ️ 소켓 재연결 완료. 세션(${lastSessionId})에 다시 JOIN 해 주세요.`);
        }
      });
  
      socket.onError((error) => {
        log("❌ 소켓 연결 오류:", error && error.type ? error.type : "Unknown error");
        if (error && error.target && error.target.readyState === WebSocket.CLOSED) {
          log("   → WebSocket이 닫혔습니다. 서버가 실행 중인지 확인하세요.");
        }
        isJoined = false;
        channel = null;
        sendBtn.disabled = true;
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
        isJoined = false;
        channel = null;
        sendBtn.disabled = true;
      });
  
      socket.connect();
    }
  
    // 세션 JOIN 진입점
    function joinSession() {
      const sessionId = sessionInput.value.trim();
      if (!sessionId) {
        alert("세션 ID를 입력해주세요.");
        return;
      }
  
      if (!socket || socket.connectionState() !== "open") {
        log("⚠️ 소켓이 연결되지 않았습니다. 먼저 연결을 시도합니다...");
        setupSocket();
  
        // 소켓 연결 대기 후 join 시도
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
  
    // 실제 채널 join 로직
    function doJoinSession(sessionId) {
      if (!socket) return;
  
      // 이미 join 중이면 중복 호출 방지
      if (isJoining) {
        log("⚠️ 이미 join 중입니다. 잠시 기다려주세요.");
        return;
      }
  
      // 이미 같은 세션에 joined 상태이면 무시
      if (channel && channel.topic === "session:" + sessionId && channel.state === "joined") {
        log("ℹ️ 이미 해당 세션에 join되어 있습니다.");
        return;
      }
  
      // 기존 채널이 있으면 먼저 leave
      if (channel) {
        channel.leave();
        channel = null;
      }
  
      isJoining = true;
      isJoined = false;
      lastSessionId = sessionId;
      sendBtn.disabled = true;
  
      channel = socket.channel("session:" + sessionId, {});
      log(`➡️ 채널 join 시도: session:${sessionId}`);
  
      channel
        .join()
        .receive("ok", resp => {
          isJoining = false;
          isJoined = true;
          log("✅ JOIN OK:", JSON.stringify(resp));
          connectBtn.disabled = false;
          sendBtn.disabled = false;
        })
        .receive("error", err => {
          isJoining = false;
          isJoined = false;
          log("❌ JOIN ERROR:", JSON.stringify(err));
          connectBtn.disabled = false;
          sendBtn.disabled = true;
        })
        .receive("timeout", () => {
          isJoining = false;
          isJoined = false;
          log("⏱️ JOIN TIMEOUT: 서버 응답이 없습니다.");
          connectBtn.disabled = false;
          sendBtn.disabled = true;
        });
  
      // 서버에서 오는 이벤트 수신
      channel.on("chat:added", payload => {
        log("💬 [chat:added]", JSON.stringify(payload));
      });
  
      channel.on("presence:state", payload => {
        log("👥 [presence:state]", JSON.stringify(payload));
      });
  
      channel.on("presence:diff", payload => {
        log("👥 [presence:diff]", JSON.stringify(payload));
      });
  
      channel.onClose(() => {
        isJoined = false;
        channel = null;
        sendBtn.disabled = true;
        log("ℹ️ 채널이 닫혔습니다.");
      });
    }
  
    // 연결 해제
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
      isJoined = false;
      sendBtn.disabled = true;
    }
  
    // 채팅 메시지 전송
    function sendMessage() {
      if (!channel) {
        alert("먼저 세션에 join 해주세요.");
        return;
      }
  
      // 채널이 아직 joined 상태가 아니면 전송하지 않음
      if (!isJoined || channel.state !== "joined") {
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
          messageInput.value = ""; // 전송 후 입력칸 비우기
        })
        .receive("error", err => {
          log("❌ chat:new 오류:", err);
        });
    }
  
    // 버튼 이벤트 바인딩
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
    sendBtn.disabled = true;
  
    // Enter 키로 메시지 전송
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  
    // 초기 안내 로그
    log("INSWING Realtime 테스트 스크립트 로드 완료");
    log("💡 팁: 서버가 실행되지 않은 경우 '로컬 개발' 옵션을 선택하거나");
    log("   서버 관리자(Ian)에게 서버 상태를 확인하세요.");
  })();
  