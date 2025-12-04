(웹소켓 이벤트 → Phoenix 채널 구조 → 프론트 구독 → 실시간 코치 모드 기능 흐름 순서로 갈게요.)

0. 전체 그림 (아키텍처 개념도)

텍스트로 구조를 그리면 대략 이렇게 됩니다:

[브라우저: 학생]                     [브라우저: 코치]
      │                                       │
      ├─── WebSocket 연결 (wss://realtime.inswing.ai/socket/websocket)
      │                 │
      │             [Phoenix Socket & Channels]
      │                 │
      └─────> topic: "session:{session_id}" <──────┘
                      │
             (broadcast / push 이벤트)
                      │
           [Node INSwing API / AI 서버]
                 │             ▲
                 └─(HTTP/REST)─┘


웹소켓 서버: inswing_realtime (Phoenix)

API/AI 서버: 기존 inswing-api (Node/Express)

주제(topic): session:{session_id} 채널 하나에

학생, 코치, AI 코멘트, 시스템 메시지 전부 모이게 설계

1. WebSocket 이벤트 설계 방법
1-1. 기본 원칙

이벤트 이름 규칙

domain:action 형태로 단순하게

예: chat:new, session:state, ai:feedback, swing:update

payload 구조 통일

항상 type, session_id, sender, data, meta 정도의 공통 구조 유지

방향 명확히

클라이언트 → 서버 전송용 이벤트

서버 → 클라이언트 broadcast 전용 이벤트 구분

1-2. 이벤트 목록 (1차 버전)
(1) 채팅 관련
방향	이벤트 이름	설명
C → S	chat:new	텍스트 채팅 전송 (학생/코치)
S → 모든 클라	chat:added	새로운 채팅 메시지 브로드캐스트

예시 payload (C → S)

{
  "session_id": "sess_123",
  "sender": {
    "id": "user_1",
    "role": "student"
  },
  "message": "드라이버 헤드가 자꾸 열려요.",
  "meta": {
    "ts": 1733395200000
  }
}

(2) 세션 상태(실시간 코치 모드 전체 상태)
방향	이벤트 이름	설명
C → S(코치)	session:control	세션 상태 변경 요청 (시작/일시중지/종료 등)
S → 모든 클라	session:state	현재 세션 상태 브로드캐스트

예: session:state payload

{
  "session_id": "sess_123",
  "status": "active",         // waiting / active / paused / ended
  "current_step": "analysis", // upload / analysis / feedback
  "coach": { "id": "coach_1", "name": "IanPro" },
  "student": { "id": "user_1", "name": "Ian" },
  "updated_at": 1733395200000
}

(3) 스윙/분석 상태 업데이트
방향	이벤트 이름	설명
Node → Phoenix	swing:update	AI 분석 진행 상태(진행률, 단계)
S → 모든 클라	swing:progress	학생/코치 화면에 진행상태 표시
Node → Phoenix	ai:feedback	AI 분석 결과 도착
S → 모든 클라	ai:feedback	실시간 피드백 카드 표시

ai:feedback 예:

{
  "session_id": "sess_123",
  "swing_id": "sw_999",
  "summary": "임팩트 순간 헤드가 열린 경향이 있습니다.",
  "metrics": {
    "face_angle": 5.2,
    "tempo_score": 78
  },
  "recommendations": [
    "어드레스 시 그립을 약간 스트롱하게 잡아보세요.",
    "백스윙 톱에서 왼손목을 조금 덜 꺾는 느낌으로."
  ],
  "level": "intermediate"
}

(4) Presence / 접속자 상태
방향	이벤트 이름	설명
S → 모든 클라	presence:state	현재 접속자 목록 전체
S → 모든 클라	presence:diff	새로 접속/퇴장 등 변화

(Phoenix Presence 기본 구조 활용 – 아래 2번에서 설명)

2. Phoenix 채널 구조(구조도 & 코드 개념)
2-1. 채널 토픽 설계

소켓 endpoint: /socket

채널 모듈: INSwingRealtimeWeb.CoachSessionChannel

토픽 규칙: "session:" <> session_id

예:

학생 A, 코치 B가 session_abc123에서 대화

둘 다 topic: "session:abc123"에 join

2-2. 소켓 & 채널 예시 코드 (개념)

1) socket 라우팅 (socket.ex)

defmodule INSwingRealtimeWeb.UserSocket do
  use Phoenix.Socket

  channel "session:*", INSwingRealtimeWeb.CoachSessionChannel

  def connect(%{"token" => token}, socket, _connect_info) do
    # TODO: token 검증 (Node API에서 발급한 JWT 등)
    case verify_token(token) do
      {:ok, user} ->
        {:ok, assign(socket, :current_user, user)}
      _ ->
        :error
    end
  end

  def id(socket), do: "user_socket:#{socket.assigns.current_user.id}"
end


2) 채널 모듈 (CoachSessionChannel)

defmodule INSwingRealtimeWeb.CoachSessionChannel do
  use Phoenix.Channel
  alias INSwingRealtimeWeb.Presence

  # join: 클라이언트가 "session:123" 토픽으로 들어올 때
  def join("session:" <> session_id, _params, socket) do
    socket = assign(socket, :session_id, session_id)

    send(self(), :after_join)
    {:ok, %{message: "joined", session_id: session_id}, socket}
  end

  # Presence 등록
  def handle_info(:after_join, socket) do
    user = socket.assigns.current_user

    Presence.track(socket, user.id, %{
      name: user.name,
      role: user.role,
      online_at: System.system_time(:millisecond)
    })

    push(socket, "presence:state", Presence.list(socket))
    {:noreply, socket}
  end

  # 채팅 수신 (C→S)
  def handle_in("chat:new", payload, socket) do
    broadcast!(socket, "chat:added", payload)
    {:noreply, socket}
  end

  # 세션 상태 변경 (코치만 허용)
  def handle_in("session:control", %{"status" => status} = payload, socket) do
    # TODO: 역할 체크 (코치인지 확인)
    broadcast!(socket, "session:state", payload)
    {:noreply, socket}
  end
end


Node API에서 이벤트를 쏘려면 Endpoint.broadcast/3 사용

예: INSwingRealtimeWeb.Endpoint.broadcast("session:abc123", "ai:feedback", payload)

3. 프론트에서 메시지/이벤트 구독 설계

Ian이 어제 사용한 것처럼 생 WebSocket도 되지만,
Phoenix 채널은 공식 JS 클라이언트를 쓰는 게 훨씬 편합니다.

3-1. 기본 연결 코드 (브라우저 JS)
<script src="https://unpkg.com/phoenix@1.7.0/priv/static/phoenix.js"></script>
<script>
  const socket = new Phoenix.Socket("wss://realtime.inswing.ai/socket", {
    params: {
      token: "JWT_OR_SESSION_TOKEN" // 로그인 후 발급받은 토큰
    }
  });

  socket.connect();

  const sessionId = "sess_123"; // 서버에서 전달받은 세션 ID
  const channel = socket.channel(`session:${sessionId}`, {});

  channel.join()
    .receive("ok", resp => console.log("joined session", resp))
    .receive("error", resp => console.error("join error", resp));
</script>

3-2. 이벤트 핸들러 구조 설계

프론트 쪽에서는 channel.on(event, handler)로 구독합니다.

// 1) 채팅
channel.on("chat:added", (msg) => {
  // 채팅 리스트 UI에 추가
  addChatMessage(msg);
});

// 2) 세션 상태
channel.on("session:state", (state) => {
  updateSessionStatusUI(state);
});

// 3) 스윙 분석 진행 상태
channel.on("swing:progress", (progress) => {
  updateProgressBar(progress.percent);
});

// 4) AI 피드백 도착
channel.on("ai:feedback", (feedback) => {
  renderAIFeedbackCard(feedback);
});

// 5) Presence (접속자)
channel.on("presence:state", (presence) => {
  renderPresenceList(presence);
});

3-3. 클라이언트 → 서버 이벤트 전송 패턴

예: 학생이 채팅 입력 후 전송 버튼을 눌렀을 때

function sendChat(message) {
  const payload = {
    session_id: sessionId,
    sender: {
      id: currentUser.id,
      role: currentUser.role
    },
    message,
    meta: { ts: Date.now() }
  };

  channel.push("chat:new", payload)
    .receive("ok", () => console.log("chat sent"))
    .receive("error", (err) => console.error("chat send error", err));
}

4. 실시간 코치 모드 기능 설계 (MVP 버전 플로우)

이제 이 모든 걸 **“기능 흐름”**으로 묶어볼게요.

4-1. 시나리오 (학생 기준)

학생이 INSWING에서 스윙 업로드 + 분석 요청

Node API가 스윙 분석 Job 생성 → session_id 발급

학생이 “실시간 코치 모드 시작” 클릭

프론트에서 session_id를 쿼리스트링 혹은 상태로 가지고 realtime.inswing.ai에 접속

WebSocket 연결 후 session:{session_id} join

Phoenix Presence에 학생 등록 → 코치는 아직 대기 상태

4-2. 시나리오 (코치 기준)

코치용 대시보드에서 “대기 중인 세션 리스트” 조회

Node API에서 status=waiting 세션 검색

특정 세션 선택 → 실시간 코치 입장 클릭

코치 브라우저에서도 같은 session:{session_id} join

Presence에 코치가 추가되면서

학생 화면: “코치가 입장했습니다.”

코치 화면: “학생과 연결되었습니다.”

이 알림도 WebSocket 이벤트로:

{
  "type": "system",
  "text": "코치가 세션에 입장했습니다.",
  "level": "info"
}


이걸 system:notice 같은 이벤트로 보내도 좋습니다.

4-3. 실제 코칭 중 발생하는 주요 이벤트

AI 분석 결과 도착

Node → Phoenix: ai:feedback 브로드캐스트

학생/코치 화면에 같은 카드가 동시에 뜨도록

코치의 코멘트

코치: “이 부분은 이렇게 고치세요” → chat:new

학생: 실시간으로 채팅 리스트에서 확인

세션 상태 변경

코치가 “오늘 레슨 종료” → session:control (status="ended")

모든 클라이언트: session:state 갱신, 버튼 비활성화

실시간 Checkpoint 저장 (선택 기능, 추후)

코치가 해당 피드백 상태를 “즐겨찾기/저장”

Node API로 HTTP 요청 보내서 DB에 기록

4-4. 1차 버전에서 꼭 필요한 것만 뽑으면

실시간 코치 모드 v1 기능 목록

session:{session_id} 채널로 학생/코치 동시 접속

Presence 기반 “누가 접속 중인지” 표시

텍스트 채팅 (chat:new / chat:added)

세션 상태 표시 (session:state) – 최소: waiting / active / ended

AI 분석 결과를 실시간 공유 (ai:feedback)