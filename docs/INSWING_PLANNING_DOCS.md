# INSWING 프로젝트 작업 계획 및 로드맵

> **작성일**: 2025년 1월  
> **목적**: 프로젝트 작업 계획, TODO, 기능 설계를 통합한 문서

---

## 📋 목차

1. [프로젝트 진행 현황](#프로젝트-진행-현황)
2. [프론트 고도화 작업](#프론트-고도화-작업)
3. [AI 코칭 시스템](#ai-코칭-시스템)
4. [루틴 기능 설계](#루틴-기능-설계)
5. [WebSocket 실시간 코칭](#websocket-실시간-코칭)
6. [주간 작업 TODO](#주간-작업-todo)

---

## 프로젝트 진행 현황

### 서비스 진행률

| 영역 | 진행률 | 비고 |
|------|--------|-----|
| AI 분석 엔진 | 🔥 완료 | 코멘트·스코어 포함 |
| API 서버 | 🔥 완료 | 전체 기능 동작 |
| 인프라 | 🔥 완료 | HTTPS + CDN |
| **프론트(UI)** | ⏳ 진행중 | 핵심 남은 파트 |
| **실시간 코칭** | ⏳ 진행중 | WebSocket 구현 중 |

### 프론트 고도화 작업 현황

#### upload.html
| 항목 | 상태 |
|------|------|
| 파일 선택 UI 개선 | ⏳ |
| 업로드 시 로딩 표시 | ⏳ |
| `POST /swings` API 연동 | ✅ |
| 완료 시 `result.html?id=###` 이동 | ✅ |
| 실패 시 안내/재시도 | ⏳ |

**우선순위 1위**

#### result.html
| 항목 | 상태 |
|------|------|
| `GET /swings/:id` 데이터 바인딩 | ✅ |
| AI 코멘트 표시 | ✅ |
| 스윙 스코어 표시 | ✅ |
| 세부 메트릭 표시 | ✅ |
| CloudFront 영상 재생 | ✅ |
| feeling 저장 기능 | ✅ |
| **실시간 코칭 WebSocket** | ✅ |

**우선순위 2위** (완료)

#### history.html
| 항목 | 상태 |
|------|------|
| `GET /swings` 리스트 표시 | ✅ |
| 최신순 정렬 | ✅ |
| 썸네일·날짜·클럽 요약 | ✅ |
| 카드 클릭 시 result 이동 | ✅ |
| 빈 상태 안내 | ✅ |

**우선순위 3위** (완료)

---

## 프론트 고도화 작업

### 공통 준비
- [x] API 서버 베이스 URL 상수화 (`app/js/app.js`)
- [x] JWT 토큰 저장/로드 유틸리티 정리
- [x] 로그인 상태만 /app 접근 가능하도록 라우팅 가드
- [x] 모바일 촬영 → 업로드 정상 동작 확인

### upload.html 개선
#### 기능
- [x] 파일 선택 UI 개선
- [x] 업로드 시 로딩 모달/스피너 표시
- [x] `POST /swings` API 요청 연결
- [x] AI 분석 완료될 때까지 대기 처리
- [x] 업로드 성공 시 `result.html?id={swingId}`로 자동 이동
- [x] 업로드 실패 시 사용자 안내 메시지

#### UX 개선
- [x] 영상 파일 외 업로드 방지
- [x] 파일 크기 제한 경고
- [x] "AI 분석 중…" 문구 + Dot animation

### result.html 개선
#### API 데이터 바인딩
- [x] `GET /swings/:id` 호출
- [x] AI 코멘트 표시
- [x] 스윙 점수(overall_score) 표시
- [x] 메트릭(backswing / balance / tempo etc.) 표시
- [x] CloudFront 영상 플레이어 적용
- [x] 업로드 날짜/클럽/샷사이드 표시
- [x] **실시간 코칭 WebSocket 연결**

#### 느낌 기록 기능
- [x] 드롭다운(feeling_code) UI 배치
- [x] 노트 입력 필드 UI
- [x] `POST /swings/:id/feeling` API 호출
- [x] 저장 완료 후 토스트 알림

### history.html 개선
#### API 데이터 바인딩
- [x] `GET /swings` 호출
- [x] 최신순 정렬
- [x] 썸네일 / 날짜 / 클럽 / 코멘트 일부 표시
- [x] 빈 상태일 경우 안내 메시지

#### UX 개선
- [x] 카드 클릭 시 `result.html?id={swingId}`로 이동
- [ ] 무한 스크롤 또는 페이지네이션 (선택)
- [ ] 필터 옵션 (Driver / Iron / Wedge) — 이후 확장

### 공통 후처리
- [x] 오류 응답 처리 표준화
- [x] 네트워크 장애 대비 재시도 로직 추가
- [x] 다크모드 UI 미세 조정
- [x] 모바일 반응형 점검
- [ ] 페이지 전환 애니메이션 추가

### 향후 확장 로드맵 (선택)
- [ ] 프로필 페이지
- [ ] 프로별 공유용 뷰(View only)
- [ ] 라운드별 스윙 통계
- [ ] "컨디션" 기반 AI 배드샷 예측
- [ ] "나만의 스윙 법칙" 자동 추출

---

## AI 코칭 시스템

### Level 1 완료 사항

#### ✅ 환경 설정
- [x] Anthropic 계정 생성
- [x] API 키 발급
- [x] 패키지 설치 (`@anthropic-ai/sdk`)
- [x] 환경 변수 설정

#### ✅ 서비스 구현
- [x] `services/aiCoachingService.js` 완성
- [x] `callClaudeAPI()` 함수 구현 (재시도, 타임아웃 포함)
- [x] `generateCoaching()` 함수 구현
- [x] 헬퍼 함수 작성 (클럽명, 방향명 한글 변환)
- [x] 에러 핸들링 추가
- [x] 로깅 함수 추가

#### ✅ 프롬프트 설계
- [x] 기본 프롬프트 템플릿 작성
- [x] 메트릭 데이터 포맷팅
- [x] 느낌 코드 반영 로직
- [x] 존댓말 톤 유지
- [x] 평소 대비 비교 기능

#### ✅ 백엔드 통합
- [x] `routes/swings.js` 수정
- [x] AI 코칭 서비스 import
- [x] 스윙 업로드 시 AI 코칭 생성 로직 추가
- [x] Fallback 로직 구현 (규칙 기반 코멘트)
- [x] 환경 변수 토글 확인 (`USE_AI_COACHING`)
- [x] 에러 처리 강화

#### ✅ 프론트엔드 표시
- [x] `result.html` AI 코칭 카드 UI 추가
- [x] 타이핑 애니메이션 효과
- [x] "다시 생성" 버튼 기능
- [x] 로딩 상태 표시
- [x] 키워드 태그 표시

#### ✅ 로깅 시스템
- [x] `logs/` 폴더 생성
- [x] AI 코칭 로그 파일 생성 (`ai-coaching.log`)
- [x] 성능 로그 추가 (`performance.log`)
- [x] 로그 확인 스크립트 (`scripts/view-logs.js`)

### Level 2 계획 (향후)

#### 히스토리 반영 코칭
- [ ] 직전 스윙 비교 (1주)
- [ ] 최근 3개 스윙 트렌드 (1주)
- [ ] 사용자 프로필 DB (1주)
- [ ] 통합 및 테스트 (1주)

**목표**: "나를 아는 코치" 구현

---

## 루틴 기능 설계

### 컨셉: "오늘의 루틴 카드" 기반 성장 시스템

**목표**: "나의 골프 성장 일지 + AI 코치"

매번 영상 올릴 때마다:
- 오늘 상태 체크
- AI가 한두 개의 핵심 포인트만 잡아줌
- 시간이 지나면 내 약점/강점 패턴이 자동으로 보이는 구조

### 핵심 아이디어

매일/매 라운드마다 "오늘의 루틴 카드" 1장 생성:
- 오늘 컨디션/목표
- AI가 뽑은 오늘의 핵심 포인트(1~2개)
- 오늘 업로드한 스윙들의 요약
- 오늘의 느낌/메모

### 데이터와 AI 로직

#### 이미 가지고 있는 데이터
- `swings` 테이블: `club_type`, `shot_side`, `created_at`
- `metrics`: `backswing`, `tempo_ratio`, `head_movement_pct`, `overall_score` 등
- AI comment
- `feeling` (`feeling_code` + `note`)

#### 루틴용 "태그" 자동 추출

각 스윙마다 AI가 포커스 태그를 갖도록:
- `balance`, `head_stable`, `tempo_fast`, `tempo_good`
- `rotation_good`, `distance_focus`, `finish_weak` 등

**생성 방법** (단순 룰 + 코멘트 키워드 혼합):
- `head_movement_pct > 40` → `head_unstable`
- `tempo_ratio < 1` → `tempo_fast`
- `tempo_ratio`가 `3±0.5` → `tempo_good`
- `balance_score >= 0.98` → `balance_good`
- AI comment에 "밸런스", "머리", "템포", "회전", "비거리", "불안" 등 들어가면 각각 대응 태그 추가

#### 개인 성장 루틴 엔진 (간단 버전)

최근 N일(예: 14일) 데이터로:
- **문제 Top2**: 가장 자주 나타나는 "약점 태그" 2개
- **강점 Top1**: 가장 자주 나타나는 "강점 태그" 1개
- **베스트 스윙 샘플**: `overall_score` 상위 + `feeling`이 `perfect` 또는 `good`인 스윙 1~2개

→ 이 3가지를 가지고 오늘 루틴 문장을 만든다:
> "최근 2주간, 머리 흔들림과 템포가 반복되는 약점으로 나타나고 있어요. 오늘은 '머리 고정'과 '3:1 템포'만 신경 쓰는 루틴을 제안합니다."

### 사용자 흐름 (Routine v1)

#### 1. 오늘 시작 화면 (`routine.html`)

사용자가 로그인 → 루틴 홈 진입

**상단**:
- "이번 달 나의 루틴 진행도" (간단한 막대/원형)

**중앙 카드: 오늘의 루틴**
- 오늘의 목표 (텍스트 1줄)
- AI가 추천한 핵심 포인트 1~2개
- "오늘 루틴 시작하기" 버튼

#### 2. 루틴 시작 시

사용자가 간단히 입력:
- **오늘 상태 체크**:
  - 컨디션: 좋음 / 보통 / 피곤
  - 오늘 플레이: 필드 / 연습장 / 스크린
  - 오늘 목표: 비거리 / 방향성 / 스코어 / 리듬 등 중 택1

→ `POST /routine/checkin` (오늘의 메타 정보 저장)

#### 3. 스윙 업로드 & 분석 (지금 기능 그대로 사용)

사용자는 평소처럼 `upload.html`에서 스윙 업로드

`result.html`에서:
- AI 코멘트
- 메트릭
- 느낌(`feeling` + `note`)

→ 이 데이터가 쌓이면서, 루틴 엔진이 계속 업데이트됨.

#### 4. 루틴 종료 & 회고

하루 마지막에(또는 사용자가 버튼 클릭):

"오늘 루틴 마무리" 카드:
- 오늘 업로드한 스윙 개수
- 오늘 평균 점수 / 최고 점수
- 오늘 느낌 요약 (`feeling_code` 통계)
- AI가 한 줄 코멘트:
  > 예: "오늘은 전체적으로 밸런스는 좋았지만, 머리 흔들림이 남아 있었습니다. 다음엔 머리 위치만 집중해볼까요?"

→ `POST /routine/feedback`으로 저장.

### 화면 구성

#### 루틴 홈 (`routine.html`)

**상단 히어로 영역**
- "Ian 님의 INSwing 성장 루틴"
- 이번 달 업로드 수 / 평균 점수 / 최고의 날 한 줄 요약

**오늘의 루틴 카드**
- 오늘의 목표
- 오늘의 포커스 태그 뱃지 (예: 머리 고정, 템포, 피니시)
- "루틴 시작" / "오늘 마무리" 버튼

**최근 7일 그래프**
- `overall_score` / `head_movement` / `tempo_ratio` 등 중 택2
- 간단한 라인 차트

**나의 대표 스윙**
- 베스트 스윙 썸네일 + 점수 + date
- 클릭 시 `result.html?id=...`

#### 프리미엄 전환 포인트

**무료**:
- 오늘 루틴 카드 간단 버전
- 최근 7일 간 스윙 수

**프리미엄**:
- 상세 그래프, 태그 트렌드
- "나의 약점 Top3 / 강점 Top3"
- 기간 비교(이번 달 vs 지난 달)

### API / DB 설계

#### 신규 테이블 (제안)

**daily_routines**
- `id`
- `user_id`
- `date` (YYYY-MM-DD)
- `condition` (good / normal / tired)
- `goal_type` (distance / accuracy / score / rhythm …)
- `focus_tags` (JSON 배열)
- `summary_comment` (AI가 적는 하루 요약)
- `created_at`, `updated_at`

#### 주요 API

- `GET /routine/today` - 오늘 루틴 카드 정보 + 추천 포커스 태그
- `POST /routine/checkin` - 오늘의 컨디션/목표 입력
- `POST /routine/feedback` - 하루 마무리 요약 저장 (선택)
- `GET /routine/summary?range=30d` - 최근 30일 통계(그래프용)

### 구현 단계

1. **루틴 로직 없이 "루틴 홈 UI"만 먼저 만들기**
   - `routine.html` 생성
   - "오늘의 루틴 카드"에 dummy data로 문구/태그 뿌리기
   - 최근 7일 통계는 나중에 API 만들고 연결

2. **루틴 엔진 v0 (서버에서 최근 N개 스윙 통계만 계산)**
   - `GET /routine/today` → 약점/강점 태그 2~3개 + 한 줄 코멘트 리턴
   - 프론트는 이걸 받아서 카드에 표시

3. **checkin / feedback 저장 기능**
   - 오늘 컨디션/목표 입력 + 하루 마무리 메모 저장
   - 이후 프리미엄 통계의 기반 데이터

---

## WebSocket 실시간 코칭

### 전체 그림 (아키텍처 개념도)

```
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
```

### WebSocket 이벤트 설계

#### 기본 원칙
- 이벤트 이름 규칙: `domain:action` 형태로 단순하게
  - 예: `chat:new`, `session:state`, `ai:feedback`, `swing:update`
- payload 구조 통일: 항상 `type`, `session_id`, `sender`, `data`, `meta` 정도의 공통 구조 유지
- 방향 명확히: 클라이언트 → 서버 전송용 이벤트 / 서버 → 클라이언트 broadcast 전용 이벤트 구분

#### 이벤트 목록

**채팅 관련**
- `chat:new` (C → S): 텍스트 채팅 전송 (학생/코치)
- `chat:added` (S → 모든 클라): 새로운 채팅 메시지 브로드캐스트

**세션 상태**
- `session:control` (C → S, 코치): 세션 상태 변경 요청 (시작/일시중지/종료 등)
- `session:state` (S → 모든 클라): 현재 세션 상태 브로드캐스트

**스윙/분석 상태 업데이트**
- `swing:update` (Node → Phoenix): AI 분석 진행 상태(진행률, 단계)
- `swing:progress` (S → 모든 클라): 학생/코치 화면에 진행상태 표시
- `ai:feedback` (Node → Phoenix / S → 모든 클라): AI 분석 결과 도착

**Presence / 접속자 상태**
- `presence:state` (S → 모든 클라): 현재 접속자 목록 전체
- `presence:diff` (S → 모든 클라): 새로 접속/퇴장 등 변화

### Phoenix 채널 구조

#### 채널 토픽 설계
- 소켓 endpoint: `/socket`
- 채널 모듈: `InswingRealtimeWeb.CoachSessionChannel`
- 토픽 규칙: `"session:" <> session_id`
- 예: 학생 A, 코치 B가 `session_abc123`에서 대화 → 둘 다 `topic: "session:abc123"`에 join

#### 현재 구현 상태
- ✅ WebSocket 연결 (`/socket`)
- ✅ `session:{session_id}` 채널 join
- ✅ `event:new` 메시지 송수신
- ✅ 채팅 메시지 DB 저장/조회
- ✅ 기존 메시지 로드
- ⏳ Presence 구현 (향후)
- ⏳ 코치 화면 개발 (향후)

### 실시간 코치 모드 기능 (MVP 버전 플로우)

#### 시나리오 (학생 기준)
1. 학생이 INSWING에서 스윙 업로드 + 분석 요청
2. Node API가 스윙 분석 Job 생성 → `session_id` 발급
3. 학생이 "실시간 코치 모드 시작" 클릭
4. 프론트에서 `session_id`를 쿼리스트링 혹은 상태로 가지고 `realtime.inswing.ai`에 접속
5. WebSocket 연결 후 `session:{session_id}` join
6. Phoenix Presence에 학생 등록 → 코치는 아직 대기 상태

#### 시나리오 (코치 기준)
1. 코치용 대시보드에서 "대기 중인 세션 리스트" 조회
2. Node API에서 `status=waiting` 세션 검색
3. 특정 세션 선택 → 실시간 코치 입장 클릭
4. 코치 브라우저에서도 같은 `session:{session_id}` join
5. Presence에 코치가 추가되면서 학생 화면: "코치가 입장했습니다."

#### 실제 코칭 중 발생하는 주요 이벤트
- **AI 분석 결과 도착**: Node → Phoenix: `ai:feedback` 브로드캐스트 → 학생/코치 화면에 같은 카드가 동시에 뜨도록
- **코치의 코멘트**: 코치: "이 부분은 이렇게 고치세요" → `chat:new` → 학생: 실시간으로 채팅 리스트에서 확인
- **세션 상태 변경**: 코치가 "오늘 레슨 종료" → `session:control` (`status="ended"`) → 모든 클라이언트: `session:state` 갱신, 버튼 비활성화

### 1차 버전에서 꼭 필요한 것만
- ✅ `session:{session_id}` 채널로 학생/코치 동시 접속
- ⏳ Presence 기반 "누가 접속 중인지" 표시
- ✅ 텍스트 채팅 (`event:new` / `chat:new`)
- ⏳ 세션 상태 표시 (`session:state`) – 최소: waiting / active / ended
- ⏳ AI 분석 결과를 실시간 공유 (`ai:feedback`)

---

## 주간 작업 TODO

### 이번 주 핵심 목표
1. **실시간 코칭 시스템 구현**
2. **버그 수정 및 안정화**
3. **UX 개선 (로딩, 진행률)**

### 진행 상황 추적

#### 완료된 작업
- [x] 실시간 코칭 WebSocket 연결
- [x] 채팅 메시지 DB 저장/조회
- [x] 기존 메시지 로드
- [x] 카카오톡 스타일 채팅 UI
- [x] 타이핑 인디케이터

#### 진행 중인 작업
- [ ] Presence 구현
- [ ] 코치 화면 개발
- [ ] 세션 상태 관리

#### 향후 작업
- [ ] 그룹 코칭 세션 지원 (여러 골퍼 + 한 코치)
- [ ] 세션 녹화/리플레이 (과거 레슨 세션 다시 보기)
- [ ] AI 코치 자동 응답 트리거 (특정 metric/feeling 조건에서 자동 코멘트)

---

## 로드맵 / 향후 확장

### 단기
- 프로 공유용 뷰(View Only)
- UI 애니메이션
- 루틴 기능 구현

### 중기
- 스윙 유형 자동 분류
- 컨디션 기반 성장 분석
- 히스토리 반영 코칭 (Level 2)

### 장기
- 멘탈 AI 코치
- 글로벌 확장
- 그룹 코칭 세션

---

## 회의 메모 / 아이디어 저장소

- "골프는 기술이 아니라 기억이다."
- "비교는 타인과가 아니라 어제의 나와 해야 한다."
- "좋은 샷은 우연이 아니라 좋은 기억의 누적이다."
- "AI는 데이터를 계산하지만, 사람은 기분을 기억한다."
- "INSwing은 평가가 아니라 성장 기록 서비스이다."

---

**작성자**: INSWING 개발팀  
**최종 업데이트**: 2025년 1월

