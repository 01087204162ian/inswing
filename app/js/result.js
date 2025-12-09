// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능 (안정 버전)

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────
  // 전역 상태 (재연결 / 페이지 중복 실행 대비)
  // ──────────────────────────────────────────────────────────
  let socket = null;
  let channel = null;
  let initialized = false;
  let isJoining = false;
  let isJoined = false;

  const $ = (id) => document.getElementById(id);
  const allowedTypes = ['chat_message', 'image', 'audio'];

  function getSwingId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  // ──────────────────────────────────────────────────────────
  // WebSocket 연결
  // ──────────────────────────────────────────────────────────
  function initRealtimeCoaching() {
    if (initialized) {
      console.log('[Realtime] init 이미 실행됨 - 중복 방지');
      return;
    }
    initialized = true;

    const swingId = getSwingId();
    if (!swingId) return console.warn('[Realtime] swingId 없음 → 종료');

    if (typeof Phoenix === 'undefined') {
      return console.warn('[Realtime] Phoenix Socket 미로드 → 종료');
    }

    // 이미 소켓이 연결되어 있고 채널도 joined 상태면 재사용
    if (socket && socket.connectionState() === 'open' && 
        channel && channel.state === 'joined') {
      console.log('[Realtime] 기존 연결 재사용');
      return;
    }

    const socketUrl = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
    console.log('[Realtime] WebSocket 연결 시도:', socketUrl);

    socket = new Phoenix.Socket(socketUrl, {
      reconnectAfterMs: () => 2000,
    });

    socket.onOpen(() => {
      console.log('[Realtime] ✅ 소켓 연결 성공');
      updateConnectionStatus('connected');
      // 약간의 딜레이를 주어 소켓이 완전히 준비되도록 함
      setTimeout(() => {
        joinChannel(swingId);
      }, 100);
    });

    socket.onError(() => {
      console.error('[Realtime] ❌ 소켓 오류');
      updateConnectionStatus('error');
      enableChatInput(false);
    });

    socket.onClose(() => {
      console.log('[Realtime] 🔌 소켓 연결 종료');
      channel = null;
      isJoined = false;
      isJoining = false;
      updateConnectionStatus('disconnected');
      enableChatInput(false);
    });

    socket.connect();
  }

  // ──────────────────────────────────────────────────────────
  // 채널 join
  // ──────────────────────────────────────────────────────────
  function joinChannel(swingId) {
    if (!socket || socket.connectionState() !== 'open') {
      return console.warn('[Realtime] 소켓 미연결 상태 → join 보류');
    }

    // 중복 join 방지: 이미 join 중이거나 joined 상태면 즉시 리턴
    if (isJoining) {
      return console.warn('[Realtime] 이미 join 중 → 중복 join 방지');
    }

    if (isJoined && channel && channel.state === 'joined') {
      return console.warn('[Realtime] 이미 joined 상태 → 중복 join 방지');
    }

    if (channel) {
      const state = channel.state;
      if (state === 'joined' || state === 'joining') {
        return console.warn('[Realtime] 채널 이미', state, '→ 중복 join 방지');
      }
      
      // errored 상태인 경우에만 재시도
      if (state === 'errored') {
        console.log('[Realtime] 채널 errored 상태 → 재연결 시도');
        // 이전 채널 정리 후 재시도
      } else if (state !== 'closed' && state !== 'leaving') {
        // 다른 상태면 대기
        return console.warn('[Realtime] 채널 상태:', state, '→ join 보류');
      }
    }

    // 이전 채널 clean up
    if (channel) {
      try {
        channel.off('event:new');
        channel.off('presence:state');
        channel.off('presence:diff');
        channel.off('typing');
        channel.off('typing_stop');
        channel.leave();
      } catch {}
      channel = null;
    }

    isJoined = false; // join 시작 전에 초기화

    const topic = `session:${swingId}`;
    console.log('[Realtime] 채널 join 시도:', topic);

    channel = socket.channel(topic, {
      rejoinAfterMs: () => false
    });

    setupChannelListeners(channel);

    // join 요청 전에 한 번 더 체크
    if (isJoining || (channel && channel.state === 'joined')) {
      return console.warn('[Realtime] join 직전 중복 체크 실패');
    }

    isJoining = true; // join 시작 전에 플래그 설정

    // join 요청 전에 한 번 더 체크
    if (isJoining || (channel && channel.state === 'joined')) {
      return console.warn('[Realtime] join 직전 중복 체크 실패');
    }

    isJoining = true; // join 시작 전에 플래그 설정

    channel
      .join()
      .receive('ok', (resp) => {
        // 중복 실행 방지: 이미 joined 상태면 무시
        if (isJoined && channel && channel.state === 'joined') {
          console.warn('[Realtime] JOIN OK 중복 수신 무시 (이미 joined)');
          isJoining = false;
          return;
        }

        // 채널이 없거나 상태가 joined가 아니면 무시
        if (!channel || channel.state !== 'joined') {
          console.warn('[Realtime] JOIN OK 수신하였지만 채널 상태가 joined 아님:', channel?.state);
          isJoining = false;
          isJoined = false;
          return;
        }

        console.log('[Realtime] ✅ JOIN OK:', resp);
        isJoining = false;
        isJoined = true;
        updateConnectionStatus('joined');
        enableChatInput(true);

        if (resp.messages?.length) {
          console.log('[Realtime] 기존 메시지 로드:', resp.messages.length);
          resp.messages.forEach(handleIncomingMessage);
        }
      })
      .receive('error', (err) => {
        console.error('[Realtime] ❌ JOIN ERROR:', err);
        isJoining = false;
        isJoined = false;
        updateConnectionStatus('error');
        enableChatInput(false);
      })
      .receive('timeout', () => {
        console.warn('[Realtime] ⏱ JOIN TIMEOUT');
        isJoining = false;
        isJoined = false;
        updateConnectionStatus('timeout');
        enableChatInput(false);
      });
  }

  // ──────────────────────────────────────────────────────────
  // 채널 이벤트 리스너
  // ──────────────────────────────────────────────────────────
  function setupChannelListeners(ch) {
    ch.on('event:new', (payload) => {
      console.log('[Realtime] 💬 event:new 수신:', payload);
      handleIncomingMessage(payload);
    });

    ch.on('presence:state', (presence) => {
      console.log('[Realtime] 👥 presence:state:', presence);
    });

    ch.on('presence:diff', (diff) => {
      console.log('[Realtime] 👥 presence:diff:', diff);
    });

    ch.onError((reason) => {
      // 🔥 빈 객체 또는 null/undefined 에러는 조용히 무시 (presence sync 중 자주 발생하는 정상 패턴)
      if (!reason || (typeof reason === "object" && Object.keys(reason).length === 0)) {
        return; // 로그 없이 조용히 무시
      }
    
      console.error("[Realtime] ⚠ 채널 에러:", reason);
      isJoining = false;
      isJoined = false;
      updateConnectionStatus("error");
      enableChatInput(false);
    });
    

    ch.onClose(() => {
      console.log('[Realtime] ℹ 채널 종료됨');
      isJoining = false;
      isJoined = false;
      updateConnectionStatus('disconnected');
      enableChatInput(false);
    });
  }

  // ──────────────────────────────────────────────────────────
  // 메시지 렌더링
  // ──────────────────────────────────────────────────────────
  function handleIncomingMessage(payload) {
    if (!allowedTypes.includes(payload.type)) return;
    renderMessage(payload);
  }

  function getProfileIcon(role) {
    if (role === 'golfer') return '나';
    if (role === 'coach') return '코치';
    if (role === 'ai') return 'AI';
    return '';
  }

  function renderMessage(payload) {
    const { author_role, message, meta, type, media_url, media_type } = payload;
    const role = author_role === 'golfer' ? 'golfer' : author_role === 'ai' ? 'ai' : 'coach';
    const time = new Date(meta?.ts || Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const el = document.createElement('div');
    el.className = `chat-message ${role}`;

    let content = '';

    if (type === 'image') {
      content = `<img src="${media_url}" class="media-content" onclick="window.open('${media_url}','_blank')">`;
    } else if (type === 'audio') {
      content = `<audio controls><source src="${media_url}" type="${media_type || 'audio/mpeg'}"></audio>`;
    } else if (role === 'ai') {
      content = `<div class="bubble ai-insight"><span class="insight-badge">💡 Insight</span><div>${message}</div></div>`;
    } else {
      content = `<div class="bubble">${message}</div>`;
    }

    el.innerHTML = `
      <div class="profile-icon">${getProfileIcon(role)}</div>
      <div class="content">
        ${content}
        <div class="meta">${time}</div>
      </div>
    `;

    const list = $('realtimeMessageList');
    if (list) {
      list.appendChild(el);
      list.scrollTop = list.scrollHeight;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 메시지 전송
  // ──────────────────────────────────────────────────────────
  function sendMessage() {
    const swingId = getSwingId();
    if (!swingId) {
      return console.warn('[Realtime] swingId 없음');
    }
    if (!channel) {
      return console.warn('[Realtime] 채널 객체 없음');
    }
    if (!isJoined) {
      return console.warn('[Realtime] isJoined = false');
    }
    if (channel.state !== 'joined') {
      return console.warn('[Realtime] 채널 상태:', channel.state, '(joined 아님)');
    }

    const input = $('realtimeMessageInput');
    const msg = input?.value.trim();
    if (!msg) return;

    const payload = {
      type: 'chat_message',
      session_id: swingId,
      author_role: 'golfer',
      author_id: 'golfer_1',
      message: msg,
      meta: { ts: Date.now() }
    };

    console.log('[Realtime] ➡ event:new 전송:', payload);

    channel.push('event:new', payload)
      .receive('ok', () => (input.value = ''))
      .receive('error', (e) => console.error('[Realtime] ❌ 전송 오류:', e));
  }

  // ──────────────────────────────────────────────────────────
  // UI 보조 함수
  // ──────────────────────────────────────────────────────────
  function updateConnectionStatus(status) {
    const el = $('realtimeStatus');
    if (!el) return;
    const txt = {
      connected: '연결됨',
      joined: '연결됨',
      disconnected: '연결 끊김',
      error: '연결 오류',
      timeout: '연결 시간 초과',
    };
    el.textContent = txt[status] || '연결 중...';
    el.className = `realtime-status status-${status}`;
  }

  function enableChatInput(enable) {
    const input = $('realtimeMessageInput');
    const btn = $('realtimeSendBtn');

    if (input) {
      input.disabled = !enable;
      input.placeholder = enable ? '메시지를 입력하세요...' : '연결 중...';
    }
    if (btn) btn.disabled = !enable;
  }

  // ──────────────────────────────────────────────────────────
  // 초기 실행
  // ──────────────────────────────────────────────────────────
  function init() {
    enableChatInput(false);
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        initRealtimeCoaching();
      }, 500);
    });

    $('realtimeSendBtn')?.addEventListener('click', sendMessage);
    $('realtimeMessageInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  init();
})();
