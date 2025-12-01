# 📋 INSWING 주간 작업 TODO

> **이번 주 목표**: AI 코칭 시스템 Level 1 시작 + 안정화 작업

---

## 🎯 이번 주 핵심 목표

1. **AI 코칭 시스템 Level 1 기초 작업**
2. **버그 수정 및 안정화**
3. **UX 개선 (로딩, 진행률)**

---

## 📅 Day 1 (오늘) - AI 코칭 시스템 준비

### ✅ Anthropic 계정 및 API 설정
- [x] Anthropic 계정 생성
  - [x] https://console.anthropic.com 접속
  - [x] 회원가입 완료 01087204162@gmail.com
- [x] API 키 발급
  - [x] Console → API Keys → Create Key
  - [x] API 키 복사 및 안전하게 보관
- [ ] 크레딧 충전
  - [ ] $20 충전 (약 6,000스윙 분석 가능)
  - [ ] 결제 정보 확인

### ✅ 개발 환경 설정
- [x] `inswing-api` 폴더로 이동
- [x] 패키지 설치
  ```bash
  npm install @anthropic-ai/sdk
  ```
-- [x] 환경 변수 추가
  - [x] `.env` 파일 열기
  - [x] 다음 내용 추가:
    ```
    ANTHROPIC_API_KEY=sk-ant-your-key-here
    USE_AI_COACHING=true
    ```
- [ ] Git에 커밋 (`.env`는 제외)
  ```bash
  git add package.json package-lock.json
  git commit -m "feat: Add Anthropic SDK for AI coaching"
  ```

### ✅ 기본 테스트 파일 작성
- [x] `services/aiCoachingService.js` 파일 생성
- [x] 기본 API 연결 테스트 코드 작성
- [x] 테스트 실행
  ```bash
  node -e "require('./services/aiCoachingService').testConnection().then(console.log)"
  ```
- [x] 한국어 응답 확인

**예상 소요 시간**: 2-3시간

---

## 📅 Day 2 - AI 코칭 서비스 구현

### ✅ AI 코칭 서비스 개발
- [x] `services/aiCoachingService.js` 완성
  - [x] `callClaudeAPI()` 함수 구현 (재시도, 타임아웃 포함)
  - [x] `generateCoaching()` 함수 구현
  - [x] 헬퍼 함수 작성 (클럽명, 방향명 한글 변환)
  - [x] 에러 핸들링 추가
  - [ ] 로깅 함수 추가

### ✅ 프롬프트 v1 작성
- [x] 기본 프롬프트 템플릿 작성
- [x] 메트릭 데이터 포맷팅
- [x] 느낌 코드 반영 로직
- [ ] 테스트 케이스 작성 (좋은 스윙, 나쁜 스윙, 느낌 불일치)

### ✅ 수동 테스트
- [ ] 다양한 메트릭으로 테스트
- [ ] 응답 품질 확인
- [ ] 에러 케이스 테스트

**예상 소요 시간**: 4-5시간

---

## 📅 Day 3 - 백엔드 통합

### ✅ routes/swings.js 수정
- [x] AI 코칭 서비스 import
- [x] 스윙 업로드 시 AI 코칭 생성 로직 추가
- [x] Fallback 로직 구현 (규칙 기반 코멘트)
- [x] 환경 변수 토글 확인 (`USE_AI_COACHING`)
- [x] 에러 처리 강화

### ✅ 테스트
- [ ] 실제 스윙 업로드 테스트
- [ ] AI 코칭 생성 확인
- [ ] Fallback 동작 확인
- [ ] 성능 측정 (응답 시간)

### ✅ 로깅 시스템
- [ ] `logs/` 폴더 생성
- [ ] AI 코칭 로그 파일 생성
- [ ] 성능 로그 추가

**예상 소요 시간**: 3-4시간

---

## 📅 Day 4 - 프론트엔드 개선

### ✅ result.html 개선
- [ ] AI 코칭 카드 UI 추가
- [ ] 타이핑 애니메이션 효과
- [ ] "다시 생성" 버튼 기능
- [ ] 로딩 상태 표시

### ✅ history.html 개선
- [ ] AI 코칭 미리보기 추가
- [ ] 코칭 스니펫 표시 (60자 제한)

### ✅ upload.html 개선
- [ ] 업로드 진행률 표시 (Progress Bar)
- [ ] 단계별 로딩 메시지
  - "영상 업로드 중..."
  - "AI가 스윙을 분석하는 중..."
  - "코치가 피드백을 작성하는 중..."

**예상 소요 시간**: 4-5시간

---

## 📅 Day 5 - 테스트 및 버그 수정

### ✅ 통합 테스트
- [ ] 전체 플로우 테스트 (업로드 → 분석 → 결과)
- [ ] 다양한 케이스 테스트
  - [ ] 좋은 스윙
  - [ ] 나쁜 스윙
  - [ ] 느낌과 데이터 불일치
  - [ ] AI 서버 장애 시나리오

### ✅ 버그 수정
- [ ] 발견된 버그 수정
- [ ] 에러 메시지 개선
- [ ] 사용자 친화적 메시지로 변경

### ✅ 성능 최적화
- [ ] 응답 시간 측정
- [ ] 병목 지점 파악
- [ ] 최적화 적용

**예상 소요 시간**: 3-4시간

---

## 📅 Day 6-7 - 추가 개선 및 배포

### ✅ 추가 개선
- [ ] 모바일 반응형 점검
- [ ] 브라우저 호환성 테스트
- [ ] 접근성 개선

### ✅ 문서화
- [ ] API 문서 업데이트
- [ ] 개발 가이드 작성
- [ ] 배포 가이드 작성

### ✅ 배포 준비
- [ ] Git 커밋 및 푸시
- [ ] EC2 서버 배포
- [ ] 프로덕션 테스트

**예상 소요 시간**: 2-3시간

---

## 🔥 우선순위 높은 작업 (즉시 시작)

### 1. AI 코칭 시스템 기초
```bash
# 1. Anthropic 계정 생성
https://console.anthropic.com

# 2. 패키지 설치
cd inswing-api
npm install @anthropic-ai/sdk

# 3. 환경 변수 추가
# .env 파일에 추가
ANTHROPIC_API_KEY=sk-ant-...
USE_AI_COACHING=true
```

### 2. 버그 수정
- [ ] AI 분석 서버 타임아웃 처리
- [ ] 에러 핸들링 강화
- [ ] 로깅 시스템 구축

### 3. UX 개선
- [ ] 업로드 진행률 표시
- [ ] 로딩 애니메이션 개선

---

## 📊 진행 상황 추적

### 이번 주 완료율
- [ ] Day 1: Anthropic 설정 (0%)
- [ ] Day 2: AI 코칭 서비스 (0%)
- [ ] Day 3: 백엔드 통합 (0%)
- [ ] Day 4: 프론트엔드 개선 (0%)
- [ ] Day 5: 테스트 및 버그 수정 (0%)
- [ ] Day 6-7: 배포 준비 (0%)

### 블로커 (막히는 일)
- 없음

### 다음 주 계획
- 프롬프트 A/B 테스트
- 베타 테스터 모집
- 피드백 수집 및 개선

---

## 💡 팁

### 작업 시작 전 체크리스트
- [ ] Git 최신 상태 확인 (`git pull`)
- [ ] 브랜치 생성 (`git checkout -b feature/ai-coaching`)
- [ ] 환경 변수 확인 (`.env` 파일)

### 작업 완료 후 체크리스트
- [ ] 코드 커밋 (`git add . && git commit -m "..."`)
- [ ] 테스트 실행
- [ ] 문서 업데이트

### 일일 회고
- 오늘 완료한 작업
- 내일 할 작업
- 막힌 부분이나 질문

---

## 📞 참고 자료

- [개발 계획서](./DEVELOPMENT_PLAN.md)
- [AI 코칭 시스템 계획](./task2.md)
- [프론트 고도화 작업](./tasks.md)

---

**작성일**: 2025년 1월  
**업데이트**: 매일 진행 상황 반영

