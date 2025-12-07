INSWING_OVERVIEW.md

INSWING 프로젝트 통합 문서
최종 업데이트: 2025-01
목적: INSWING 플랫폼의 전체 구조·아키텍처·운영·개발 기준을 한 문서로 통합하여 협업 및 확장에 활용

📋 목차

프로젝트 개요

전체 아키텍처

서비스별 상세 설명

실시간 코칭 시스템

개발 가이드

운영 & 배포

참고 자료

프로젝트 개요

INSWING은 골프 스윙 분석 + 실시간 코칭을 결합한 혁신형 골프 트레이닝 플랫폼입니다.
4개의 독립적인 리포지토리로 구성된 모듈형 아키텍처를 채택하고 있습니다.

ian/
├── inswing/          # 프론트엔드 (HTML/JS)
├── inswing-api/      # 백엔드 API (Node.js/Express)
├── inswing-ai/       # AI 분석 서버 (Python/Flask)
└── inswing-realtime/ # 실시간 서버 (Elixir/Phoenix)

핵심 역할 요약
서비스	역할
inswing	UI · 화면 · 사용자 경험
inswing-api	비즈니스/데이터 중심
inswing-ai	스윙 영상을 메트릭으로 변환
inswing-realtime	실시간 코칭 · 채팅 · Presence
전체 아키텍처
기술 스택 요약
서비스	기술 스택	포트	주요 역할
inswing	HTML/JavaScript	-	프론트엔드
inswing-api	Node.js + Express	4000	REST API, DB
inswing-ai	Python + Flask	5000	AI 분석 엔진
inswing-realtime	Elixir + Phoenix	4100	WebSocket 실시간
데이터 흐름
User → inswing-api (POST /swings)
 ↓
inswing-api → inswing-ai (POST /analyze)
 ↓
AI 분석 → 결과 반환
 ↓
inswing-api → DB 저장 + Claude AI 코칭 생성
 ↓
inswing-realtime (HTTP 이벤트 전달)
 ↓
WebSocket 브로드캐스트 → 사용자 UI 반영

인프라 요약

AWS EC2 + Nginx + SSL

CloudFront(S3) 프론트 배포

PM2 프로세스 관리

도메인:

inswing.ai

api.inswing.ai

realtime.inswing.ai

서비스별 상세 설명
1️⃣ inswing-api
항목	내용
기술스택	Node.js + Express + MySQL
핵심 역할	업로드 처리 / DB / S3 / AI 코칭 / 루틴
인증	JWT + Google/Kakao OAuth

폴더 구조

routes/       → auth.js, swings.js, feelings.js, routine.js
services/     → aiCoachingService.js, commentService.js
config/       → cors.js, passport.js, s3.js
server.js     → API 진입점


대표 API

Endpoint	설명
POST /swings	스윙 업로드 → 분석 → 코칭 생성
GET /swings	스윙 히스토리
POST /swings/:id/regenerate-coaching	코칭 재생성
2️⃣ inswing-ai
항목	내용
기술스택	Python + Flask
분석엔진	MediaPipe + OpenCV
역할	스윙 영상 → 메트릭 15개 추출

폴더 구조

app.py
analyze_swing.py
requirements.txt


출력되는 메트릭 예시

backswing_angle

impact_speed

follow_through_angle

tempo_ratio

head_movement_pct
… 최대 15개

3️⃣ inswing (프론트엔드)
화면	설명
login.html	소셜 로그인
upload.html	스윙 업로드
result.html	분석 결과 & 실시간
history.html	과거 스윙 히스토리
routine.html	루틴/성장 화면

JS 핵심 파일

app/js/app.js        → API 유틸리티
app/js/result.js     → WebSocket & 실시간 코칭

4️⃣ inswing-realtime

| 기술 스택 | Elixir + Phoenix |
| 기능 | WebSocket, 채팅, Presence |

폴더 구조

lib/inswing_realtime_web/
 ├── user_socket.ex
 └── channels/
      ├── session_channel.ex
      └── coach_session_channel.ex


데이터 스키마

chat_messages (session_id, type, author_role, author_id, message, meta, timestamps)

실시간 코칭 시스템

핵심 개념

세션 = 수업방

역할 = golfer / coach / ai

채널 = session:{session_id}

WebSocket 이벤트 표준 payload

{
  "type": "chat_message",
  "session_id": "sess_123",
  "author_role": "golfer",
  "message": "테이크백이 높아졌나요?",
  "meta": {
    "swing_id": "sw_123",
    "ts": 1764936413351
  }
}


UI 동작

데스크톱 → 우측 실시간 코칭 패널

모바일 → 하단 슬라이딩 패널

개발 가이드
Cursor 개발 기준
항목	담당
서버 접속 / 배포	Ian
문서 / 설계	Brown
코드 생산 / 리팩터링	Cursor
운영 & 배포

PM2

pm2 restart inswing-api
pm2 restart inswing-ai
pm2 restart inswing-realtime


로그

inswing-api/logs/ai-coaching.log


Realtime 마이그레이션

mix ecto.migrate
MIX_ENV=prod mix release
systemctl restart inswing-realtime

참고 자료

Phoenix: https://hexdocs.pm/phoenix

MediaPipe: https://developers.google.com/mediapipe

Claude: https://docs.anthropic.com

Revision History
날짜	변경 내용	작성자
2025-01	최초 통합 문서 생성	Ian
2025-01	/docs 버전으로 변환	Brown