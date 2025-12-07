# GitHub 동기화 가이드

통합 문서로 정리한 후 GitHub와 동기화하는 방법입니다.

## 📋 삭제된 파일 목록

다음 파일들이 `INSWING_PROJECT_DOCUMENTATION.md`로 통합되어 삭제되었습니다:

- `inswing-api/PROJECT_ARCHITECTURE.md`
- `inswing-api/docs/realtime-coaching-events.md`
- `inswing-realtime/AGENTS.md`
- `inswing-api/LOG_README.md`
- `inswing-ai/SWING_FILTER_GUIDE.md`
- `inswing-api/EC2_LOG_GUIDE.md`
- `inswing-api/scripts/VIEW_LOGS_GUIDE.md`

## 🔄 GitHub 동기화 방법

### 1️⃣ 변경사항 확인

```bash
# 현재 디렉토리에서 실행 (C:\ian)
git status
```

변경사항 확인:
- 삭제된 파일들 (Deleted)
- 새로 추가된 파일 (`INSWING_PROJECT_DOCUMENTATION.md`)

### 2️⃣ 변경사항 스테이징

**방법 A: 모든 변경사항 한번에 추가**
```bash
git add -A
```

**방법 B: 개별 파일 추가**
```bash
# 삭제된 파일들 스테이징
git add inswing-api/PROJECT_ARCHITECTURE.md
git add inswing-api/docs/realtime-coaching-events.md
git add inswing-realtime/AGENTS.md
git add inswing-api/LOG_README.md
git add inswing-ai/SWING_FILTER_GUIDE.md
git add inswing-api/EC2_LOG_GUIDE.md
git add inswing-api/scripts/VIEW_LOGS_GUIDE.md

# 새로 추가된 통합 문서
git add INSWING_PROJECT_DOCUMENTATION.md
```

### 3️⃣ 커밋 메시지 작성

```bash
git commit -m "docs: 통합 문서로 정리 및 중복 문서 삭제

- INSWING_PROJECT_DOCUMENTATION.md 통합 문서 생성
- 중복된 문서들 삭제:
  - inswing-api/PROJECT_ARCHITECTURE.md
  - inswing-api/docs/realtime-coaching-events.md
  - inswing-realtime/AGENTS.md
  - inswing-api/LOG_README.md
  - inswing-ai/SWING_FILTER_GUIDE.md
  - inswing-api/EC2_LOG_GUIDE.md
  - inswing-api/scripts/VIEW_LOGS_GUIDE.md"
```

### 4️⃣ GitHub에 푸시

**메인 브랜치가 main인 경우:**
```bash
git push origin main
```

**메인 브랜치가 master인 경우:**
```bash
git push origin master
```

**현재 브랜치 확인:**
```bash
git branch
```

**현재 브랜치 이름으로 푸시:**
```bash
git push origin HEAD
```

## 🔍 전체 프로세스 (한번에 실행)

```bash
# 1. 상태 확인
git status

# 2. 모든 변경사항 스테이징
git add -A

# 3. 커밋
git commit -m "docs: 통합 문서로 정리 및 중복 문서 삭제"

# 4. 푸시
git push origin main
```

## ⚠️ 주의사항

### 여러 리포지토리인 경우

만약 각 프로젝트가 별도의 Git 리포지토리라면, 각각 푸시해야 합니다:

```bash
# inswing-api 리포지토리
cd inswing-api
git add -A
git commit -m "docs: 통합 문서로 정리"
git push origin main

# inswing-realtime 리포지토리
cd ../inswing-realtime
git add -A
git commit -m "docs: AGENTS.md 삭제 (통합 문서로 이동)"
git push origin main

# inswing-ai 리포지토리
cd ../inswing-ai
git add -A
git commit -m "docs: SWING_FILTER_GUIDE.md 삭제 (통합 문서로 이동)"
git push origin main

# 루트 리포지토리 (통합 문서)
cd ..
git add INSWING_PROJECT_DOCUMENTATION.md
git commit -m "docs: 프로젝트 통합 문서 추가"
git push origin main
```

### 리포지토리 구조 확인

```bash
# 각 폴더가 Git 리포지토리인지 확인
cd inswing-api
git status  # Git 리포지토리면 상태 표시, 아니면 오류

cd ../inswing-realtime
git status

cd ../inswing-ai
git status

cd ..
git status  # 루트도 Git 리포지토리인지 확인
```

## 📝 커밋 메시지 예시

### 간단한 버전
```bash
git commit -m "docs: 통합 문서로 정리"
```

### 상세한 버전
```bash
git commit -m "docs: 프로젝트 문서 통합 및 정리

- INSWING_PROJECT_DOCUMENTATION.md 통합 문서 생성
  - 프로젝트 전체 아키텍처
  - 서비스별 상세 가이드
  - 실시간 코칭 시스템
  - 개발 가이드
  - 운영 및 배포 가이드

- 중복 문서 삭제:
  * inswing-api/PROJECT_ARCHITECTURE.md
  * inswing-api/docs/realtime-coaching-events.md
  * inswing-realtime/AGENTS.md
  * inswing-api/LOG_README.md
  * inswing-ai/SWING_FILTER_GUIDE.md
  * inswing-api/EC2_LOG_GUIDE.md
  * inswing-api/scripts/VIEW_LOGS_GUIDE.md

모든 내용이 INSWING_PROJECT_DOCUMENTATION.md에 통합되었습니다."
```

## ✅ 확인 방법

푸시 후 GitHub에서 확인:

1. GitHub 저장소 접속
2. `INSWING_PROJECT_DOCUMENTATION.md` 파일이 추가되었는지 확인
3. 삭제된 파일들이 제거되었는지 확인
4. 커밋 히스토리에서 변경사항 확인

## 🔄 되돌리기 (필요시)

만약 실수로 삭제했다면:

```bash
# 마지막 커밋 취소 (파일은 복구됨)
git reset --soft HEAD~1

# 또는 특정 파일만 복구
git checkout HEAD -- inswing-api/PROJECT_ARCHITECTURE.md
```

