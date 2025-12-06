// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능 (순수 WebSocket 버전)
(function () {
    'use strict';
  
    // ---------- 내부 상태 ----------
    let ws = null;
    let joined = false;
    let joinRef = 1;
    let pushRef = 1;
    let topic = null;
  
    const WS_URL = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
  
    const $ = (id) => document.getElementById(id);
  
    function getSwingId() {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    }
  
    // ---------- UI 보조 ----------
    function updateConnectionStatus(status) {
      const el = $('realtimeStatus');
      if (!el) return;
  
      const textMap = {
        connected: '연결됨',
        joined: '연결됨',
        disconnected: '연결 끊김',
        error: '연결 오류',
        timeout: '연결 시간 초과',
      };
  
      el.textContent = textMap[status] || '연결 중...';
      el.className = `realtime-status status-${status}`;
    }
  
    function enableChatInput(enabled) {
      const input = $('realtimeMessageInput');
      const btn = $('realtimeSendBtn');
      if (input) {
        input.disabled = !enabled;
        input.placeholder = enabled ? '메시지를 입력하세요...' : '연결 중...';
      }
      if (btn) {
        btn.disabled = !enabled;
      }
    }
  
    function setupMobilePanelToggle() {
      const header = $('realtimeHeader');
      const wrapper = document.querySelector('.realtime-coaching-wrapper');
      if (!header || !wrapper) return;
  
      if (window.innerWidth <= 768) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
          wrapper.classList.toggle('expanded');
        });
      }
    }
  
    // ---------- 메시지 렌더링 ----------
    function createMessageElement(payload) {
      const div = document.createElement('div');
      div.className = 'realtime-message';
  
      const role = payload.author_role || 'golfer';
      const isGolfer = role === 'golfer';
  
      if (isGolfer) div.classList.add('message-golfer');
      else div.classList.add('message-coach');
  
      const textEl = document.createElement('div');
      textEl.className = 'message-text';
      textEl.textContent = payload.message || '';
  
      const timeEl = document.createElement('div');
      timeEl.className = 'message-time';
      const ts = (payload.meta && payload.meta.ts) || Date.now();
      const date = new Date(ts);
      timeEl.textContent = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
  
      div.appendChild(textEl);
      div.appendChild(timeEl);
      return div;
    }
  
    function handleIncomingMessage(payload) {
      if (!payload || payload.type !== 'chat_message') return;
  
      const list = $('realtimeMessageList');
      if (!list) return;
  
      const el = createMessageElement(payload);
      list.appendChild(el);
      list.scrollTop = list.scrollHeight;
    }
  
    // ---------- WebSocket 메시지 파서 ----------
    function handleFrame(data) {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        console.warn('[Realtime] JSON 파싱 실패:', data);
        return;
      }
  
      if (!Array.isArray(msg) || msg.length < 5) {
        // Phoenix 프레임이 아님
        return;
      }
  
      const [joinRef, ref, frameTopic, eventName, payload] = msg;
  
      // JOIN 응답
      if (eventName === 'phx_reply' && frameTopic === topic) {
        // payload: { status: "ok", response: { ... } }
        if (payload && payload.status === 'ok') {
          console.log('[Realtime] ✅ JOIN OK:', payload.response || payload);
          joined = true;
          updateConnectionStatus('joined');
          enableChatInput(true);
        } else {
          console.warn('[Realtime] ❌ JOIN ERROR:', payload);
          joined = false;
          updateConnectionStatus('error');
          enableChatInput(false);
        }
        return;
      }
  
      // 채널 에러
      if (eventName === 'phx_error') {
        console.warn('[Realtime] 채널 에러:', payload);
        joined = false;
        updateConnectionStatus('error');
        enableChatInput(false);
        return;
      }
  
      // 우리가 원하는 이벤트
      if (eventName === 'event:new') {
        console.log('[Realtime] 💬 event:new 수신:', payload);
        handleIncomingMessage(payload);
      }
    }
  
    // ---------- WebSocket 연결 ----------
    function connect() {
      const swingId = getSwingId();
      if (!swingId) {
        console.warn('[Realtime] swingId가 없어 실시간 코칭을 시작할 수 없습니다.');
        return;
      }
  
      topic = `session:${swingId}`;
  
      console.log('[Realtime] WebSocket 연결 시도:', WS_URL);
      ws = new WebSocket(WS_URL);
  
      ws.onopen = () => {
        console.log('[Realtime] ✅ 소켓 연결 성공');
        updateConnectionStatus('connected');
        enableChatInput(false);
  
        // JOIN 프레임 전송: [joinRef, ref, topic, "phx_join", payload]
        const frame = [null, String(joinRef++), topic, 'phx_join', {}];
        console.log('[Realtime] ➡️ phx_join 전송:', frame);
        ws.send(JSON.stringify(frame));
      };
  
      ws.onmessage = (event) => {
        // Phoenix는 연결 유지용 ping도 보내므로 그대로 다 넘겨서 처리
        handleFrame(event.data);
      };
  
      ws.onerror = (err) => {
        console.error('[Realtime] ❌ WebSocket 오류:', err);
        updateConnectionStatus('error');
        enableChatInput(false);
      };
  
      ws.onclose = () => {
        console.log('[Realtime] 🔌 WebSocket 연결 종료');
        joined = false;
        updateConnectionStatus('disconnected');
        enableChatInput(false);
      };
    }
  
    // ---------- 메시지 전송 ----------
    function sendMessage() {
      const swingId = getSwingId();
      if (!swingId) {
        console.warn('[Realtime] swingId가 없어 메시지를 전송할 수 없습니다.');
        return;
      }
  
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[Realtime] WebSocket이 열려 있지 않습니다.');
        return;
      }
  
      if (!joined) {
        console.warn('[Realtime] 아직 채널 join 전입니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
  
      const input = $('realtimeMessageInput');
      if (!input) return;
  
      const message = input.value.trim();
      if (!message) return;
  
      const payload = {
        type: 'chat_message',
        session_id: swingId,
        author_role: 'golfer',
        author_id: 'golfer_1',
        message,
        meta: { ts: Date.now() },
      };
  
      const frame = [null, String(pushRef++), topic, 'event:new', payload];
  
      console.log('[Realtime] ➡️ event:new 전송:', frame);
      try {
        ws.send(JSON.stringify(frame));
        input.value = '';
      } catch (e) {
        console.error('[Realtime] ❌ event:new 전송 실패:', e);
      }
    }
  
    // ---------- 초기화 ----------
    function init() {
      // DOM 준비되면 실행
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            connect();
            setupMobilePanelToggle();
          }, 500);
        });
      } else {
        setTimeout(() => {
          connect();
          setupMobilePanelToggle();
        }, 500);
      }
  
      const sendBtn = $('realtimeSendBtn');
      if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
      }
  
      const input = $('realtimeMessageInput');
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });
      }
  
      window.addEventListener('resize', setupMobilePanelToggle);
    }
  
    // 시작
    init();
  })();
  