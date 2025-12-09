# AI_ENGINE

> **목적**: INSWING AI 분석 서버(inswing-ai)의 스윙 분석 구조, 메트릭 계산 방식, 필터링 기준, 버전 관리 체계를 문서화한다.

> **최종 업데이트**: 2025-01

---

## 📋 목차

1. [개요](#개요)
2. [AI 분석 처리 흐름](#ai-분석-처리-흐름)
3. [메트릭 계산](#메트릭-계산)
4. [스윙 유효성 검증 & 필터링](#스윙-유효성-검증--필터링)
5. [API I/O 구조](#api-io-구조)
6. [버전 정책](#버전-정책)
7. [확장 계획](#확장-계획)
8. [변경 이력](#변경-이력)

---

## 1. 개요

INSWING AI 분석 엔진은 MediaPipe Pose + OpenCV + NumPy 기반으로,
스윙 영상을 15개의 수치화된 메트릭(metric)으로 변환하고
이를 기반으로 API 서버 → Claude AI 코칭 생성을 트리거한다.

### 역할 요약

| 단계 | 담당 모듈 |
|------|----------|
| 프레임 추출 & 포즈 감지 | MediaPipe |
| 관절 위치 추출 | OpenCV |
| 모션/회전/밸런스 계산 | NumPy |
| 15개 메트릭 생성 | `analyze_swing.py` |
| 분석 결과 응답 | Flask `app.py` |

---

## 2. AI 분석 처리 흐름

```
inswing-api (POST /swings)
        ↓
inswing-ai (POST /analyze)
        ↓
MediaPipe 포즈 추정 수행
        ↓
점 데이터 → 15개 메트릭 계산
        ↓
JSON 응답
        ↓
inswing-api DB 저장 + AI 코칭 생성
```

모든 분석은 서버 내부에서 실시간 처리되며, GPU 사용 없이도 실행되도록 최적화되어 있다.

---

## 3. 메트릭 계산

### v1 핵심 메트릭 (4)

| 메트릭 | 설명 | 계산 방식 요약 |
|--------|------|---------------|
| `backswing_angle` | 백스윙 각도 | 어깨·팔·척추 각도로 계산 |
| `impact_speed` | 임팩트 전/후 프레임 속도 변화 | 손목/클럽헤드 이동 속도 |
| `follow_through_angle` | 팔로우스루 각도 | 임팩트 후 팔/어깨 회전 |
| `balance_score` | 체중 중심 안정성 | 골반·발 위치 변화량 기반 정규화 |

### v2 확장 메트릭 (11)

| 메트릭 | 설명 |
|--------|------|
| `tempo_ratio` | 백스윙:다운스윙 시간 비율 |
| `backswing_time_sec` | 백스윙 프레임/시간 |
| `downswing_time_sec` | 다운스윙 프레임/시간 |
| `head_movement_pct` | 임팩트 대비 머리 흔들림 비율 |
| `shoulder_rotation_range` | 어깨 회전 각도 범위 |
| `hip_rotation_range` | 골반 회전 각도 범위 |
| `rotation_efficiency` | 어깨 대비 골반 회전 효율 |
| `shoulder_span` | 어깨 간 거리 변동율 |
| `hip_shift` | 골반 좌우 이동량 |
| `vertical_stability` | 상체 높낮이 안정성 |
| `overall_score` | 0~100 종합 스코어 (정규화 평균) |

#### 📌 overall_score 기준

- **0~49** → 불안정
- **50~74** → 보통
- **75~89** → 우수
- **90~100** → 최상

---

## 4. 스윙 유효성 검증 & 필터링

**기본 설정**: 필터링 OFF — 모든 영상 허용

환경 변수로 활성화 가능:

```bash
export ENABLE_SWING_FILTER=true
export MIN_BACKSWING_ANGLE=10.0
export MIN_SHOULDER_ROT=3.0
export MIN_HIP_ROT=1.0
export MIN_SHOULDER_SPAN=0.01
export STRICT_POSE_DETECTION=true
```

### 판정 결과

| 결과 | API 동작 |
|------|----------|
| 유효한 스윙 | 메트릭 생성 → 정상 응답 |
| 유효하지 않음 | `"invalid_swing": true` 플래그 포함 응답 |

---

## 5. API I/O 구조

### Request

```
multipart / FormData
- file: video
- club: string
- feeling: string (optional)
```

### Response

```json
{
  "metrics": {
    "backswing_angle": 61.2,
    "impact_speed": 42.8,
    ...
  },
  "analysis_version": "v2",
  "invalid_swing": false
}
```

### 실패 응답

```json
{
  "error": "Pose detection failed"
}
```

---

## 6. 버전 정책

| 버전 | 기준 | 메트릭 개수 |
|------|------|------------|
| v1 | 기본 스윙 이해 목적 | 4 |
| v2 | 경기력 분석 기준 | 15 |
| v3 (예정) | 부상 방지 / 피로도 모델 | 20~24 |

### 규칙

- 기존 메트릭 삭제 금지
- 이름 변경 금지
- 확장 시 버전 필드를 포함해 구분

**예:**

```json
{
  "analysis_version": "v2"
}
```

---

## 7. 확장 계획

| 계획 항목 | 우선순위 |
|-----------|----------|
| 코치/AI 평가 기반 스코어 가중치 | ⭐⭐⭐ |
| 왼손잡이/오른손잡이 자동 감지 | ⭐⭐⭐ |
| 클럽 종류별 분석 보정 | ⭐⭐ |
| 비거리 추정 모델 | ⭐⭐ |
| 근골격계 부상 리스크 지수 | ⭐ |
| AI 스윙 유형 분류 (드로/페이드) | 연구 단계 |

---

## 8. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2025-01 | 초기 문서 생성 | Brown |

---
