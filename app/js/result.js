// INSWING 실시간 코칭 WebSocket 연결 및 채팅 기능
(function() {
    'use strict';

    let socket = null;
    let channel = null;
    let isJoined = false;
    let messageRef = 0;

    // DOM 요소 참조
    const $ = id => document.getElementById(id);

    // swingId 가져오기
    function getSwingId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // WebSocket 연결 초기화
    function initRealtimeCoaching() {
        const swingId = getSwingId();
        if (!swingId) {
            console.warn('[Realtime] swingId가 없어 실시간 코칭을 시작할 수 없습니다.');
            return;
        }

        // Phoenix Socket이 로드되지 않았으면 대기
        if (typeof Phoenix === 'undefined') {
            console.warn('[Realtime] Phoenix Socket 라이브러리가 로드되지 않았습니다.');
            return;
        }

        const socketUrl = 'wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0';
        console.log('[Realtime] WebSocket 연결 시도:', socketUrl);

        socket = new Phoenix.Socket(socketUrl, {
            reconnectAfterMs: () => 1000
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
        });

        socket.connect();
    }

    // 채널 join
    function joinChannel(swingId) {
        if (!socket || socket.connectionState() !== 'open') {
            console.warn('[Realtime] 소켓이 연결되지 않아 채널에 join할 수 없습니다.');
            return;
        }

        if (channel) {
            channel.leave();
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
                setTimeout(() => {
                    enableChatInput(true);
                }, 200);
            })
            .receive('error', (err) => {
                console.error('[Realtime] ❌ JOIN ERROR:', err);
                updateConnectionStatus('error');
            })
            .receive('timeout', () => {
                console.warn('[Realtime] ⏱️ JOIN TIMEOUT');
                updateConnectionStatus('timeout');
            });

        // event:new 메시지 수신
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

    // 수신 메시지 처리
    function handleIncomingMessage(payload) {
        // chat_message 타입만 표시
        if (payload.type !== 'chat_message') {
            return;
        }

        const messageList = $('realtimeMessageList');
        if (!messageList) return;

        const messageEl = createMessageElement(payload);
        messageList.appendChild(messageEl);
        
        // 스크롤을 맨 아래로
        messageList.scrollTop = messageList.scrollHeight;
    }

    // 메시지 요소 생성
    function createMessageElement(payload) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'realtime-message';

        const authorRole = payload.author_role || 'golfer';
        const isGolfer = authorRole === 'golfer';

        // golfer는 오른쪽 정렬, 파란색
        // coach는 왼쪽 정렬, 회색
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
        const ts = payload.meta?.ts || Date.now();
        const date = new Date(ts);
        messageTime.textContent = date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.appendChild(messageText);
        messageDiv.appendChild(messageTime);

        return messageDiv;
    }

    // 메시지 전송
    function sendMessage() {
        const swingId = getSwingId();
        if (!swingId) {
            console.warn('[Realtime] swingId가 없어 메시지를 전송할 수 없습니다.');
            return;
        }

        if (!channel || !isJoined || channel.state !== 'joined') {
            console.warn('[Realtime] 채널이 아직 joined 상태가 아닙니다.');
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
            message: message,
            meta: {
                ts: Date.now()
            }
        };

        const event = {
            topic: `session:${swingId}`,
            event: 'event:new',
            payload: payload,
            ref: String(messageRef)
        };

        console.log('[Realtime] ➡️ event:new 전송:', event);

        channel
            .push('event:new', payload)
            .receive('ok', (resp) => {
                console.log('[Realtime] ✅ event:new 응답:', resp);
                // 입력창 비우기
                input.value = '';
            })
            .receive('error', (err) => {
                console.error('[Realtime] ❌ event:new 오류:', err);
            });

        // 메시지 렌더링은 event:new 수신 시에만 실행됨 (중복 방지)
    }

    // 연결 상태 업데이트
    function updateConnectionStatus(status) {
        const statusEl = $('realtimeStatus');
        if (!statusEl) return;

        const statusText = {
            'connected': '연결됨',
            'joined': '연결됨',
            'disconnected': '연결 끊김',
            'error': '연결 오류',
            'timeout': '연결 시간 초과'
        };

        statusEl.textContent = statusText[status] || '연결 중...';
        statusEl.className = `realtime-status status-${status}`;
    }

    // 채팅 입력 활성화/비활성화
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

    // 모바일 패널 확장/축소
    function setupMobilePanelToggle() {
        const header = $('realtimeHeader');
        const wrapper = document.querySelector('.realtime-coaching-wrapper');
        
        if (!header || !wrapper) return;

        // 모바일에서만 헤더 클릭 시 확장/축소
        if (window.innerWidth <= 768) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                wrapper.classList.toggle('expanded');
            });
        }
    }

    // 초기화
    function init() {
        // DOM이 로드된 후 실행
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

        // 전송 버튼 이벤트
        const sendBtn = $('realtimeSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        // Enter 키로 전송
        const input = $('realtimeMessageInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        // 윈도우 리사이즈 시 모바일 패널 토글 재설정
        window.addEventListener('resize', setupMobilePanelToggle);
    }

    // 전역으로 초기화 함수 노출 (필요시)
    window.initRealtimeCoaching = initRealtimeCoaching;

    // 자동 초기화
    init();
})();

