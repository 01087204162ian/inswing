// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능 (안정 버전)
(function () {
    'use strict';
  
    let socket = null;
    let channel = null;
    let isJoined = false;
    let messageRef = 0;
    let isRealtimeInitialized = false; // 🔥 중복 초기화 방지
  
    const $ = (id) => document.getElementById(id);
  
    function getSwingId() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('id');
    }
  
    // -----------------------------
    // WebSocket + 채널 초기화
    // -----------------------------
    function initRealtimeCoaching() {
      const swingId = getSwingId();
      if (!swingId) {
        console.warn('[Realtime] swingId가 없어 실시간 코칭을 시작할 수 없습니다.');
        return;
      }
  
      if (typeof Phoenix === 'undefined') {
        console.warn('[Realtime] Phoenix Socket 라이브러리가 로드되지 않았습니다.');
        return;
      }
  
      // 🔥 이미 소켓이 열려 있으면 새로 만들지 않고 채널만 join
      if (socket && socket.connectionState() === 'open') {
        console.log('[Realtime] 기존 소켓 재사용, 채널만 join');
        joinChannel(swingId);
        return;
      }
  
      const socketUrl = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
      console.log('[Realtime] WebSocket 연결 시도:', socketUrl);
  
      socket = new Phoenix.Socket(socketUrl, {
        reconnectAfterMs: () => 1000,
      });
  
      socket.onOpen(() => {
        console.log('[Realtime] ✅ 소켓 연결 성공');
        updateConnectionStatus('connected');
        joinChannel(swingId);
      });
  
      socket.onError((error) => {
        console.error('[Realtime] ❌ 소켓 연결 오류:', error);
        updateConnectionStatus('error');
      });
  
      socket.onClose(() => {
        console.log('[Realtime] 🔌 소켓 연결 종료');
        isJoined = false;
        channel = null;
        updateConnectionStatus('disconnected');
        enableChatInput(false);
      });
  
      socket.connect();
    }
  
    // -----------------------------
    // 채널 join
    // -----------------------------
    function joinChannel(swingId) {
      if (!socket || socket.connectionState() !== 'open') {
        console.warn('[Realtime] 소켓이 연결되지 않아 채널에 join할 수 없습니다.');
        return;
      }
  
      // 이전 채널 정리
      if (channel) {
        try {
          channel.leave();
        } catch (e) {
          console.warn('[Realtime] 이전 채널 leave 중 오류:', e);
        }
        channel = null;
        isJoined = false;
      }
  
      const topic = `session:${swingId}`;
      console.log('[Realtime] 채널 join 시도:', topic);
  
      channel = socket.channel(topic, {});
  
      channel
        .join()
        .receive('ok', (resp) => {
          console.log('[Realtime] ✅ JOIN OK:', resp);
          isJoined = true;
          updateConnectionStatus('joined');
          setTimeout(() => enableChatInput(true), 100);
        })
        .receive('error', (err) => {
          console.error('[Realtime] ❌ JOIN ERROR:', err);
          isJoined = false;
          updateConnectionStatus('error');
        })
        .receive('timeout', () => {
          console.warn('[Realtime] ⏱️ JOIN TIMEOUT');
          isJoined = false;
          updateConnectionStatus('timeout');
        });
  
      // event:new 수신
      channel.on('event:new', (payload) => {
        console.log('[Realtime] 💬 event:new 수신:', payload);
        handleIncomingMessage(payload);
      });
  
      channel.onClose(() => {
        console.log('[Realtime] ℹ️ 채널 종료됨');
        isJoined = false;
        enableChatInput(false);
        updateConnectionStatus('disconnected');
      });
    }
  
    // -----------------------------
    // 수신 메시지 처리
    // -----------------------------
    function handleIncomingMessage(payload) {
      if (payload.type !== 'chat_message') return;
  
      const messageList = $('realtimeMessageList');
      if (!messageList) return;
  
      const messageEl = createMessageElement(payload);
      messageList.appendChild(messageEl);
      messageList.scrollTop = messageList.scrollHeight;
    }
  
    function createMessageElement(payload) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'realtime-message';
  
      const authorRole = payload.author_role || 'golfer';
      const isGolfer = authorRole === 'golfer';
  
      if (isGolfer) {
        messageDiv.classList.add('message-golfer');
      } else {
        messageDiv.classList.add('message-coach');
      }
  
      const messageText = document.createElement('div');
      messageText.className = 'message-text';
      messageText.textContent = payload.message || '';
  
      const messageTime = document.createElement('div');
      messageTime.className = 'message-time';
      const ts = (payload.meta && payload.meta.ts) || Date.now();
      const date = new Date(ts);
      messageTime.textContent = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
  
      messageDiv.appendChild(messageText);
      messageDiv.appendChild(messageTime);
  
      return messageDiv;
    }
  
    // -----------------------------
    // 메시지 전송
    // -----------------------------
    function sendMessage() {
      const swingId = getSwingId();
      if (!swingId) {
        console.warn('[Realtime] swingId가 없어 메시지를 전송할 수 없습니다.');
        return;
      }
  
      if (!channel) {
        console.warn('[Realtime] 채널 객체가 없습니다.');
        return;
      }
  
      if (!isJoined || channel.state !== 'joined') {
        console.warn('[Realtime] 채널이 아직 joined 상태가 아닙니다.', {
          isJoined,
          state: channel.state,
        });
        return;
      }
  
      const input = $('realtimeMessageInput');
      if (!input) return;
  
      const message = input.value.trim();
      if (!message) return;
  
      messageRef += 1;
  
      const payload = {
        type: 'chat_message',
        session_id: swingId,
        author_role: 'golfer',
        author_id: 'golfer_1',
        message,
        meta: { ts: Date.now() },
      };
  
      console.log('[Realtime] ➡️ event:new 전송:', payload);
  
      channel
        .push('event:new', payload)
        .receive('ok', (resp) => {
          console.log('[Realtime] ✅ event:new 응답:', resp);
          input.value = '';
        })
        .receive('error', (err) => {
          console.error('[Realtime] ❌ event:new 오류:', err);
        });
    }
  
    // -----------------------------
    // UI 보조 함수들
    // -----------------------------
    function updateConnectionStatus(status) {
      const statusEl = $('realtimeStatus');
      if (!statusEl) return;
  
      const statusText = {
        connected: '연결됨',
        joined: '연결됨',
        disconnected: '연결 끊김',
        error: '연결 오류',
        timeout: '연결 시간 초과',
      };
  
      statusEl.textContent = statusText[status] || '연결 중...';
      statusEl.className = `realtime-status status-${status}`;
    }
  
    function enableChatInput(enabled) {
      const input = $('realtimeMessageInput');
      const sendBtn = $('realtimeSendBtn');
  
      if (input) {
        input.disabled = !enabled;
        input.placeholder = enabled ? '메시지를 입력하세요...' : '연결 중...';
      }
      if (sendBtn) {
        sendBtn.disabled = !enabled;
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
  
    // -----------------------------
    // 초기화
    // -----------------------------
    function init() {
      if (isRealtimeInitialized) {
        console.log('[Realtime] ⚠ init()가 이미 실행되어 두 번째 호출을 무시합니다.');
        return;
      }
      isRealtimeInitialized = true;
  
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            initRealtimeCoaching();
            setupMobilePanelToggle();
          }, 500);
        });
      } else {
        setTimeout(() => {
          initRealtimeCoaching();
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
  
    window.initRealtimeCoaching = initRealtimeCoaching;
  
    init();
  })();
  