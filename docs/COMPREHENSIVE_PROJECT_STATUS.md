# 📊 INSWING 프로젝트 종합 현황 문서

> **작성일**: 2025년 12월 13일  
> **최종 업데이트**: 2025년 12월 13일  
> **목적**: INSWING 프로젝트의 전체 개발 현황, 구조, 진행 상황을 하나의 문서로 통합

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [폴더별 상세 구현 현황](#3-폴더별-상세-구현-현황)
4. [현재 진행률](#4-현재-진행률)
5. [우선순위별 작업 리스트](#5-우선순위별-작업-리스트)
6. [API 엔드포인트 목록](#6-api-엔드포인트-목록)
7. [데이터베이스 스키마](#7-데이터베이스-스키마)
8. [개발 가이드](#8-개발-가이드)
9. [운영 및 배포](#9-운영-및-배포)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 소개

**INSWING**은 골프 스윙 분석 및 AI 코칭 플랫폼으로, 단순 분석을 넘어 **사용자와 대화하며 성장을 동행하는 골프 코치**를 목표로 합니다.

### 1.2 핵심 가치

> **"완벽한 분석 데이터 < 공감하고 동기부여하는 코칭"**  
> **"비교는 타인과가 아니라 어제의 나와 해야 한다"**  
> **"INSwing은 평가가 아니라 성장 기록 서비스이다"**

### 1.3 프로젝트 구조

```
ian/
├── inswing/              # 프론트엔드 (HTML/JavaScript)
├── inswing-api/          # 백엔드 API (Node.js/Express)
├── inswing-ai/           # AI 분석 서버 (Python/Flask)
└── inswing-realtime/     # 실시간 서비스 (Elixir/Phoenix)
```

### 1.4 기술 스택 요약

| 서비스 | 기술 스택 | 포트 | 주요 역할 |
|--------|----------|------|----------|
| **inswing** | HTML/JavaScript | - | 프론트엔드 UI |
| **inswing-api** | Node.js + Express | 4000 | REST API, 비즈니스 로직 |
| **inswing-ai** | Python + Flask | 5000 | MediaPipe 스윙 분석 |
| **inswing-realtime** | Elixir + Phoenix | 4100 | WebSocket 실시간 통신 |

### 1.5 인프라 구성

- **서버**: AWS EC2
- **웹 서버**: Nginx + SSL
- **프로세스 관리**: PM2
- **도메인**:
  - `inswing.ai` → 랜딩/프론트 (S3+CloudFront)
  - `api.inswing.ai` → Node API (포트 4000)
  - `realtime.inswing.ai` → Phoenix Realtime (내부 4100)
- **스토리지**: AWS S3 + CloudFront

---

## 2. 전체 아키텍처

### 2.1 데이터 흐름

```
1. 사용자 → inswing-api (POST /swings)
   ↓
2. inswing-api → AWS S3 업로드
   ↓
3. inswing-api → inswing-ai (POST /analyze)
   ↓
4. inswing-ai → MediaPipe 분석 → 15개 메트릭 반환
   ↓
5. inswing-api → Claude AI 코칭 생성
   ↓
6. MySQL에 스윙 + 메트릭 + 코칭 저장
   ↓
7. inswing-realtime → WebSocket 브로드캐스트 (실시간 코칭)
   ↓
8. 사용자에게 결과 반환
```

### 2.2 서비스 간 통신

- **inswing-api ↔ inswing-ai**: HTTP REST API (포트 5000)
- **inswing-api ↔ inswing-realtime**: HTTP REST API (포트 4100)
- **프론트엔드 ↔ inswing-realtime**: WebSocket (wss://realtime.inswing.ai)
- **프론트엔드 ↔ inswing-api**: HTTP REST API (https://api.inswing.ai)

---

## 3. 폴더별 상세 구현 현황

### 3.1 inswing-api (백엔드 API 서버)

#### ✅ 완료된 기능

1. **인증 시스템**
   - ✅ JWT 인증 미들웨어
   - ✅ Google OAuth 로그인
   - ✅ Kakao OAuth 로그인
   - ✅ 이메일/비밀번호 로그인

2. **스윙 관리**
   - ✅ 스윙 업로드 (S3 저장)
   - ✅ 스윙 목록 조회
   - ✅ 스윙 상세 조회
   - ✅ AI 분석 연동
   - ✅ AI 코칭 생성 및 재생성
   - ✅ 스윙 히스토리 조회

3. **AI 코칭 시스템**
   - ✅ Claude AI API 연동
   - ✅ 규칙 기반 코칭 (Fallback)
   - ✅ 질문형 코칭 API (`POST /swings/:id/questions`)
   - ✅ 질문 히스토리 조회 (`GET /swings/:id/questions`)
   - ✅ 코칭 톤/스타일 통일 작업 중

4. **느낌(Feeling) 저장**
   - ✅ 스윙별 느낌 저장

5. **루틴 시스템**
   - ✅ 오늘의 루틴 조회
   - ✅ 루틴 세션 시작/종료
   - ✅ 루틴 저장 (80% 완료)

6. **트레이닝 시스템**
   - ✅ 트레이닝 세션 저장
   - ✅ 트레이닝 로그 조회
   - ✅ 트레이닝 플랜 생성

7. **프로필 관리**
   - ✅ 프로필 조회/수정

8. **로그 시스템**
   - ✅ AI 코칭 로그 (ai-coaching.log)
   - ✅ 성능 로그 (performance.log)
   - ✅ 로그 확인 스크립트 (view-logs.js)

#### 📁 폴더 구조

```
inswing-api/
├── server.js                      # 메인 서버 진입점
├── db.js                          # MySQL 연결 풀
├── config/
│   ├── cors.js                   # CORS 설정
│   ├── passport.js               # OAuth 전략
│   └── s3.js                     # AWS S3 클라이언트
├── middlewares/
│   ├── auth.js                   # JWT 인증 미들웨어
│   └── errorHandler.js           # 에러 핸들링
├── routes/
│   ├── auth.js                   # 로그인/OAuth
│   ├── swings.js                 # 스윙 업로드/조회 (1077 lines)
│   ├── feelings.js               # 스윙 느낌 저장
│   ├── routine.js                # 루틴 세션 관리
│   ├── training.js               # 트레이닝 세션 관리
│   ├── questions.js              # 질문 관련 (별도 라우터)
│   └── profile.js                # 프로필 관리
├── services/
│   ├── aiCoachingService.js      # Claude AI 코칭 생성 (622 lines)
│   ├── aiCoachService.js         # AI 코치 서비스
│   ├── coachPrompt.js            # 프롬프트 빌더 (162 lines)
│   ├── commentService.js         # 규칙 기반 코멘트
│   └── trainingPlanService.js    # 트레이닝 플랜 생성
├── scripts/
│   └── view-logs.js              # 로그 확인 스크립트
└── migrations/
    ├── create_swing_answers_table.sql
    ├── create_swing_training_table.sql
    └── add_answer_to_swing_questions.sql
```

#### 🔧 주요 환경 변수

```bash
# JWT & 세션
JWT_SECRET=
SESSION_SECRET=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=

# 데이터베이스
DB_HOST=localhost
DB_USER=
DB_PASSWORD=
DB_NAME=inswing

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
CLOUDFRONT_DOMAIN=

# AI 서비스
ANTHROPIC_API_KEY=
USE_AI_COACHING=true

# 실시간 서비스
REALTIME_URL=http://localhost:4100
```

---

### 3.2 inswing-ai (AI 분석 서버)

#### ✅ 완료된 기능

1. **MediaPipe 기반 분석**
   - ✅ 33개 랜드마크 추출
   - ✅ 15개 메트릭 계산
   - ✅ 스윙 검증 필터링 (환경 변수로 제어 가능)

2. **API 서버**
   - ✅ Flask REST API (포트 5000)
   - ✅ 비디오 업로드 처리
   - ✅ 분석 결과 반환

3. **프로세스 관리**
   - ✅ PM2 설정 (ecosystem.config.js)

#### 📊 추출 메트릭 (15개)

**v1 기본 메트릭 (4개)**
1. `backswing_angle` - 백스윙 각도
2. `impact_speed` - 임팩트 속도
3. `follow_through_angle` - 팔로우스루 각도
4. `balance_score` - 밸런스 점수 (0~1)

**v2 확장 메트릭 (11개)**
5. `tempo_ratio` - 템포 비율 (백스윙:다운스윙)
6. `backswing_time_sec` - 백스윙 시간 (초)
7. `downswing_time_sec` - 다운스윙 시간 (초)
8. `head_movement_pct` - 머리 흔들림 (%)
9. `shoulder_rotation_range` - 어깨 회전 범위 (도)
10. `hip_rotation_range` - 골반 회전 범위 (도)
11. `rotation_efficiency` - 회전 효율 점수 (0~100)
12. `overall_score` - 종합 스윙 점수 (0~100)

#### 📁 폴더 구조

```
inswing-ai/
├── app.py                 # Flask 서버
├── analyze_swing.py       # MediaPipe 분석 로직
├── requirements.txt       # Python 의존성
├── ecosystem.config.js    # PM2 설정
├── test_server.py         # 서버 테스트
└── test_mediapipe.py      # MediaPipe 테스트
```

#### 🔧 스윙 검증 설정

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

### 3.3 inswing (프론트엔드)

#### ✅ 완료된 기능

1. **페이지**
   - ✅ 랜딩 페이지 (한국어/영어)
   - ✅ 로그인 페이지 (OAuth 포함)
   - ✅ 스윙 업로드 페이지
   - ✅ 분석 결과 페이지 (result.html, 1565 lines)
   - ✅ 히스토리 페이지
   - ✅ 루틴 페이지 (베타)
   - ✅ 트레이닝 페이지
   - ✅ 실시간 코칭 테스트 페이지

2. **기능**
   - ✅ OAuth 로그인 연동
   - ✅ 비디오 업로드 (진행률 표시)
   - ✅ 분석 결과 표시 (메트릭, AI 코칭)
   - ✅ 히스토리 조회
   - ✅ 질문 코칭 UI (최근 추가)
   - ✅ 실시간 코칭 WebSocket 연결
   - ✅ 반응형 디자인

#### 📁 폴더 구조

```
inswing/
├── index.html            # 랜딩 페이지
├── ko/                   # 한국어 페이지
│   ├── index.html
│   └── philosophy.html
├── en/                   # 영어 페이지
│   ├── index.html
│   └── philosophy.html
└── app/
    ├── login.html        # 로그인
    ├── upload.html       # 스윙 업로드
    ├── result.html       # 분석 결과 (1565 lines)
    ├── history.html      # 히스토리
    ├── routine.html      # 루틴 페이지
    ├── training.html     # 트레이닝 페이지
    ├── test-realtime.html # 실시간 코칭 테스트
    ├── css/
    │   └── chat.css      # 실시간 코칭 스타일
    └── js/
        ├── app.js        # 공통 API 유틸리티
        ├── result.js     # 결과 페이지 로직
        └── realtime-test.js # 실시간 코칭 테스트
```

---

### 3.4 inswing-realtime (실시간 서비스)

#### ✅ 완료된 기능

1. **WebSocket 통신**
   - ✅ Phoenix Socket 연결
   - ✅ 세션별 채널 (`session:{session_id}`)
   - ✅ 실시간 메시지 브로드캐스트

2. **채팅 기능**
   - ✅ 채팅 메시지 DB 저장/조회
   - ✅ 메시지 타입별 처리

3. **이벤트 시스템**
   - ✅ 다양한 이벤트 타입 지원 (chat_message, swing_analyzed, ai_insight 등)

#### 📁 폴더 구조

```
inswing-realtime/
├── mix.exs              # 프로젝트 설정
├── config/              # 환경별 설정
├── lib/
│   ├── inswing_realtime/
│   │   ├── chat.ex      # 채팅 컨텍스트
│   │   └── chat/
│   │       └── chat_message.ex  # 메시지 스키마
│   └── inswing_realtime_web/
│       ├── router.ex    # 라우팅
│       ├── user_socket.ex  # WebSocket
│       └── channels/
│           ├── session_channel.ex      # 일반 세션 채널
│           └── coach_session_channel.ex # 코치 세션 채널
└── priv/
    └── repo/
        └── migrations/  # 데이터베이스 마이그레이션
```

---

## 4. 현재 진행률

### 4.1 전체 기능 진행률

| 카테고리 | 완료 | 진행 중 | 미구현 | 진행률 |
|---------|------|---------|--------|--------|
| **인증/사용자** | 4 | 0 | 0 | 100% |
| **스윙 업로드/분석** | 5 | 0 | 0 | 100% |
| **AI 코칭** | 6 | 1 | 0 | 85% |
| **루틴 시스템** | 3 | 1 | 0 | 75% |
| **트레이닝 시스템** | 4 | 0 | 0 | 100% |
| **실시간 코칭** | 3 | 0 | 1 | 75% |
| **히스토리/통계** | 1 | 1 | 1 | 33% |
| **소셜 기능** | 0 | 0 | 3 | 0% |
| **구독/결제** | 0 | 0 | 2 | 0% |
| **전체 평균** | - | - | - | **~65%** |

### 4.2 서비스별 상태 요약

| 기능 | 상태 | 비고 |
|------|------|------|
| 영상 업로드 → AI 분석 | ✔ 완료 | MediaPipe 15개 메트릭 추출 |
| Claude AI 코칭 생성 | ✔ 완료 | 질문 코칭 API 포함 |
| 히스토리 | ✔ 기본형 완료 | 고도화 필요 |
| 실시간 코칭(WebSocket) | 🟡 MVP 완료 | 기초 채팅 기능, 강화 필요 |
| 루틴 시스템 | 🟡 응답 구조 완료 | UI 미적용, 저장 로직 80% |
| 트레이닝 시스템 | ✔ 완료 | 세션 저장/조회 완료 |
| 모바일 촬영/업로드 | 🟡 동작 | 예외 상황 대응 부족 |
| 소셜 기능 | ❌ 미구현 | - |
| 구독/결제 | ❌ 미구현 | - |

### 4.3 최근 완료된 작업 (2025-12-13)

1. ✅ **질문 코칭 API 완성**
   - `POST /swings/:id/questions` 엔드포인트 구현
   - `GET /swings/:id/questions` 엔드포인트 구현 (히스토리 조회)
   - `swing_questions` 및 `swing_answers` 테이블 생성
   - AI 답변 생성 및 DB 저장 로직 구현
   - AI 응답 중단 문제 해결 (max_tokens: 480 → 1000)
   - 프론트엔드 중복 표시 문제 해결 (answer.text 필드 추가)

2. ✅ **스윙 검증 완화**
   - `analyze_swing.py`의 스윙 필터링 로직 완화
   - 환경 변수로 제어 가능하도록 개선
   - 기본값으로 필터 비활성화 (`ENABLE_SWING_FILTER=false`)

3. ✅ **로그 관리 시스템 구축**
   - `view-logs.js` 스크립트 생성
   - npm scripts 추가 (`logs`, `logs:error`, `logs:success`, `logs:stats`, `logs:perf`, `logs:follow`)

---

## 5. 우선순위별 작업 리스트

### 🟥 P1: 즉시 해야 할 핵심 기능

#### 1. AI 코칭 톤 통일 ⭐ **현재 가장 중요**

**목표**: "INSwing High-Class Coach Style" 브랜드 톤 통일

- [ ] result 한 줄 코칭 문장 톤 통일
- [ ] 질문형 코치(AI) 응답 톤 통일
- [ ] training focus / routine 설명도 동일 톤 적용
- [ ] "INSWING 코치 캐릭터" 정의 및 문서화
- [ ] 프롬프트 엔지니어링 개선

**진행 상황**: 프롬프트 개선 작업 진행 중

#### 2. Training 저장 로직 고도화 (80% → 100%)

**목표**: 루틴 저장 기능 완성

- [ ] 루틴 저장 시 체크박스 상태 DB 보관
- [ ] 중복 저장 OK 처리
- [ ] 오늘 루틴 저장 버튼 UX 완성 (완료 상태 → 재활성)
- [ ] History에서 "훈련 히트맵" 확장 (향후)

**진행 상황**: 기본 저장 로직 구현 완료, UX 미세 조정 필요

#### 3. result ↔ training 왕복 UX 마무리

**목표**: 페이지 간 자연스러운 이동

- [x] result → training 이동 구현
- [x] training → result 이동 구현
- [x] URL id 자연스럽게 이어짐
- [ ] 모바일에서 동작 확인 및 미세 조정
- [ ] 문구·버튼 미세 조정

**진행 상황**: 기본 기능 완료, UX 폴리싱 필요

---

### 🟧 P2: 사용자 경험 확장 작업

#### 4. Training Session Logs 리스트 뷰 추가

- [ ] "이 스윙의 훈련 기록 보기" 모달/페이지
- [ ] 저장된 루틴 리스트 표시
- [ ] 완료 개수/총 개수 표시
- [ ] 정렬 & 날짜 UI 개선

**진행 상황**: 모달 1차 버전 완료, 디자인 개선 필요

#### 5. History 페이지 고도화

- [ ] 스윙 정렬 옵션 (최신/점수순/클럽별)
- [ ] "좋았던 스윙" 마킹 기능
- [ ] 한 줄 코칭 미리보기 표시

#### 6. 질문형 코칭 개선 (AI 응답 품질 향상)

- [ ] 사용자 질문 타입 분류
- [ ] 초보자/중급자/고급자 기반 차별화
- [ ] "Follow-up 질문 제안" 기능

---

### 🟨 P3: 기능 확장/미래 준비

#### 7. 실시간 코칭(Realtime) 기능 강화

- [ ] 세션 내 AI와 코치 동시 존재 가능
- [ ] 음성 입력 + 스윙 분석 음성 피드백
- [ ] 타임라인 기반 피드백(특정 프레임 포인트 지적)

#### 8. 정식 Training Plan 생성 기능

- [ ] 오늘의 포커스 기반 자동 루틴 생성
- [ ] 사용자의 최근 스윙 경향 분석
- [ ] "이번 주 3일 훈련 계획" 추천

#### 9. 스윙 분석 모델 고도화

- [ ] 측정 포인트 개선
- [ ] 골반/어깨 회전량 정밀도 향상
- [ ] 템포 분석 추가
- [ ] 프로 선수 비교 모드

---

### 🟦 P4: 브랜드·프로덕트 완성 단계

#### 10. INSwing Coach Persona 공식 문서화

- [ ] AI 코치 이름 정의
- [ ] 말투 가이드라인 작성
- [ ] 레슨 철학 정리
- [ ] coaching principles 문서화

#### 11. INSwing 정식 랜딩 페이지 리뉴얼

- [ ] "AI 코칭" 강조
- [ ] 트레이닝 루틴 소개
- [ ] 히스토리 기능 소개
- [ ] 프로사용자 리뷰 추가
- [ ] 영상 데모 추가

---

## 6. API 엔드포인트 목록

### 6.1 인증 (Auth)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/auth/login` | 이메일 로그인 | ❌ |
| GET | `/auth/google` | Google OAuth 시작 | ❌ |
| GET | `/auth/google/callback` | Google OAuth 콜백 | ❌ |
| GET | `/auth/kakao` | Kakao OAuth 시작 | ❌ |
| GET | `/auth/kakao/callback` | Kakao OAuth 콜백 | ❌ |

### 6.2 스윙 (Swings)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/swings` | 스윙 업로드 + AI 분석 + 코칭 생성 | ✅ |
| GET | `/swings` | 스윙 히스토리 조회 | ✅ |
| GET | `/swings/:id` | 스윙 상세 조회 | ✅ |
| POST | `/swings/:id/regenerate-coaching` | 코칭 재생성 | ✅ |
| POST | `/swings/:id/questions` | 질문 코칭 생성 | ✅ |
| GET | `/swings/:id/questions` | 질문 히스토리 조회 | ✅ |

### 6.3 느낌 (Feelings)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/swings/:id/feeling` | 스윙 느낌 저장 | ✅ |

### 6.4 루틴 (Routine)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/routine/today` | 오늘의 루틴 조회 | ✅ |
| GET | `/routine/active` | 활성 루틴 조회 | ✅ |
| POST | `/routine/start` | 루틴 세션 시작 | ✅ |
| POST | `/routine/end` | 루틴 세션 종료 | ✅ |

### 6.5 트레이닝 (Training)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/training-sessions` | 트레이닝 세션 저장 | ✅ |
| GET | `/swings/:id/training-logs` | 트레이닝 로그 조회 | ✅ |
| POST | `/training-plans` | 트레이닝 플랜 생성 | ✅ |
| GET | `/training-plans/:planId` | 트레이닝 플랜 조회 | ✅ |
| POST | `/training-sessions/:sessionId/progress` | 트레이닝 진행 상황 저장 | ✅ |
| GET | `/training-plans/:planId/progress` | 트레이닝 진행 상황 조회 | ✅ |
| GET | `/swings/:id/training` | 스윙별 트레이닝 조회 | ✅ |

### 6.6 프로필 (Profile)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/me/profile` | 프로필 조회 | ✅ |
| PUT | `/me/profile` | 프로필 수정 | ✅ |

### 6.7 헬스체크

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/health` | 서버 상태 확인 | ❌ |
| GET | `/api/health` | API 서버 상태 확인 | ❌ |

---

## 7. 데이터베이스 스키마

### 7.1 주요 테이블

#### users
- 사용자 정보 (id, email, name, provider 등)

#### swings
- 스윙 정보 (id, user_id, video_url, club_type, shot_side, created_at 등)

#### metrics
- 스윙 메트릭 (swing_id, backswing_angle, impact_speed 등 15개 메트릭)

#### feelings
- 스윙 느낌 (swing_id, feeling_code, note 등)

#### swing_questions
- 질문 정보 (id, swing_id, user_id, question_text, status, created_at 등)

#### swing_answers
- 답변 정보 (id, question_id, answer_source, cause_text, solution_text, feel_image, drill_text, encouragement 등)

#### training_sessions
- 트레이닝 세션 (id, swing_id, user_id, completed_items, total_items 등)

#### training_plans
- 트레이닝 플랜 (id, user_id, swing_id, focus_tags 등)

---

## 8. 개발 가이드

### 8.1 로컬 개발 환경 설정

#### inswing-api 실행

```bash
cd inswing-api
npm install
# .env 파일 설정
npm start  # 또는 pm2 start ecosystem.config.js
```

#### inswing-ai 실행

```bash
cd inswing-ai
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py  # 또는 pm2 start ecosystem.config.js
```

#### inswing-realtime 실행

```bash
cd inswing-realtime
mix deps.get
mix phx.server  # 또는 systemctl start inswing-realtime
```

### 8.2 로그 확인 방법

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

### 8.3 PM2 명령어

```bash
# 시작
pm2 start ecosystem.config.js

# 재시작
pm2 restart inswing-api
pm2 restart inswing-ai

# 중지
pm2 stop inswing-api

# 로그 확인
pm2 logs inswing-api

# 상태 확인
pm2 status
```

---

## 9. 운영 및 배포

### 9.1 배포 방식

| 리포지토리 | 배포 방식 |
|-----------|----------|
| inswing (프론트) | GitHub Actions 자동 업로드 |
| inswing-api | Ian: deploy-api |
| inswing-ai | Ian: deploy-ai |
| inswing-realtime | Ian: deploy-realtime |

### 9.2 릴리즈 플랜

| 버전 | 목표 | 상태 |
|------|------|------|
| v1.0 | "분석 + AI 코칭" | ✔ 런칭 |
| v1.5 | "실시간 코칭 완성" | ⏳ 진행 중 |
| v2.0 | "습관화 / 성장 시스템" | 예정 |
| v3.0 | "커뮤니티 / 수익화" | 예정 |

### 9.3 성공 기준 (KPI)

| 지표 | 목표 |
|------|------|
| 첫 업로드 → 두 번째 업로드 비율 | 40%+ |
| 첫 업로드 후 평균 이용 주기 | 7일 이내 |
| 10회 업로드 달성률 | 30%+ |
| 분석 결과 화면 평균 체류 시간 | 2분 이상 |
| 실시간 코칭 기능 이용률 | 50%+ |

---

## 📝 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2025-12-13 | 종합 현황 문서 생성 | Auto (Cursor) |
| 2025-12-13 | 질문 코칭 API 완성 | - |
| 2025-12-13 | 스윙 검증 완화 | - |
| 2025-12-13 | 로그 관리 시스템 구축 | - |

---

## 📚 참고 문서

### 프로젝트 내 문서
- `inswing/docs/API_REFERENCE.md` - API 상세 참조 문서
- `inswing/docs/AI_ENGINE.md` - AI 분석 엔진 상세 기술 문서
- `inswing/docs/REALTIME_COACHING.md` - 실시간 코칭 상세 기술 문서
- `inswing-api/docs/COACH_STYLE_GUIDE.md` - 코치 스타일 가이드 (프롬프트 작성 시 참조)
- `inswing-ai/README.md` - AI 분석 서버 프로젝트 설명
- `inswing-realtime/README.md` - 실시간 서비스 프로젝트 설명
- `inswing-api/EC2_명령어_모음.md` - EC2 운영 명령어 모음

### 외부 문서
- Phoenix: https://hexdocs.pm/phoenix
- Elixir: https://hexdocs.pm/elixir
- MediaPipe: https://developers.google.com/mediapipe
- Claude API: https://docs.anthropic.com

---

**문서 작성자**: INSWING 개발팀  
**최종 업데이트**: 2025년 12월 13일  
**문서 버전**: 1.0

