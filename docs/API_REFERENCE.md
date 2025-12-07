목적: INSWING 백엔드 서버(inswing-api)의 REST API 엔드포인트, 요청/응답 형식, 인증 규칙을 문서화하여 개발자 및 클라이언트 구현자가 일관된 방식으로 접근할 수 있도록 한다.
최종 업데이트: 2025-01

📋 목차

기본 정보

인증

공통 규칙

엔드포인트 상세

Auth

Swings

Feelings

Routine

오류 응답 규격

버전 정책

변경 이력

1. 기본 정보
항목	값
Base URL	https://api.inswing.ai
Content-Type	application/json
Auth 방식	JWT (Bearer Token)
업로드 방식	FormData (영상 파일 업로드 시)

테스트용 로컬 URL

http://localhost:4000

2. 인증
로그인 방식
구분	방식
이메일 로그인	POST /auth/login
Google OAuth	GET /auth/google
Kakao OAuth	GET /auth/kakao
JWT 헤더 규칙
Authorization: Bearer {토큰}

인증 실패 응답
{ "error": "Unauthorized" }

3. 공통 규칙
성공 응답 공통 키
필드	설명
status	성공 여부 (ok)
data	결과 데이터
message	추가 정보 (선택)

예시

{ "status": "ok", "data": {...} }

4. 엔드포인트 상세
🔹 Auth
POST /auth/login

이메일 기반 로그인

Request

{
  "email": "test@test.com",
  "password": "1234"
}


Response

{
  "status": "ok",
  "token": "JWT_TOKEN",
  "user": {
    "id": 12,
    "email": "test@test.com",
    "name": "Ian"
  }
}

GET /auth/google

Google OAuth 로그인

GET /auth/kakao

Kakao OAuth 로그인

🔹 Swings
POST /swings

스윙 업로드 → AI 분석 → AI 코칭 생성

FormData 필드

이름	타입	설명
file	video	스윙 영상
club	string	사용 클럽
feeling	string	사용자 느낌 (선택)

응답 예시

{
  "status": "ok",
  "swing_id": "sw_123",
  "session_id": "sess_123"
}


이후 처리 플로우

inswing-api → inswing-ai 분석 요청

메트릭 저장

Claude AI 코칭 생성

WebSocket 방송 (swing_analyzed + ai_insight)

GET /swings

스윙 히스토리 조회

Response

{
  "status": "ok",
  "data": [
    {
      "id": "sw_123",
      "created_at": "2025-01-05",
      "metrics": { ... },
      "compare_tag": "밸런스 개선"
    }
  ]
}

GET /swings/:id

스윙 상세 조회

Response

{
  "status": "ok",
  "data": {
    "id": "sw_123",
    "video_url": "...",
    "metrics": { ... },
    "coaching": "...",
    "previous_compare_tag": "임팩트 안정"
  }
}

POST /swings/:id/regenerate-coaching

Claude 기반 코칭 재생성

Request

{ "style": "멘탈" }

🔹 Feelings
POST /feelings

스윙 느낌 저장

Request

{
  "swing_id": "sw_123",
  "feeling": "어깨가 덜 따라붙는 느낌"
}

🔹 Routine
GET /routine/today

오늘의 훈련 루틴 조회

POST /routine/start

루틴 시작

POST /routine/end

루틴 종료

5. 오류 응답 규격
코드	의미
400	잘못된 요청
401	인증 실패
403	권한 없음
404	자원 없음
500	서버 오류

에러 응답 예시

{
  "status": "error",
  "message": "Invalid swing_id"
}

6. 버전 정책

INSWING은 Payload 구조는 유지하고 필드 확장 방식으로 업데이트한다.

변경	허용	비허용
필드 추가	✔	
필드 삭제		❌
필드 이름 변경		❌
타입 변경		❌
7. 변경 이력
날짜	내용	작성자
2025-01	최초 문서 작성	Brown