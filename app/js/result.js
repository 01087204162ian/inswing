// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능

(function () {
  'use strict';

  let socket = null;
  let channel = null;
  let channelState = "idle";
  let sessionId = null;

  const $ = (id) => document.getElementById(id);

  function getSwingId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function initRealtime(sessionId) {
    if (!sessionId) {
      console.warn('[Realtime] sessionId 없음');
      return;
    }

    if (typeof Phoenix === 'undefined') {
      console.warn('[Realtime] Phoenix Socket 미로드');
      return;
    }

    if (socket && socket.connectionState() === 'open') {
      if (channel && channelState === 'joined') {
        console.log('[Realtime] 이미 연결되어 있음');
        return;
      }
      if (!channel || channelState === 'idle' || channelState === 'errored') {
        joinChannel(sessionId);
        return;
      }
      return;
    }

    const socketUrl = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
    console.log('[Realtime] WebSocket 연결 시도:', socketUrl);

    socket = new Phoenix.Socket(socketUrl, {
      reconnectAfterMs: () => 2000,
    });

    socket.onOpen(() => {
      console.log('[Realtime] ✅ 소켓 연결 성공');
      joinChannel(sessionId);
    });

    socket.onError(() => {
      console.error('[Realtime] ❌ 소켓 오류');
    });

    socket.onClose(() => {
      console.log('[Realtime] 🔌 소켓 연결 종료');
      channel = null;
      channelState = "idle";
    });

    socket.connect();
  }

  function joinChannel(sessionId) {
    if (!socket || socket.connectionState() !== 'open') {
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

    channelState = "joining";

    const topic = `session:${sessionId}`;
    console.log('[Realtime] 채널 join 시도:', topic);

    channel = socket.channel(topic, {
      rejoinAfterMs: () => false
    });

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
      if (!reason || (typeof reason === "object" && Object.keys(reason).length === 0)) {
        console.warn('[Realtime] ⚠ 빈 error 객체 감지');
        return;
      }
      console.error('[Realtime] ⚠ 채널 에러:', reason);
      channelState = "errored";
    });

    channel.onClose(() => {
      console.log('[Realtime] ℹ 채널 종료됨');
      channelState = "idle";
    });

    channel
      .join()
      .receive('ok', (resp) => {
        if (channelState === 'joined') {
          console.warn('[Realtime] JOIN OK 중복 수신 무시');
          return;
        }

        if (channel && channel.state === 'joined') {
          console.log('[Realtime] 🎯 JOIN OK (기존 메시지:', (resp.messages || []).length, '개)');
          channelState = "joined";

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
        } else {
          console.warn('[Realtime] JOIN OK 수신했지만 채널 상태가 joined 아님');
          channelState = "idle";
        }
      })
      .receive('error', (err) => {
        console.error('[Realtime] ❌ JOIN ERROR:', err);
        channelState = "errored";
      })
      .receive('timeout', () => {
        console.warn('[Realtime] ⏱ JOIN TIMEOUT');
        channelState = "idle";
      });
  }

  function sendMessage(msg) {
    if (!channel || channelState !== 'joined') {
      console.warn('[Realtime] 채널이 joined 상태가 아님');
      return;
    }

    if (!msg || !msg.trim()) {
      return;
    }

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
        const input = $('chat-input');
        if (input) input.value = '';
      })
      .receive('error', (err) => {
        console.error('[Realtime] 메시지 전송 오류:', err);
      });
  }

  function appendMessage(author, text, ts) {
    const list = $('chat-list');
    if (!list) return;

    const time = new Date(ts).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const role = author === 'golfer' ? 'golfer' : author === 'ai' ? 'ai' : 'coach';
    const profileIcon = role === 'golfer' ? '나' : role === 'ai' ? 'AI' : '코치';

    const el = document.createElement('div');
    el.className = `chat-message ${role}`;

    let content = '';
    if (role === 'ai') {
      content = `<div class="bubble ai-insight"><span class="insight-badge">💡 Insight</span><div>${text}</div></div>`;
    } else {
      content = `<div class="bubble">${text}</div>`;
    }

    el.innerHTML = `
      <div class="profile-icon">${profileIcon}</div>
      <div class="content">
        ${content}
        <div class="meta">${time}</div>
      </div>
    `;

    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }

  function init() {
    sessionId = getSwingId();
    if (!sessionId) {
      console.warn('[Realtime] swingId 없음');
      return;
    }

    const sendBtn = $('chat-send');
    const input = $('chat-input');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const msg = input?.value;
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
