// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능
(function () {
  'use strict';

  let socket = null;
  let channel = null;
  let channelState = 'idle';
  let sessionId = null;

  const $ = (id) => document.getElementById(id);

  function getSwingId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  // ===== UI 상태 처리 =====

  function setConnectionStatus(status) {
    const statusEl = $('realtimeStatus');
    if (!statusEl) return;

    let text = '연결 중...';

    switch (status) {
      case 'joined':
        text = '연결됨';
        statusEl.className = 'realtime-status status-joined';
        break;
      case 'error':
        text = '연결 오류';
        statusEl.className = 'realtime-status status-error';
        break;
      case 'disconnected':
        text = '연결 끊김';
        statusEl.className = 'realtime-status status-disconnected';
        break;
      case 'connecting':
      default:
        text = '연결 중...';
        statusEl.className = 'realtime-status status-connecting';
        break;
    }

    statusEl.textContent = text;
  }

  function setChatEnabled(enabled) {
    const input = $('realtimeMessageInput');
    const sendBtn = $('realtimeSendBtn');

    if (input) {
      input.disabled = !enabled;
      input.readOnly = !enabled; // 혹시 모를 경우 대비
      input.placeholder = enabled ? '메시지를 입력하세요...' : '연결 중...';

      console.log('[Realtime] 입력창 상태 변경', {
        enabled,
        disabled: input.disabled,
        readOnly: input.readOnly
      });
    }

    if (sendBtn) {
      sendBtn.disabled = !enabled;
      console.log('[Realtime] 전송 버튼 상태 변경', {
        enabled,
        disabled: sendBtn.disabled
      });
    }
  }

  // ===== WebSocket / 채널 연결 =====

  function initRealtime(sessionIdParam) {
    if (!sessionIdParam) {
      console.warn('[Realtime] sessionId 없음');
      return;
    }

    if (typeof Phoenix === 'undefined' || !Phoenix.Socket) {
      console.warn('[Realtime] Phoenix Socket 미로드');
      return;
    }

    setConnectionStatus('connecting');
    setChatEnabled(false);

    // 이미 열린 소켓이 있으면 재사용
    if (socket && socket.connectionState && socket.connectionState() === 'open') {
      if (channel && channelState === 'joined') {
        console.log('[Realtime] 이미 연결되어 있음');
        setConnectionStatus('joined');
        setChatEnabled(true);
        return;
      }
      if (!channel || channelState === 'idle' || channelState === 'errored') {
        joinChannel(sessionIdParam);
        return;
      }
      return;
    }

    const socketUrl = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
    console.log('[Realtime] WebSocket 연결 시도:', socketUrl);

    socket = new Phoenix.Socket(socketUrl, {
      reconnectAfterMs: () => 2000
    });

    socket.onOpen(() => {
      console.log('[Realtime] ✅ 소켓 연결 성공');
      joinChannel(sessionIdParam);
    });

    socket.onError(() => {
      console.error('[Realtime] ❌ 소켓 오류');
      setConnectionStatus('error');
      setChatEnabled(false);
    });

    socket.onClose(() => {
      console.log('[Realtime] 🔌 소켓 연결 종료');
      channel = null;
      channelState = 'idle';
      setConnectionStatus('disconnected');
      setChatEnabled(false);
    });

    socket.connect();
  }

  function joinChannel(sessionIdParam) {
    if (!socket || !socket.connectionState || socket.connectionState() !== 'open') {
      console.warn('[Realtime] 소켓 미연결');
      return;
    }

    if (channelState === 'joined' || channelState === 'joining') {
      console.warn('[Realtime] 이미 join 중이거나 joined 상태');
      return;
    }

    if (channel && channelState === 'errored') {
      try {
        channel.leave();
      } catch (e) {}
      channel = null;
    }

    channelState = 'joining';
    setConnectionStatus('connecting');
    setChatEnabled(false);

    const topic = `session:${sessionIdParam}`;
    console.log('[Realtime] 채널 join 시도:', topic);

    channel = socket.channel(topic, {
      rejoinAfterMs: () => false
    });

    // 서버에서 브로드캐스트되는 이벤트 수신
    channel.on('event:added', (payload) => {
      console.log('[Realtime] 💬 event:added 수신:', payload);
      if (payload.type === 'chat_message') {
        appendMessage(
          payload.author_role || 'coach',
          payload.message || '',
          payload.meta?.ts || Date.now()
        );
      }
    });

    channel.onError((reason) => {
      if (!reason || (typeof reason === 'object' && Object.keys(reason).length === 0)) {
        console.warn('[Realtime] ⚠ 빈 error 객체 감지 (무시)');
        return;
      }
      console.error('[Realtime] ⚠ 채널 에러:', reason);
      channelState = 'errored';
      setConnectionStatus('error');
      setChatEnabled(false);
    });

    channel.onClose(() => {
      console.log('[Realtime] ℹ 채널 종료됨');
      channelState = 'idle';
      setConnectionStatus('disconnected');
      setChatEnabled(false);
    });

    channel
      .join()
      .receive('ok', (resp) => {
        console.log(
          '[Realtime] 🎯 JOIN OK (기존 메시지:',
          (resp.messages || []).length,
          '개)'
        );

        channelState = 'joined';
        setConnectionStatus('joined');
        setChatEnabled(true);

        // JOIN 직후 실제 DOM 상태 확인용 로그
        const input = $('realtimeMessageInput');
        const btn = $('realtimeSendBtn');
        console.log('[Realtime] JOIN 후 DOM 상태', {
          inputDisabled: input?.disabled,
          inputReadOnly: input?.readOnly,
          btnDisabled: btn?.disabled
        });

        // 기존 메시지 렌더링
        if (resp.messages && Array.isArray(resp.messages)) {
          resp.messages.forEach((msg) => {
            if (msg.type === 'chat_message') {
              appendMessage(
                msg.author_role || 'coach',
                msg.message || '',
                msg.meta?.ts || Date.now()
              );
            }
          });
        }
      })
      .receive('error', (err) => {
        console.error('[Realtime] ❌ JOIN ERROR:', err);
        channelState = 'errored';
        setConnectionStatus('error');
        setChatEnabled(false);
      })
      .receive('timeout', () => {
        console.warn('[Realtime] ⏱ JOIN TIMEOUT');
        channelState = 'idle';
        setConnectionStatus('error');
        setChatEnabled(false);
      });
  }

  // ===== 메시지 전송 / 렌더링 =====

  function sendMessage(msg) {
    if (!channel || channelState !== 'joined') {
      console.warn('[Realtime] 채널이 joined 상태가 아님');
      return;
    }

    if (!msg || !msg.trim()) return;

    const payload = {
      type: 'chat_message',
      session_id: sessionId,
      author_role: 'golfer',
      author_id: 'golfer_1',
      message: msg.trim(),
      meta: { ts: Date.now() }
    };

    channel
      .push('event:new', payload)
      .receive('ok', () => {
        console.log('[Realtime] 메시지 전송 성공');
        const input = $('realtimeMessageInput');
        if (input) input.value = '';
      })
      .receive('error', (err) => {
        console.error('[Realtime] 메시지 전송 오류:', err);
      });
  }

  function appendMessage(authorRole, text, ts) {
    const list = $('realtimeMessageList');
    if (!list) return;

    const timeStr = new Date(ts).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const isGolfer = authorRole === 'golfer';

    const wrapper = document.createElement('div');
    wrapper.className = `realtime-message ${isGolfer ? 'message-golfer' : 'message-coach'}`;

    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = text;

    const timeEl = document.createElement('div');
    timeEl.className = 'message-time';
    timeEl.textContent = timeStr;

    wrapper.appendChild(textEl);
    wrapper.appendChild(timeEl);

    list.appendChild(wrapper);
    list.scrollTop = list.scrollHeight;
  }

  // ===== 초기화 =====

  function init() {
    sessionId = getSwingId();
    if (!sessionId) {
      console.warn('[Realtime] swingId 없음');
      return;
    }

    const input = $('realtimeMessageInput');
    const sendBtn = $('realtimeSendBtn');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (!input) return;
        const msg = input.value;
        if (msg) sendMessage(msg);
      });
    }

    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const msg = input.value;
          if (msg) sendMessage(msg);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initRealtime(sessionId), 500);
      });
    } else {
      setTimeout(() => initRealtime(sessionId), 500);
    }
  }

  init();
})();
