보완 포인트 (작업 중심 관점)
① “이 문서를 읽은 후 커서가 해야 할 일”을 더 명확히 표시

지금 문서는 구조 설명이 완벽하지만,
커서가 지금 어떤 행동을 해야 하는지는 흐려져 있습니다.

→ 아래 한 줄이 처음에 들어가면 완벽:

🔥 현재 Cursor의 1차 작업 영역은 inswing-realtime이며, Brown이 제공한 Step1 지시서에 따라 채널 + Presence + user_socket을 구현하는 것이 목표입니다.

② 서버/배포 관련 “하지 말아야 할 일” 명시

커서가 간혹 배포/서버 설정까지 건드리면 운영이 꼬일 수 있으므로,
아래 4줄이 있으면 실전에서 훨씬 안정적입니다:

🚫 Cursor는 SSH 접속/서버 수정/PM2/Nginx 설정/git pull/systemctl restart를 하지 않습니다.
Cursor는 로컬에서 개발 → GitHub push까지 담당합니다.
배포는 Ian이 스크립트(deploy-realtime, deploy-api, deploy-ai)로 처리합니다.

✨ Brown 버전 — 커서 안내 문서 최종 완성본 (붙여넣어도 됨)
INSWING 프로젝트 아키텍처 & CURSOR 작업 가이드
🏁 현재 Cursor의 1차 작업 목표

inswing-realtime 리포지토리에서 Step1을 구현합니다.
내용: session:* 채널 + Presence + "chat:new/added" + user_socket 수정

코드는 Brown이 제공한 Step1 지시서를 기준으로 작성합니다.

커서의 역할은 로컬 개발 → GitHub push까지입니다.
배포는 Ian이 담당합니다.

📦 전체 프로젝트 구조

(→ 여기에는 커서가 작성한 아키텍처 원본 그대로 유지해도 됨)

[생략] — 정리 내용 100% 정확하므로 손댈 필요 없음

🚫 하지 말아야 할 작업 (중요)
항목	담당
SSH 서버 접속	Ian
서버 코드 수정	Ian
git pull / systemctl restart / PM2	Ian
Nginx 수정 / AWS 설정 변경	Ian
설계 문서/지시서 작성	Brown
inswing-realtime 코드 개발	Cursor

커서는 코드 생산에만 집중하면 됩니다.

🌍 배포/동기화 방식
리포지토리	배포 방식
inswing (프론트)	GitHub Actions 자동 업로드
inswing-api	Ian: deploy-api
inswing-ai	Ian: deploy-ai
inswing-realtime	Ian: deploy-realtime
🔥 개발 루프 (INSWING의 협업 핵심)
Brown → Step 지시서 설계
↓
Cursor → 로컬에서 개발 → GitHub push
↓
Ian → 서버에서 배포 스크립트 실행