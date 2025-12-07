# INSWING 프로젝트 통합 문서

> **작성일**: 2025년 1월  
> **최종 수정**: 2025년 1월  
> **목적**: INSWING 프로젝트의 전체 구조, 아키텍처, 개발 가이드를 하나의 문서로 통합

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [서비스별 상세 가이드](#서비스별-상세-가이드)
4. [실시간 코칭 시스템](#실시간-코칭-시스템)
5. [개발 가이드](#개발-가이드)
6. [운영 및 배포](#운영-및-배포)
7. [참고 자료](#참고-자료)

---

## 프로젝트 개요

INSWING은 골프 스윙 분석 및 실시간 코칭 플랫폼입니다. 4개의 독립적인 리포지토리로 구성된 모듈형 서비스입니다.

### 프로젝트 구조

```
ian/
├── inswing/          # 프론트엔드 (HTML/JS)
├── inswing-api/      # 백엔드 API (Node.js/Express)
├── inswing-ai/       # AI 분석 서버 (Python/Flask)
└── inswing-realtime/ # 실시간 서비스 (Elixir/Phoenix)
```

### 핵심 역할

- **inswing** = 화면 (고객이 보는 곳)
- **inswing-api** = 모든 비즈니스/데이터 처리의 중심
- **inswing-ai** = 비디오 → 숫자로 바꿔주는 분석 엔진
- **inswing-realtime** = 실시간 코치/채팅/Presence 담당

---

## 전체 아키텍처

### 기술 스택 요약

| 서비스 | 기술 스택 | 포트 | 주요 역할 |
|--------|----------|------|----------|
| inswing | HTML/JavaScript | - | 프론트엔드 UI |
| inswing-api | Node.js + Express | 4000 | REST API, 비즈니스 로직 |
| inswing-ai | Python + Flask | 5000 | MediaPipe 스윙 분석 |
| inswing-realtime | Elixir + Phoenix | 4100 | WebSocket 실시간 통신 |

### 데이터 흐름

```
1. 사용자 → inswing-api (POST /swings)
   ↓
2. inswing-api → inswing-ai (POST /analyze)
   ↓
3. inswing-ai → MediaPipe 분석 → 15개 메트릭 반환
   ↓
4. inswing-api → AWS S3 업로드
   ↓
5. inswing-api → Claude AI 코칭 생성
   ↓
6. MySQL에 스윙 + 메트릭 + 코칭 저장
   ↓
7. inswing-realtime → WebSocket 브로드캐스트 (실시간 코칭)
   ↓
8. 사용자에게 결과 반환
```

### 인프라 구성

- **서버**: AWS EC2
- **웹 서버**: Nginx + SSL
- **프로세스 관리**: PM2
- **도메인**:
  - `inswing.ai` → 랜딩/프론트 (S3+CloudFront)
  - `api.inswing.ai` → Node API (포트 4000)
  - `realtime.inswing.ai` → Phoenix Realtime (내부 4100)

---

## 서비스별 상세 가이드

### 1️⃣ inswing-api (백엔드 API 서버)

#### 기술 스택
- **Node.js + Express** (포트 4000)
- **MySQL** (데이터베이스)
- **AWS S3 + CloudFront** (비디오 저장)
- **JWT 인증** + **Passport** (Google/Kakao OAuth)
- **Claude AI** (Anthropic SDK) - 코칭 생성

#### 폴더 구조
```
inswing-api/
├── server.js              # 메인 서버 진입점
├── db.js                  # MySQL 연결 풀
├── config/
│   ├── cors.js           # CORS 설정
│   ├── passport.js       # OAuth 전략
│   └── s3.js             # AWS S3 클라이언트
├── middlewares/
│   ├── auth.js           # JWT 인증 미들웨어
│   └── errorHandler.js   # 에러 핸들링
├── routes/
│   ├── auth.js           # 로그인/OAuth
│   ├── swings.js         # 스윙 업로드/조회
│   ├── feelings.js       # 스윙 느낌 저장
│   └── routine.js        # 루틴 세션 관리
└── services/
    ├── aiCoachingService.js  # Claude AI 코칭 생성
    └── commentService.js     # 규칙 기반 코멘트
```

#### 주요 API 엔드포인트
- `POST /auth/login` - 이메일 로그인
- `GET /auth/google`, `GET /auth/kakao` - OAuth 로그인
- `POST /swings` - 스윙 업로드 + AI 분석 + 코칭 생성
- `GET /swings` - 스윙 히스토리 조회
- `GET /swings/:id` - 스윙 단건 조회
- `POST /swings/:id/regenerate-coaching` - 코칭 재생성
- `GET /routine/today` - 오늘의 루틴
- `POST /routine/start`, `POST /routine/end` - 루틴 세션 관리

#### 환경 변수
- `JWT_SECRET` - JWT 토큰 시크릿
- `SESSION_SECRET` - 세션 시크릿
- `ANTHROPIC_API_KEY` - Claude AI API 키
- `USE_AI_COACHING` - AI 코칭 사용 여부 (true/false)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - S3 접근
- `AWS_REGION`, `AWS_S3_BUCKET`, `CLOUDFRONT_DOMAIN` - S3/CloudFront 설정
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` - Google OAuth
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL` - Kakao OAuth

---

### 2️⃣ inswing-ai (AI 분석 서버)

#### 기술 스택
- **Python + Flask** (포트 5000)
- **MediaPipe** (포즈 추정)
- **OpenCV** (비디오 처리)
- **NumPy** (수치 계산)

#### 폴더 구조
```
inswing-ai/
├── app.py              # Flask 서버
├── analyze_swing.py    # MediaPipe 분석 로직
├── requirements.txt    # Python 의존성
└── ecosystem.config.js # PM2 설정
```

#### 분석 메트릭 (15개)

**v1 기본 메트릭 (4개)**
1. **backswing_angle** - 백스윙 각도
2. **impact_speed** - 임팩트 속도
3. **follow_through_angle** - 팔로우스루 각도
4. **balance_score** - 밸런스 점수

**v2 확장 메트릭 (11개)**
5. **tempo_ratio** - 템포 비율
6. **backswing_time_sec** - 백스윙 시간
7. **downswing_time_sec** - 다운스윙 시간
8. **head_movement_pct** - 머리 흔들림
9. **shoulder_rotation_range** - 어깨 회전 범위
10. **hip_rotation_range** - 골반 회전 범위
11. **rotation_efficiency** - 회전 효율
12. **overall_score** - 종합 점수 (0~100)

#### API 엔드포인트
- `POST /analyze` - 비디오 분석 요청

#### 스윙 검증 필터링 설정

**기본값**: 필터링 비활성화 (모든 영상 허용)

```bash
# 필터링 활성화
export ENABLE_SWING_FILTER=true
export MIN_BACKSWING_ANGLE=10.0
export MIN_SHOULDER_ROT=3.0
export MIN_HIP_ROT=1.0
export MIN_SHOULDER_SPAN=0.01

# 포즈 감지 엄격 모드
export STRICT_POSE_DETECTION=true
```

---

### 3️⃣ inswing (프론트엔드)

#### 기술 스택
- 순수 **HTML/JavaScript** (빌드 도구 없음)
- 반응형 디자인

#### 폴더 구조
```
inswing/
├── index.html          # 랜딩 페이지
├── ko/                 # 한국어 페이지
├── en/                 # 영어 페이지
└── app/
    ├── login.html      # 로그인
    ├── upload.html     # 스윙 업로드
    ├── result.html     # 분석 결과 (실시간 코칭 포함)
    ├── history.html    # 히스토리
    ├── routine.html    # 루틴 페이지
    └── js/
        ├── app.js      # 공통 API 유틸리티
        └── result.js   # 실시간 코칭 WebSocket
```

#### 주요 기능
- OAuth 로그인 (Google/Kakao)
- 비디오 업로드 및 분석 결과 표시
- 스윙 히스토리 조회
- 실시간 코칭 (WebSocket)
- 루틴 페이지 (최근 14일 분석)

---

### 4️⃣ inswing-realtime (실시간 서비스)

#### 기술 스택
- **Elixir + Phoenix**
- **Phoenix Channels** (WebSocket 실시간 통신)
- **Ecto** (데이터베이스)

#### 폴더 구조
```
inswing-realtime/
├── mix.exs             # 프로젝트 설정
├── config/             # 환경별 설정
├── lib/
│   ├── inswing_realtime/
│   │   ├── chat.ex     # 채팅 컨텍스트
│   │   └── chat/
│   │       └── chat_message.ex  # 메시지 스키마
│   └── inswing_realtime_web/
│       ├── router.ex   # 라우팅
│       ├── user_socket.ex  # WebSocket
│       └── channels/
│           ├── session_channel.ex      # 일반 세션 채널
│           └── coach_session_channel.ex # 코치 세션 채널
└── priv/
    └── repo/
        └── migrations/  # 데이터베이스 마이그레이션
```

#### 주요 기능
- WebSocket 연결 (`/socket`)
- 세션별 채널 (`session:{session_id}`)
- 채팅 메시지 DB 저장/조회
- 실시간 메시지 브로드캐스트
- Presence (참가자 추적)

#### 데이터베이스 스키마

**chat_messages 테이블**
- `session_id` (string) - 세션 ID
- `type` (string) - 메시지 타입 (chat_message, image, audio 등)
- `author_role` (string) - 작성자 역할 (golfer, coach)
- `author_id` (string) - 작성자 ID
- `message` (text) - 메시지 내용
- `meta` (map) - 메타데이터 (ts 등)
- `inserted_at`, `updated_at` - 타임스탬프

---

## 실시간 코칭 시스템

### 개요

INSWING 실시간 코칭은 하나의 골프 상황을 **하나의 "세션(Session)"**으로 보고, 그 세션을 기준으로 골퍼·코치·AI 코치가 실시간으로 소통할 수 있는 "레슨방"을 제공합니다.

- 세션 = 레슨방
- 참여자 = 골퍼(golfer), 코치(coach), AI(ai)
- 채널 토픽 = `session:{session_id}`
- 모든 실시간 이벤트는 `event:new`로 전달하고, `payload.type`으로 구분

### 이벤트 타입

| 타입 | 설명 | 주요 필드 |
|------|------|----------|
| `chat_message` | 채팅/멘탈 코칭 메시지 | `author_role`, `message`, `swing_id`, `ts` |
| `swing_created` | 새 스윙 업로드됨 | `swing_id`, `golfer_id`, `status` |
| `swing_analyzed` | 스윙 분석 완료 | `swing_id`, `metrics`, `previous_compare_tag` |
| `coach_tip` | 코치 기술 코멘트 | `swing_id`, `category`, `message` |
| `ai_insight` | AI 인사이트 | `swing_id`, `persona`, `message` |
| `feeling_update` | 골퍼 느낌 업데이트 | `swing_id`, `feeling` |
| `focus_point` | 특정 프레임/구간 강조 | `swing_id`, `frame`, `label` |
| `system_notice` | 시스템 알림 | `message`, `swing_id` |

### Phoenix 메시지 형식

```json
{
  "topic": "session:{session_id}",
  "event": "event:new",
  "payload": {
    "type": "chat_message",
    "session_id": "sess_123",
    "author_role": "golfer",
    "author_id": "golfer_1",
    "message": "이번에는 힘을 뺐는데도 슬라이스가 납니다.",
    "meta": {
      "swing_id": "sw_456",
      "ts": 1764936413351
    }
  },
  "ref": 1
}
```

### 아키텍처 구조

```
[골퍼 브라우저]                    [코치 브라우저]
   upload.html / result.html         coach/session.html
          |                                  |
          | (HTTP, REST)                     | (HTTP, REST)
          v                                  v
          [INSWING API - Node/Express]
                     |
                     | 1) 영상 업로드 & 스윙 생성
                     v
                 [MySQL]  <-- 스윙/유저/세션 저장
                     |
                     | 2) Python 분석 서버 호출
                     v
           [Python 분석 서버]
                     |
                     | 3) 분석완료 → API로 결과 전달
                     v
          [INSWING API - Node/Express]
                     |
                     | 4) Realtime 서버로 이벤트 전달 (HTTP)
                     v
          [INSWING Realtime - Phoenix]
                     ^
                     | 5) WebSocket 브로드캐스트
          [골퍼 브라우저]     [코치 브라우저]
           (session 채널)      (session 채널)
```

### UI/UX 연결

#### 골퍼 화면 (result.html)
- 스윙 영상/분석 수치 상단 표시
- 우측/하단에 "실시간 코칭" 패널
- WebSocket 연결 후 `session:{session_id}` 채널 join
- 수신 이벤트에 따라 UI 갱신

#### 코치 화면 (coach/session.html)
- 좌측: 실시간 세션 리스트
- 우측: 선택된 세션 상세
- 상단: 스윙 영상 플레이어
- 중단: 이벤트 타임라인
- 하단: 채팅 입력창

---

## 개발 가이드

### Cursor AI 작업 가이드

#### 현재 작업 영역
**inswing-realtime** 리포지토리에서 실시간 코칭 기능 구현

#### 작업 범위
- ✅ WebSocket 연결 및 채널 구현
- ✅ 채팅 메시지 DB 저장/조회
- ✅ 실시간 메시지 브로드캐스트
- ✅ 기존 메시지 로드
- ⏳ 코치 화면 개발 (향후)

#### 하지 말아야 할 작업

| 항목 | 담당 |
|------|------|
| SSH 서버 접속 | Ian |
| 서버 코드 수정 | Ian |
| git pull / systemctl restart / PM2 | Ian |
| Nginx 수정 / AWS 설정 변경 | Ian |
| 설계 문서/지시서 작성 | Brown |
| inswing-realtime 코드 개발 | Cursor |

**커서는 코드 생산에만 집중하면 됩니다.**

### Phoenix 개발 가이드

#### 프로젝트 가이드라인
- `mix precommit` alias 사용 (변경사항 완료 후)
- `:req` 라이브러리 사용 (HTTP 요청)
- `:httpoison`, `:tesla`, `:httpc` 사용 금지

#### Phoenix v1.8 가이드라인
- LiveView 템플릿은 `<Layouts.app flash={@flash} ...>`로 시작
- `live_redirect` / `live_patch` 사용 금지 → `<.link navigate={href}>` 사용
- LiveView streams 사용 (컬렉션 처리)
- `<.form>` 및 `<.input>` 컴포넌트 사용

#### Elixir 가이드라인
- 리스트 인덱스 접근: `Enum.at/2` 사용 (접근 문법 금지)
- 변수는 불변, `if` 표현식 결과는 변수에 바인딩
- 같은 파일에 여러 모듈 중첩 금지
- `String.to_atom/1`을 사용자 입력에 사용 금지 (메모리 누수)

### 프론트엔드 개발 가이드

#### WebSocket 연결
- Phoenix Socket 라이브러리 사용
- 서버: `wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0`
- 채널: `session:{swingId}`

#### 실시간 코칭 UI
- 반응형 디자인 (데스크톱: 우측 사이드바, 모바일: 하단 패널)
- 카카오톡 스타일 채팅 UI
- 프로필 아이콘, 말풍선, 타이핑 인디케이터

---

## 운영 및 배포

### 배포 방식

| 리포지토리 | 배포 방식 |
|-----------|----------|
| inswing (프론트) | GitHub Actions 자동 업로드 |
| inswing-api | Ian: deploy-api |
| inswing-ai | Ian: deploy-ai |
| inswing-realtime | Ian: deploy-realtime |

### 로그 관리

#### 로그 파일 위치
```
inswing-api/logs/
├── ai-coaching.log    # AI 코칭 생성 로그
└── performance.log   # 성능 측정 로그
```

#### 로그 확인 방법

**Windows (PowerShell)**
```powershell
# 최근 20줄 확인
Get-Content inswing-api\logs\ai-coaching.log -Tail 20

# 실시간 로그 확인
Get-Content inswing-api\logs\ai-coaching.log -Wait -Tail 50
```

**Linux/Mac**
```bash
# 최근 20줄 확인
tail -n 20 inswing-api/logs/ai-coaching.log

# 실시간 로그 확인
tail -f inswing-api/logs/ai-coaching.log
```

**스크립트 사용**
```bash
# 기본 로그 확인
node inswing-api/scripts/view-logs.js

# 에러만 확인
node inswing-api/scripts/view-logs.js --error

# 통계 확인
node inswing-api/scripts/view-logs.js --stats

# 실시간 모니터링
node inswing-api/scripts/view-logs.js --follow
```

### PM2 명령어

```bash
# 시작
pm2 start ecosystem.config.js

# 재시작
pm2 restart inswing-api
pm2 restart inswing-ai
pm2 restart inswing-realtime

# 중지
pm2 stop inswing-api

# 로그 확인
pm2 logs inswing-api

# 상태 확인
pm2 status
```

### 마이그레이션 실행

**inswing-realtime**
```bash
# 마이그레이션 실행
mix ecto.migrate

# 프로덕션 빌드
MIX_ENV=prod mix compile
MIX_ENV=prod mix release

# 서비스 재시작
systemctl restart inswing-realtime
```

---

## 참고 자료

### 공식 문서
- Phoenix: https://hexdocs.pm/phoenix
- Elixir: https://hexdocs.pm/elixir
- MediaPipe: https://developers.google.com/mediapipe
- Claude API: https://docs.anthropic.com

### 프로젝트 내 문서
- `inswing-api/PROJECT_ARCHITECTURE.md` - 프로젝트 아키텍처 (이 문서에 통합됨)
- `inswing-api/docs/realtime-coaching-events.md` - 실시간 코칭 이벤트 설계 (이 문서에 통합됨)
- `inswing-realtime/AGENTS.md` - Phoenix 개발 가이드라인 (이 문서에 통합됨)
- `inswing-api/LOG_README.md` - 로그 관리 가이드 (이 문서에 통합됨)
- `inswing-ai/SWING_FILTER_GUIDE.md` - 스윙 필터링 가이드 (이 문서에 통합됨)

### 향후 확장 방향
- 그룹 코칭 세션 지원 (여러 골퍼 + 한 코치)
- 세션 녹화/리플레이 (과거 레슨 세션 다시 보기)
- AI 코치 자동 응답 트리거 (특정 metric/feeling 조건에서 자동 코멘트)
- 루틴 기능 (오늘의 루틴 카드 기반 성장 시스템)

---

## 참고 문서

- `INSWING_PLANNING_DOCS.md` - 작업 계획 및 로드맵 상세 문서
  - 프론트 고도화 작업 리스트
  - AI 코칭 시스템 Level 1/2 계획
  - 루틴 기능 설계
  - WebSocket 실시간 코칭 상세 설계
  - 주간 작업 TODO

---

**작성자**: INSWING 개발팀  
**최종 업데이트**: 2025년 1월

