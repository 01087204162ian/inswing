// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능
(function () {
  'use strict';

  let socket = null;
  let channel = null;
  let channelState = 'idle';
  let sessionId = null;

  // 질문형 코칭 관련 변수
  let questionInput = null;
  let questionBtn = null;
  let questionStatus = null;
  let questionAnswerBox = null;

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
      input.readOnly = !enabled;
      input.placeholder = enabled ? '메시지를 입력하세요...' : '연결 중...';
  
      // 💡 CSS나 다른 스크립트가 막고 있어도 강제로 열어준다
      input.style.pointerEvents = enabled ? 'auto' : 'none';
      input.style.opacity = enabled ? '1' : '0.5';
      input.style.cursor = enabled ? 'text' : 'not-allowed';
  
      console.log('[Realtime] 입력창 상태 변경', {
        enabled,
        disabled: input.disabled,
        readOnly: input.readOnly,
        pointerEvents: input.style.pointerEvents
      });
    }
  
    if (sendBtn) {
      sendBtn.disabled = !enabled;
  
      // 버튼도 강제 오픈/닫기
      sendBtn.style.pointerEvents = enabled ? 'auto' : 'none';
      sendBtn.style.opacity = enabled ? '1' : '0.5';
      sendBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  
      console.log('[Realtime] 전송 버튼 상태 변경', {
        enabled,
        disabled: sendBtn.disabled,
        pointerEvents: sendBtn.style.pointerEvents
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
    channel.on('event:new', (payload) => {
      console.log('[Realtime] 💬 event:new 수신:', payload);
      if (payload.type === 'chat_message') {
        appendMessage(
          payload.author_role || 'coach',
          payload.message || '',
          payload.meta?.ts || Date.now()
        );
        
        // 자신이 보낸 메시지면 입력창 비우기 (서버 응답이 없어도)
        const input = $('realtimeMessageInput');
        if (input && payload.author_role === 'golfer' && input.value.trim() === payload.message) {
          input.value = '';
        }
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
    console.log('[Realtime] sendMessage 호출:', { msg, channelState, hasChannel: !!channel, sessionId });
    
    if (!channel) {
      console.warn('[Realtime] 채널 객체 없음');
      return;
    }

    if (channelState !== 'joined') {
      console.warn('[Realtime] 채널 상태가 joined 아님:', channelState);
      return;
    }

    if (channel.state !== 'joined') {
      console.warn('[Realtime] 채널 실제 상태가 joined 아님:', channel.state);
      return;
    }

    if (!msg || !msg.trim()) {
      console.warn('[Realtime] 메시지가 비어있음');
      return;
    }

    if (!sessionId) {
      console.warn('[Realtime] sessionId 없음');
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

    console.log('[Realtime] ➡ event:new 전송:', JSON.stringify(payload));

    const pushRef = channel.push('event:new', payload);
    
    if (!pushRef) {
      console.error('[Realtime] channel.push() 실패 - pushRef가 null');
      return;
    }

    pushRef
      .receive('ok', (resp) => {
        console.log('[Realtime] ✅ 메시지 전송 성공:', resp);
        const input = $('realtimeMessageInput');
        if (input) input.value = '';
      })
      .receive('error', (err) => {
        console.error('[Realtime] ❌ 메시지 전송 오류:', err);
      })
      .receive('timeout', () => {
        // 타임아웃은 무시 (메시지는 이미 브로드캐스트되어 수신됨)
        console.log('[Realtime] ⏱ 메시지 전송 타임아웃 (무시 - 메시지는 이미 수신됨)');
        const input = $('realtimeMessageInput');
        if (input) input.value = '';
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

  // ===== 질문형 코칭 =====

  async function submitQuestion() {
    if (!questionInput || !questionBtn || !questionStatus || !questionAnswerBox) {
      console.warn('[Realtime] 질문 코칭 DOM 요소가 준비되지 않았습니다.');
      return;
    }

    const raw = questionInput.value || '';
    const question = raw.trim();

    if (!question) {
      questionStatus.textContent = '먼저 질문 내용을 입력해 주세요.';
      return;
    }

    if (!sessionId) {
      console.warn('[Realtime] sessionId 없음 – 질문 전송 불가');
      questionStatus.textContent = '스윙 정보가 없습니다. 다시 접속해 주세요.';
      return;
    }

    questionBtn.disabled = true;
    questionInput.readOnly = true;
    questionStatus.textContent = '답변 생성 중입니다...';
    questionAnswerBox.textContent = '';
    questionAnswerBox.style.opacity = '0.7';

    try {
      console.log('[Question] 질문 전송:', { sessionId, question });

      const resp = await apiFetch(`/swings/${sessionId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          target: 'ai',
          question: question
        })
      });

      if (!resp.ok) {
        console.error('[Question] 응답 오류:', resp.status, resp.statusText);
        questionStatus.textContent = '답변 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        questionBtn.disabled = false;
        questionInput.readOnly = false;
        return;
      }

      const data = await resp.json();
      console.log('[Question] 응답 데이터:', data);

      const answer =
        data.answer ||
        data.coaching ||
        data.message ||
        '답변은 생성되었으나 형식을 알 수 없습니다. 서버 로그를 확인해 주세요.';

      questionAnswerBox.textContent = answer;
      questionAnswerBox.style.opacity = '1';
      questionStatus.textContent = '코칭 답변이 생성되었습니다.';

      // (옵션) 실시간 코칭 패널에도 코치 메시지로 추가
      appendMessage('coach', answer, Date.now());
    } catch (e) {
      console.error('[Question] 예외 발생:', e);
      questionStatus.textContent = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
    } finally {
      questionBtn.disabled = false;
      questionInput.readOnly = false;
    }
  }

  function setupQuestionCoaching() {
    questionInput = document.getElementById('coachingQuestionInput');
    questionBtn = document.getElementById('coachingQuestionBtn');
    questionStatus = document.getElementById('coachingQuestionStatus');
    questionAnswerBox = document.getElementById('coachingAnswerBox');

    if (!questionInput || !questionBtn) {
      console.warn('[Question] 질문 코칭 UI 요소 없음 – 스킵');
      return;
    }

    // 버튼 초기 상태 확인 및 활성화
    if (questionBtn.disabled) {
      console.log('[Question] 버튼이 비활성화 상태였습니다. 활성화합니다.');
      questionBtn.disabled = false;
    }

    // 입력창 초기 상태 확인 및 활성화
    if (questionInput.readOnly) {
      console.log('[Question] 입력창이 읽기 전용 상태였습니다. 활성화합니다.');
      questionInput.readOnly = false;
    }

    // 버튼 클릭
    questionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Question] 버튼 클릭 이벤트 발생');
      submitQuestion();
    });

    // Enter로도 전송 (Shift+Enter는 줄바꿈)
    questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        console.log('[Question] Enter 키 입력');
        submitQuestion();
      }
    });

    console.log('[Question] 질문형 코칭 UI 초기화 완료', {
      button: questionBtn ? 'found' : 'not found',
      input: questionInput ? 'found' : 'not found',
      buttonDisabled: questionBtn?.disabled,
      inputReadOnly: questionInput?.readOnly
    });
  }

  // ===== 모바일 패널 토글 =====
  
  function setupMobileToggle() {
    const header = $('realtimeHeader');
    const wrapper = document.querySelector('.realtime-coaching-wrapper');
    
    if (!header || !wrapper) {
      console.warn('[Realtime] 모바일 토글 설정 실패: 요소 없음');
      return;
    }

    // 모바일에서만 클릭 이벤트 추가
    function handleToggle(e) {
      // 입력창이나 전송 버튼, 메시지 리스트 클릭 시에는 토글하지 않음
      if (e.target.closest('.realtime-input-area') || 
          e.target.closest('.realtime-message-list') ||
          e.target.closest('.realtime-send-btn') ||
          e.target.closest('#realtimeMessageInput')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      wrapper.classList.toggle('expanded');
      console.log('[Realtime] 모바일 패널 토글:', wrapper.classList.contains('expanded') ? '열림' : '닫힘');
    }
    
    // 클릭과 터치 이벤트 모두 추가
    header.addEventListener('click', handleToggle);
    header.addEventListener('touchend', (e) => {
      handleToggle(e);
    }, { passive: false });
    
    console.log('[Realtime] 모바일 토글 이벤트 설정 완료');
  }

  // ===== 초기화 =====

  function init() {
    sessionId = getSwingId();
    if (!sessionId) {
      console.warn('[Realtime] swingId 없음');
      return;
    }

    console.log('[Realtime] 초기화 시작, sessionId:', sessionId);

    const input = $('realtimeMessageInput');
    const sendBtn = $('realtimeSendBtn');

    if (sendBtn) {
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[Realtime] 전송 버튼 클릭');
        if (!input) {
          console.warn('[Realtime] 입력창 요소 없음');
          return;
        }
        const msg = input.value;
        console.log('[Realtime] 입력값:', msg);
        if (msg) {
          sendMessage(msg);
        } else {
          console.warn('[Realtime] 메시지가 비어있음');
        }
      });
    } else {
      console.warn('[Realtime] 전송 버튼 요소 없음');
    }

    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          console.log('[Realtime] Enter 키 입력');
          const msg = input.value;
          if (msg) {
            sendMessage(msg);
          }
        }
      });
    } else {
      console.warn('[Realtime] 입력창 요소 없음');
    }

    // 모바일 패널 토글 설정
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          setupMobileToggle();
          initRealtime(sessionId);
          setupQuestionCoaching();
        }, 500);
      });
    } else {
      setTimeout(() => {
        setupMobileToggle();
        initRealtime(sessionId);
        setupQuestionCoaching();
      }, 500);
    }
  }

  init();
})();
