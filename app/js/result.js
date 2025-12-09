// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능 (event:new 안정 버전)
(function () {
    'use strict';
  
    let socket = null;
    let channel = null;
    let isJoined = false;
    let isJoining = false;
    let messageRef = 0;
    let initialized = false; // 🔥 중복 init 방지
  
    const $ = (id) => document.getElementById(id);
  
    function getSwingId() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('id');
    }
  
    // =========================
    // WebSocket + 채널 초기화
    // =========================
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
  
      // 이미 연결되어 있으면 재사용
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
        enableChatInput(false);
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
  
    // =========================
    // 채널 join (event:new 프로토콜 기준)
    // =========================
    function joinChannel(swingId) {
      if (!socket || socket.connectionState() !== 'open') {
        console.warn('[Realtime] 소켓이 연결되지 않아 채널에 join할 수 없습니다.');
        return;
      }

      // 이미 join 중이거나 이미 joined 상태면 중복 join 방지
      if (isJoining) {
        console.warn('[Realtime] 이미 join 중입니다. 중복 join 방지.');
        return;
      }

      if (channel && channel.state === 'joined') {
        console.warn('[Realtime] 이미 joined 상태입니다. 중복 join 방지.');
        return;
      }
  
      // 이전 채널 정리 (중복 메시지 방지의 핵심)
      if (channel) {
        try {
          channel.leave();
        } catch (e) {
          console.warn('[Realtime] 이전 채널 leave 중 오류:', e);
        }
        channel = null;
        isJoined = false;
      }

      isJoining = true;
      isJoined = false;
  
      const topic = `session:${swingId}`;
      console.log('[Realtime] 채널 join 시도:', topic);
  
      channel = socket.channel(topic, {
        rejoinAfterMs: () => false // 자동 재연결 비활성화
      });
  
      channel
        .join()
        .receive('ok', (resp) => {
          console.log('[Realtime] ✅ JOIN OK:', resp, 'state:', channel.state);
          isJoining = false;
          isJoined = true;
          updateConnectionStatus('joined');
          setTimeout(() => enableChatInput(true), 100);
          
          // 기존 메시지가 있으면 렌더링 (문서 요구사항: 모든 타입 표시)
          if (resp.messages && Array.isArray(resp.messages)) {
            console.log('[Realtime] 기존 메시지 로드:', resp.messages.length, '개');
            resp.messages.forEach(msg => {
              handleIncomingMessage(msg);
            });
          }
        })
        .receive('error', (err) => {
          console.error('[Realtime] ❌ JOIN ERROR:', err, 'state:', channel.state);
          isJoining = false;
          isJoined = false;
          updateConnectionStatus('error');
          enableChatInput(false);
        })
        .receive('timeout', () => {
          console.warn('[Realtime] ⏱️ JOIN TIMEOUT', 'state:', channel.state);
          isJoining = false;
          isJoined = false;
          updateConnectionStatus('timeout');
          enableChatInput(false);
        });
  
      // 🔥 서버에서 브로드캐스트하는 event:new 수신
      channel.on('event:new', (payload) => {
        console.log('[Realtime] 💬 event:new 수신:', payload);
        handleIncomingMessage(payload);
      });

      // presence:state 이벤트 수신
      channel.on('presence:state', (presence) => {
        console.log('[Realtime] 👥 presence:state 수신:', presence);
        // 향후 UI에 접속자 목록 표시 가능
      });

      // presence:diff 이벤트 수신
      channel.on('presence:diff', (diff) => {
        console.log('[Realtime] 👥 presence:diff 수신:', diff);
        // 향후 UI에 접속자 변화 표시 가능
      });

      // typing 이벤트 수신
      channel.on('typing', (payload) => {
        const { author_role } = payload;
        if (author_role !== 'golfer') { // 자신의 타이핑은 표시하지 않음
          showTypingIndicator(author_role);
          // 3초 후 자동으로 숨김
          setTimeout(hideTypingIndicator, 3000);
        }
      });

      // typing_stop 이벤트 수신
      channel.on('typing_stop', () => {
        hideTypingIndicator();
      });
  
      // 굳이 onError로 state를 건드리지 않습니다.
      // 채널이 완전히 끊어지면 onClose / socket.onClose에서 다시 처리.
      channel.onClose(() => {
        console.log('[Realtime] ℹ️ 채널 종료됨');
        isJoining = false;
        isJoined = false;
        enableChatInput(false);
        updateConnectionStatus('disconnected');
      });
    }
  
    // =========================
    // 수신 메시지 처리
    // =========================
    function handleIncomingMessage(payload) {
      // chat_message, image, audio 타입 메시지 표시
      const allowedTypes = ['chat_message', 'image', 'audio'];
      if (!allowedTypes.includes(payload.type)) {
        return;
      }
      // renderMessage 함수 사용 (지시서 요구사항)
      renderMessage(payload);
    }
  
    // 프로필 아이콘 텍스트 생성
    function getProfileIconText(role, authorId) {
      if (role === 'golfer') {
        return '나';
      } else if (role === 'coach') {
        return '코치';
      } else if (role === 'ai') {
        return 'AI';
      } else if (role === 'system') {
        return '';
      }
      return '?';
    }

    // 메시지 렌더링 함수 (카카오톡 스타일 + 프로필 아이콘 + 미디어 지원)
    function renderMessage(payload) {
      const { author_role, message, meta, author_id, type, media_url, media_type } = payload;
      const msgType = type || 'chat_message';
      
      // 문서 요구사항: AI 메시지와 시스템 메시지 처리
      let role = 'coach';
      if (author_role === 'golfer') {
        role = 'golfer';
      } else if (author_role === 'ai') {
        role = 'ai';
      } else if (msgType === 'system_notice') {
        role = 'system';
      }
      
      const time = new Date(meta?.ts || Date.now()).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const profileIconText = getProfileIconText(role, author_id);

      const div = document.createElement('div');
      div.className = `chat-message ${role}`;
      
      // 시스템 메시지는 중앙 정렬, 회색 스타일
      if (role === 'system') {
        div.style.textAlign = 'center';
        div.style.color = '#94a3b8';
        div.style.fontSize = '0.875rem';
        div.style.margin = '0.5rem 0';
        div.innerHTML = `<div class="system-notice">${message || ''}</div>`;
      } else {
        // 미디어 메시지 처리
        let contentHtml = '';
        if (msgType === 'image' && media_url) {
          contentHtml = `<img src="${media_url}" alt="이미지" class="media-content" style="max-width: 200px; border-radius: 8px; cursor: pointer;" onclick="window.open('${media_url}', '_blank')">`;
        } else if (msgType === 'audio' && media_url) {
          contentHtml = `<audio controls class="media-content" style="max-width: 250px;"><source src="${media_url}" type="${media_type || 'audio/mpeg'}"></audio>`;
        } else {
          // AI 메시지는 별도 스타일, Insight 배지
          if (role === 'ai') {
            contentHtml = `<div class="bubble ai-insight">
              <span class="insight-badge">💡 Insight</span>
              <div class="ai-message">${message || ''}</div>
            </div>`;
          } else {
            // 일반 텍스트 메시지
            contentHtml = `<div class="bubble">${message || ''}</div>`;
          }
        }

        div.innerHTML = `
          <div class="profile-icon">${profileIconText}</div>
          <div style="display: flex; flex-direction: column;">
            ${contentHtml}
            <div class="meta">${time}</div>
          </div>
        `;
      }

      const messageList = $('realtimeMessageList');
      if (messageList) {
        messageList.appendChild(div);
        messageList.scrollTop = messageList.scrollHeight;
      }
    }

    // 타이핑 인디케이터 표시/숨김
    function showTypingIndicator(role) {
      const messageList = $('realtimeMessageList');
      if (!messageList) return;

      // 기존 타이핑 인디케이터 제거
      const existing = messageList.querySelector('.typing-indicator');
      if (existing) existing.remove();

      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = `
        <span>${role === 'coach' ? '코치' : '골퍼'}가 입력 중입니다</span>
        <div class="dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      `;
      messageList.appendChild(indicator);
      messageList.scrollTop = messageList.scrollHeight;
    }

    function hideTypingIndicator() {
      const messageList = $('realtimeMessageList');
      if (!messageList) return;
      const indicator = messageList.querySelector('.typing-indicator');
      if (indicator) indicator.remove();
    }
  
    // =========================
    // 메시지 전송 (event:new)
    // =========================
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
  
      // isJoined 플래그와 실제 채널 상태 모두 확인
      if (!isJoined || !channel || channel.state !== 'joined') {
        console.warn('[Realtime] 채널이 아직 joined 상태가 아닙니다.', {
          isJoined,
          channelState: channel?.state
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
  
    // =========================
    // UI 보조 함수들
    // =========================
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
  
    // typing 이벤트 관리
    let typingTimeout = null;
    let lastTypingTime = 0;
    
    function handleTyping() {
      if (!channel || !isJoined) return;
      
      const now = Date.now();
      // 1초마다 한 번만 typing 이벤트 전송
      if (now - lastTypingTime < 1000) return;
      lastTypingTime = now;
      
      channel.push('typing', {
        author_role: 'golfer',
        session_id: getSwingId()
      });
      
      // 3초 후 자동으로 typing_stop 전송
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        if (channel && isJoined) {
          channel.push('typing_stop', {
            author_role: 'golfer'
          });
        }
      }, 3000);
    }
    
    function handleTypingStop(e) {
      // Enter 키를 누르면 typing_stop 전송
      if (e.key === 'Enter' && !e.shiftKey) {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (channel && isJoined) {
          channel.push('typing_stop', {
            author_role: 'golfer'
          });
        }
      }
    }

    function enableChatInput(enabled) {
      const input = $('realtimeMessageInput');
      const sendBtn = $('realtimeSendBtn');
  
      if (input) {
        input.disabled = !enabled;
        input.placeholder = enabled ? '메시지를 입력하세요...' : '연결 중...';
        
        // typing 이벤트 리스너 등록/제거
        input.removeEventListener('input', handleTyping);
        input.removeEventListener('keydown', handleTypingStop);
        
        if (enabled) {
          input.addEventListener('input', handleTyping);
          input.addEventListener('keydown', handleTypingStop);
        }
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
  
    // =========================
    // 초기화
    // =========================
    function init() {
      if (initialized) {
        console.log('[Realtime] ⚠ init()가 이미 실행되어 두 번째 호출을 무시합니다.');
        return;
      }
      initialized = true;
  
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
  