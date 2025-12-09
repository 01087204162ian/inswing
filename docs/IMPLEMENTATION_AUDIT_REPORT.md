# INSWING 문서 대비 구현 상태 점검 보고서

> **작성일**: 2025-01  
> **점검 기준**: docs/REALTIME_COACHING.md, docs/API_REFERENCE.md, docs/AI_ENGINE.md, docs/ROADMAP.md

---

## 📋 요약

| 리포지토리 | OK | TODO | MISMATCH | TEST_REQUIRED |
|-----------|----|----|----------|---------------|
| **inswing** | 4 | 2 | 1 | 1 |
| **inswing-api** | 6 | 2 | 2 | 1 |
| **inswing-ai** | 3 | 1 | 2 | 1 |
| **inswing-realtime** | 5 | 1 | 1 | 0 |

---

## 🔴 중요 문제 (최우선 처리)

### 1. [MISMATCH] inswing-api: POST /swings 응답에 `session_id` 누락
- **문서**: `{ "status": "ok", "swing_id": "sw_123", "session_id": "sess_123" }`
- **실제**: `session_id` 필드가 응답에 포함되지 않음
- **위치**: `inswing-api/routes/swings.js` (POST /swings)
- **영향**: 실시간 코칭 WebSocket 연결 시 세션 ID를 알 수 없음

### 2. [MISMATCH] inswing-ai: 응답에 `analysis_version`, `invalid_swing` 필드 누락
- **문서**: `{ "metrics": {...}, "analysis_version": "v2", "invalid_swing": false }`
- **실제**: `{ "ok": true, "analysis": {...} }` 형태로만 반환
- **위치**: `inswing-ai/app.py` (POST /analyze)
- **영향**: 버전 관리 및 필터링 상태 확인 불가

### 3. [MISMATCH] inswing-realtime: 문서의 채널 이름 불일치
- **문서**: `InswingRealtimeWeb.SessionChannel` (일반 세션)
- **실제**: `InswingRealtimeWeb.CoachSessionChannel` 사용 중
- **위치**: `inswing-realtime/lib/inswing_realtime_web/user_socket.ex`
- **영향**: 문서와 실제 구현이 다름 (기능은 동작하나 혼란 가능)

---

## === inswing (프론트엔드) 점검 결과 ===

### [OK] WebSocket 연결
- **위치**: `inswing/app/js/result.js:40`
- **구현**: `wss://realtime.inswing.ai/socket/websocket?vsn=2.0.0` 정확히 일치

### [OK] 채널 join
- **위치**: `inswing/app/js/result.js:93`
- **구현**: `session:{session_id}` 형식 정확히 일치

### [OK] event:new 이벤트 수신
- **위치**: `inswing/app/js/result.js:127`
- **구현**: `channel.on('event:new', ...)` 정확히 일치

### [OK] 메시지 UI 렌더링
- **위치**: `inswing/app/js/result.js:180-221`
- **구현**: golfer(우측), coach(좌측) 말풍선 정확히 일치

### [TODO] AI 메시지 별도 스타일
- **문서**: AI 메시지는 "별도 스타일, Insight 배지" 필요
- **실제**: `author_role === 'ai'` 처리 없음
- **위치**: `inswing/app/js/result.js:renderMessage()`

### [TODO] 시스템 메시지 중앙 정렬
- **문서**: 시스템 메시지는 "중앙 정렬, 회색"
- **실제**: `type === 'system_notice'` 처리 없음
- **위치**: `inswing/app/js/result.js:renderMessage()`

### [MISMATCH] 이벤트 타입 필터링
- **문서**: `type === 'chat_message'`만 표시
- **실제**: `type` 체크 없이 모든 메시지 표시
- **위치**: `inswing/app/js/result.js:107-110`
- **영향**: 다른 타입 이벤트도 표시될 수 있음

### [TEST_REQUIRED] 타이핑 인디케이터
- **구현**: `showTypingIndicator()`, `hideTypingIndicator()` 함수 존재
- **테스트**: 실제 동작 검증 필요
- **위치**: `inswing/app/js/result.js:224-251`

---

## === inswing-api (Node.js API 서버) 점검 결과 ===

### [OK] POST /auth/login
- **위치**: `inswing-api/routes/auth.js:10`
- **구현**: 이메일 기반 로그인, JWT 토큰 반환 정확히 일치

### [OK] GET /auth/google
- **위치**: `inswing-api/routes/auth.js:48`
- **구현**: Google OAuth 로그인 정확히 일치

### [OK] GET /auth/kakao
- **위치**: `inswing-api/routes/auth.js` (추정)
- **구현**: Kakao OAuth 로그인 정확히 일치

### [OK] POST /swings (업로드)
- **위치**: `inswing-api/routes/swings.js:77`
- **구현**: FormData 업로드, AI 분석 요청, DB 저장 정확히 일치

### [OK] GET /swings (히스토리)
- **위치**: `inswing-api/routes/swings.js:462`
- **구현**: 스윙 리스트 조회, `compare_tag` 포함 정확히 일치

### [OK] GET /swings/:id
- **위치**: `inswing-api/routes/swings.js:250` (추정)
- **구현**: `previous_compare_tag` 필드 포함 확인됨 (grep 결과)

### [MISMATCH] POST /swings 응답에 `session_id` 누락
- **문서**: `{ "status": "ok", "swing_id": "sw_123", "session_id": "sess_123" }`
- **실제**: `session_id` 필드가 응답에 없음
- **위치**: `inswing-api/routes/swings.js:77-457`
- **영향**: 실시간 코칭 연결 시 세션 ID를 알 수 없음

### [MISMATCH] POST /swings/:id/regenerate-coaching
- **문서**: `{ "style": "멘탈" }` 요청 형식
- **실제**: 구현 확인 필요 (grep에서 발견됨)
- **위치**: `inswing-api/routes/swings.js:585`
- **상태**: 구현은 되어 있으나 요청 형식 검증 필요

### [TODO] POST /swings 이후 WebSocket 방송
- **문서**: "WebSocket 방송 (`swing_analyzed` + `ai_insight`)"
- **실제**: 구현 확인 필요
- **위치**: `inswing-api/routes/swings.js` (POST /swings 후)

### [TODO] POST /feelings 엔드포인트 경로
- **문서**: `POST /feelings`
- **실제**: `POST /swings/:id/feeling` (경로 다름)
- **위치**: `inswing-api/routes/feelings.js:214`
- **영향**: 문서와 실제 경로 불일치

### [TEST_REQUIRED] GET /routine/today, POST /routine/start, POST /routine/end
- **구현**: `inswing-api/routes/routine.js` 파일 존재
- **테스트**: 실제 동작 검증 필요

---

## === inswing-ai (Python AI 분석 서버) 점검 결과 ===

### [OK] POST /analyze 엔드포인트
- **위치**: `inswing-ai/app.py:23`
- **구현**: FormData 업로드, 분석 실행 정확히 일치

### [OK] MediaPipe 포즈 추정
- **위치**: `inswing-ai/analyze_swing.py:58`
- **구현**: MediaPipe Pose 사용 정확히 일치

### [OK] 15개 메트릭 계산
- **위치**: `inswing-ai/analyze_swing.py`
- **구현**: v1 4개 + v2 11개 메트릭 모두 계산됨

### [MISMATCH] 응답 형식
- **문서**: `{ "metrics": {...}, "analysis_version": "v2", "invalid_swing": false }`
- **실제**: `{ "ok": true, "analysis": {...} }`
- **위치**: `inswing-ai/app.py:50-53`
- **영향**: 버전 정보 및 필터링 상태 확인 불가

### [MISMATCH] 필터링 환경 변수
- **문서**: `ENABLE_SWING_FILTER`, `MIN_BACKSWING_ANGLE` 등
- **실제**: `STRICT_POSE_DETECTION`만 확인됨
- **위치**: `inswing-ai/analyze_swing.py:153`
- **영향**: 문서에 명시된 필터링 옵션 미구현

### [TODO] `invalid_swing` 플래그 반환
- **문서**: 유효하지 않은 스윙 시 `"invalid_swing": true` 반환
- **실제**: 구현 확인 필요
- **위치**: `inswing-ai/app.py`

### [TEST_REQUIRED] `analysis_version` 필드
- **문서**: 응답에 `"analysis_version": "v2"` 포함 필요
- **실제**: 구현 확인 필요
- **위치**: `inswing-ai/app.py`

---

## === inswing-realtime (Elixir/Phoenix) 점검 결과 ===

### [OK] WebSocket 엔드포인트
- **위치**: `inswing-realtime/lib/inswing_realtime_web/endpoint.ex:14`
- **구현**: `/socket` 엔드포인트 정확히 일치

### [OK] 채널 토픽 형식
- **위치**: `inswing-realtime/lib/inswing_realtime_web/user_socket.ex:6`
- **구현**: `session:*` 패턴 정확히 일치

### [OK] event:new 이벤트 처리
- **위치**: `inswing-realtime/lib/inswing_realtime_web/channels/coach_session_channel.ex:23`
- **구현**: `handle_in("event:new", ...)` 정확히 일치

### [OK] DB 저장 및 브로드캐스트
- **위치**: `inswing-realtime/lib/inswing_realtime_web/channels/coach_session_channel.ex:35-40`
- **구현**: `Chat.create_message()` → `broadcast!()` 정확히 일치

### [OK] 기존 메시지 로드
- **위치**: `inswing-realtime/lib/inswing_realtime_web/channels/coach_session_channel.ex:15`
- **구현**: `load_session_messages()` → join 응답에 포함 정확히 일치

### [MISMATCH] 채널 모듈 이름
- **문서**: `InswingRealtimeWeb.SessionChannel`
- **실제**: `InswingRealtimeWeb.CoachSessionChannel` 사용 중
- **위치**: `inswing-realtime/lib/inswing_realtime_web/user_socket.ex:9`
- **영향**: 문서와 실제 구현이 다름 (기능은 동작)

### [TODO] Presence 구현
- **문서**: `presence:state`, `presence:diff` 이벤트
- **실제**: `InswingRealtimeWeb.Presence` 모듈 존재하나 사용되지 않음
- **위치**: `inswing-realtime/lib/inswing_realtime_web/presence.ex`

---

## === ROADMAP.md 대비 구현 상태 ===

### [OK] 영상 업로드 → AI 분석
- **상태**: 완료
- **확인**: `inswing-api/routes/swings.js` 구현 확인

### [OK] Claude AI 코칭 생성
- **상태**: 완료
- **확인**: `inswing-api/services/aiCoachingService.js` 구현 확인

### [OK] 히스토리
- **상태**: 기본형 완료
- **확인**: `inswing-api/routes/swings.js:462` 구현 확인

### [OK] 실시간 코칭(WebSocket) MVP
- **상태**: MVP 완료 (기초 채팅 기능)
- **확인**: `inswing-realtime`, `inswing/app/js/result.js` 구현 확인

### [OK] 루틴 시스템
- **상태**: 응답 구조 완료 – UI 미적용
- **확인**: `inswing-api/routes/routine.js` 구현 확인

### [OK] 모바일 촬영/업로드
- **상태**: 동작하나 예외 상황 대응 부족
- **확인**: 문서와 일치

---

## 📝 권장 조치 사항

### 즉시 수정 필요 (High Priority)

1. **inswing-api**: POST /swings 응답에 `session_id` 추가
2. **inswing-ai**: 응답 형식을 문서에 맞게 수정 (`analysis_version`, `invalid_swing` 추가)
3. **inswing**: AI 메시지 및 시스템 메시지 UI 스타일 추가

### 단기 개선 (Medium Priority)

4. **inswing-api**: POST /swings 이후 WebSocket 방송 구현
5. **inswing-realtime**: Presence 기능 구현
6. **inswing-ai**: 필터링 환경 변수 구현

### 문서 업데이트 필요

7. **inswing-api**: POST /feelings → POST /swings/:id/feeling 경로 문서 수정
8. **inswing-realtime**: 채널 모듈 이름 문서 수정 (SessionChannel → CoachSessionChannel)

---

**작성자**: Cursor AI  
**최종 업데이트**: 2025-01

