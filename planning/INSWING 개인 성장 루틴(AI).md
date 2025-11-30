1. 컨셉: “오늘의 루틴 카드” 기반 성장 시스템
목표

그냥 “스윙 분석 앱”이 아니라
**“나의 골프 성장 일지 + AI 코치”**가 되게 만드는 것.

매번 영상 올릴 때마다:

오늘 상태 체크

AI가 한두 개의 핵심 포인트만 잡아줌

시간이 지나면 내 약점/강점 패턴이 자동으로 보이는 구조

핵심 아이디어

매일/매 라운드마다 “오늘의 루틴 카드” 1장 생성

오늘 컨디션/목표

AI가 뽑은 오늘의 핵심 포인트(1~2개)

오늘 업로드한 스윙들의 요약

오늘의 느낌/메모

2. 데이터와 AI 로직 (이미 있는 것 활용)

이미 우리가 가지고 있는 데이터:

swings 테이블

club_type, shot_side, created_at

metrics (backswing, tempo_ratio, head_movement_pct, overall_score 등)

AI comment

feeling (feeling_code + note)

2-1. 루틴용 “태그” 자동 추출

각 스윙마다 AI가 포커스 태그를 갖도록:

예:

balance, head_stable, tempo_fast, tempo_good,

rotation_good, distance_focus, finish_weak 등

생성 방법(단순 룰 + 코멘트 키워드 혼합):

head_movement_pct > 40 → head_unstable

tempo_ratio < 1 → tempo_fast

tempo_ratio가 3±0.5 → tempo_good

balance_score >= 0.98 → balance_good

AI comment에 “밸런스”, “머리”, “템포”, “회전”, “비거리”, “불안” 등 들어가면 각각 대응 태그 추가

이 태그를 기반으로 “나의 반복되는 패턴”을 뽑는다.

2-2. 개인 성장 루틴 엔진 (간단 버전)

최근 N일(예: 14일) 데이터로:

문제 Top2

가장 자주 나타나는 “약점 태그” 2개

강점 Top1

가장 자주 나타나는 “강점 태그” 1개

베스트 스윙 샘플

overall_score 상위 + feeling이 perfect 또는 good 인 스윙 1~2개

→ 이 3가지를 가지고 오늘 루틴 문장을 만든다:

“최근 2주간, 머리 흔들림과 템포가 반복되는 약점으로 나타나고 있어요.
오늘은 ‘머리 고정’과 ‘3:1 템포’만 신경 쓰는 루틴을 제안합니다.”

3. 사용자 흐름 (Routine v1)
3-1. 오늘 시작 화면 (routine.html 또는 메인)

사용자가 로그인 → 루틴 홈 진입

상단:

“이번 달 나의 루틴 진행도” (간단한 막대/원형)

중앙 카드: 오늘의 루틴

오늘의 목표 (텍스트 1줄)

AI가 추천한 핵심 포인트 1~2개

“오늘 루틴 시작하기” 버튼

3-2. 루틴 시작 시

사용자가 간단히 입력:

오늘 상태 체크:

컨디션: 좋음 / 보통 / 피곤

오늘 플레이: 필드 / 연습장 / 스크린

오늘 목표: 비거리 / 방향성 / 스코어 / 리듬 등 중 택1

→ POST /routine/checkin (오늘의 메타 정보 저장)

3-3. 스윙 업로드 & 분석 (지금 기능 그대로 사용)

사용자는 평소처럼 upload.html에서 스윙 업로드

result.html에서:

AI 코멘트

메트릭

느낌(feeling + note)

→ 이 데이터가 쌓이면서, 루틴 엔진이 계속 업데이트됨.

3-4. 루틴 종료 & 회고

하루 마지막에(또는 사용자가 버튼 클릭):

“오늘 루틴 마무리” 카드:

오늘 업로드한 스윙 개수

오늘 평균 점수 / 최고 점수

오늘 느낌 요약 (feeling_code 통계)

AI가 한 줄 코멘트:

예: “오늘은 전체적으로 밸런스는 좋았지만, 머리 흔들림이 남아 있었습니다. 다음엔 머리 위치만 집중해볼까요?”

→ POST /routine/feedback 으로 저장.

4. 화면 구성 (페이지 기준)
4-1. 루틴 홈 (routine.html)

상단 히어로 영역

“Ian 님의 INSwing 성장 루틴”

이번 달 업로드 수 / 평균 점수 / 최고의 날 한 줄 요약

오늘의 루틴 카드

오늘의 목표

오늘의 포커스 태그 뱃지 (예: 머리 고정, 템포, 피니시)

“루틴 시작” / “오늘 마무리” 버튼

최근 7일 그래프

overall_score / head_movement / tempo_ratio 등 중 택2

간단한 라인 차트

나의 대표 스윙

베스트 스윙 썸네일 + 점수 + date

클릭 시 result.html?id=...

4-2. 프리미엄 전환 포인트

루틴 홈의 일부 기능은 무료:

오늘 루틴 카드 간단 버전

최근 7일 간 스윙 수

프리미엄에서만:

상세 그래프, 태그 트렌드

“나의 약점 Top3 / 강점 Top3”

기간 비교(이번 달 vs 지난 달)

5. API / DB 설계 초안
5-1. 신규 테이블 (제안)

daily_routines

id

user_id

date (YYYY-MM-DD)

condition (good / normal / tired)

goal_type (distance / accuracy / score / rhythm …)

focus_tags (JSON 배열)

summary_comment (AI가 적는 하루 요약)

created_at, updated_at

routine_checkins (원하면 분리)

오늘 시작 기록(상태, 장소 등)

v1에서는 daily_routines 하나로도 충분히 시작 가능.

5-2. 주요 API

GET /routine/today

오늘 루틴 카드 정보 + 추천 포커스 태그

POST /routine/checkin

오늘의 컨디션/목표 입력

POST /routine/feedback

하루 마무리 요약 저장 (선택)

GET /routine/summary?range=30d

최근 30일 통계(그래프용)

6. 이제 실제 작업 순서 제안

지금 프론트·API 상황 기준으로 구현 단계를 이렇게 나누면 좋겠다:

1️⃣ 루틴 로직 없이 “루틴 홈 UI”만 먼저 만들기

routine.html 생성

“오늘의 루틴 카드”에 dummy data로 문구/태그 뿌리기

최근 7일 통계는 나중에 API 만들고 연결

2️⃣ 루틴 엔진 v0 (서버에서 최근 N개 스윙 통계만 계산)

GET /routine/today → 약점/강점 태그 2~3개 + 한 줄 코멘트 리턴

프론트는 이걸 받아서 카드에 표시

3️⃣ checkin / feedback 저장 기능

오늘 컨디션/목표 입력 + 하루 마무리 메모 저장

이후 프리미엄 통계의 기반 데이터

7. 다음에 우리가 할 것

바로 이어서 할 작업을 3개 옵션으로 줄게.
Ian이 숫자만 골라주면, 그걸 바로 설계/코드로 풀어줄게.

1번. routine.html UI 뼈대 전체 HTML/CSS/JS 작성
2번. GET /routine/today API 설계 + 예시 JSON + 서버 로직 초안
3번. 태그 규칙표 (metrics/코멘트 → focus_tag 리스트)만 먼저 정리