# 🚀 INSWING AI 코칭 시스템 Level 1 실행 계획

## 📌 프로젝트 개요

### 목표
규칙 기반 템플릿 → **인간 코치 같은 자연스러운 AI 피드백**

### 기간
2주 (12월 2일 ~ 12월 15일)

### 핵심 가치
> "완벽한 분석 데이터 < 공감하고 동기부여하는 코칭"
> 
> 현재 15개 메트릭만으로도 충분히 가치 있는 피드백 가능

### 사용 기술
- **AI 모델**: Claude Sonnet 4 (Anthropic)
- **백엔드**: Node.js + Express
- **프론트엔드**: Vanilla JS
- **데이터베이스**: MySQL

---

## 📅 2주 타임라인

### Week 1: 핵심 기능 구현
- **Day 1-2**: 환경 설정 & API 연동
- **Day 3-5**: 프롬프트 설계 & 코칭 생성
- **Day 6-8**: 백엔드 통합

### Week 2: 완성 & 테스트
- **Day 9-10**: 프론트엔드 표시
- **Day 11-14**: 테스트 & 개선

---

## 📋 Day 1-2: 환경 설정 & API 연동
**기간**: 12월 2-3일 (월-화)

### 목표
Claude API 연동 완료 및 기본 테스트

### ✅ Day 1 체크리스트 (12월 2일 월요일)

#### 1. Anthropic 계정 생성
```bash
# 1.1 회원가입
https://console.anthropic.com

# 1.2 API 키 발급
Console → API Keys → Create Key

# 1.3 크레딧 충전
$20 권장 (약 6,000스윙 분석 가능)
```

#### 2. 패키지 설치
```bash
cd ~/inswing-api
npm install @anthropic-ai/sdk
```

#### 3. 환경 변수 추가
```bash
vim .env

# 추가할 내용
ANTHROPIC_API_KEY=sk-ant-your-key-here
USE_AI_COACHING=true
```

#### 4. 기본 테스트 파일 작성
**파일**: `services/aiCoachingService.js`

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * API 연결 테스트
 */
async function testConnection() {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: "안녕하세요! 테스트입니다."
      }]
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error('Claude API 연결 실패:', error);
    throw error;
  }
}

module.exports = { testConnection };
```

#### 5. 테스트 실행
```bash
node -e "require('./services/aiCoachingService').testConnection().then(console.log)"
```

**예상 결과**: 한국어로 응답이 오면 성공!

---

### ✅ Day 2 체크리스트 (12월 3일 화요일)

#### 1. 한국어 품질 확인
```javascript
// 다양한 테스트 케이스
const testCases = [
  "골프 스윙에 대해 간단히 설명해주세요.",
  "백스윙 각도가 120도면 어떤가요?",
  "템포 비율 2.5:1이 좋나요?"
];

// 각 케이스 테스트하여 응답 품질 확인
```

#### 2. 에러 핸들링 추가
```javascript
/**
 * 에러 핸들링이 포함된 API 호출
 */
async function callClaudeAPI(prompt, options = {}) {
  const maxRetries = 2;
  const timeout = 10000; // 10초
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const message = await anthropic.messages.create({
        model: options.model || "claude-sonnet-4-20250514",
        max_tokens: options.maxTokens || 300,
        temperature: options.temperature || 0.7,
        messages: [{ role: "user", content: prompt }]
      });
      
      clearTimeout(timeoutId);
      return message.content[0].text;
      
    } catch (error) {
      console.error(`API 호출 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error('Claude API 호출 최종 실패');
      }
      
      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

module.exports = { testConnection, callClaudeAPI };
```

#### 3. 로깅 설정
```javascript
const fs = require('fs');
const path = require('path');

/**
 * AI 코칭 로그 기록
 */
function logAICoaching(data) {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'ai-coaching.log');
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    userId: data.userId,
    swingId: data.swingId,
    success: data.success,
    duration: data.duration,
    tokensUsed: data.tokensUsed,
    error: data.error
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

module.exports = { testConnection, callClaudeAPI, logAICoaching };
```

---

## 📋 Day 3-5: 프롬프트 설계 & 코칭 생성
**기간**: 12월 4-6일 (수-금)

### 목표
핵심 프롬프트 작성 및 반복 개선

### ✅ Day 3 체크리스트 (12월 4일 수요일)

#### 1. 헬퍼 함수 작성
```javascript
/**
 * 클럽 이름 한글 변환
 */
function getClubNameKR(clubType) {
  const clubNames = {
    'driver': '드라이버',
    'wood': '우드',
    'iron': '아이언',
    'wedge': '웨지',
    'putter': '퍼터'
  };
  return clubNames[clubType] || clubType;
}

/**
 * 촬영 방향 한글 변환
 */
function getShotSideKR(shotSide) {
  const sides = {
    'front': '정면',
    'side': '측면',
    'back': '후면'
  };
  return sides[shotSide] || shotSide;
}

/**
 * 느낌 코드 한글 변환
 */
function getFeelingKR(feelingCode) {
  const feelings = {
    'perfect': '완벽했어요',
    'good': '좋았어요',
    'normal': '보통이었어요',
    'bad': '안좋았어요'
  };
  return feelings[feelingCode] || '';
}
```

#### 2. 프롬프트 v1 작성
```javascript
/**
 * AI 코칭 생성 (v1)
 */
async function generateCoaching(metrics, swing, feeling = null) {
  const clubName = getClubNameKR(swing.club_type);
  const shotSide = getShotSideKR(swing.shot_side);
  const feelingText = feeling ? getFeelingKR(feeling.feeling_code) : '';
  
  const prompt = `당신은 20년 경력의 친절한 골프 레슨 프로입니다.
아마추어 골퍼의 스윙 데이터를 보고, 격려하면서도 구체적인 피드백을 제공하세요.

**스윙 정보**
- 클럽: ${clubName}
- 촬영 방향: ${shotSide}
${feelingText ? `- 골퍼가 느낀 소감: "${feelingText}"` : ''}

**분석 결과**
- 백스윙 각도: ${metrics.backswing_angle}°
- 임팩트 속도: ${metrics.impact_speed}
- 팔로우스루: ${metrics.follow_through_angle}°
- 밸런스 점수: ${metrics.balance_score}
- 템포 비율: ${metrics.tempo_ratio}
- 백스윙 시간: ${metrics.backswing_time_sec}초
- 다운스윙 시간: ${metrics.downswing_time_sec}초
- 머리 흔들림: ${metrics.head_movement_pct}%
- 어깨 회전 범위: ${metrics.shoulder_rotation_range}°
- 골반 회전 범위: ${metrics.hip_rotation_range}°
- 회전 효율: ${metrics.rotation_efficiency}
- 종합 점수: ${metrics.overall_score}점

**피드백 작성 가이드**
1. 첫 문장: 전체적인 평가 (긍정적으로 시작하되, 점수가 낮으면 격려)
2. 두 번째: 가장 눈에 띄는 특징 1가지 (좋은 점 또는 개선점)
3. 세 번째: 구체적이고 실행 가능한 조언 1가지

**톤 앤 매너**
- 반말 사용 ("~네요", "~해보세요")
- 이모지 최대 1개만 사용 (선택)
- 전문 용어는 쉽게 풀어서 설명
- 2-3문장으로 간결하게

피드백을 작성하세요:`;

  try {
    const startTime = Date.now();
    const coaching = await callClaudeAPI(prompt);
    const duration = Date.now() - startTime;
    
    logAICoaching({
      userId: swing.user_id,
      swingId: swing.id,
      success: true,
      duration,
      tokensUsed: prompt.length / 4 // 대략적 추정
    });
    
    return coaching;
    
  } catch (error) {
    logAICoaching({
      userId: swing.user_id,
      swingId: swing.id,
      success: false,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  testConnection,
  callClaudeAPI,
  logAICoaching,
  generateCoaching
};
```

#### 3. 테스트 케이스 작성
**파일**: `test-cases.json`

```json
[
  {
    "name": "좋은 스윙",
    "metrics": {
      "backswing_angle": 115,
      "impact_speed": 92,
      "follow_through_angle": 105,
      "balance_score": 0.85,
      "tempo_ratio": 2.8,
      "backswing_time_sec": 0.9,
      "downswing_time_sec": 0.32,
      "head_movement_pct": 3.5,
      "shoulder_rotation_range": 95,
      "hip_rotation_range": 48,
      "rotation_efficiency": 0.88,
      "overall_score": 85
    },
    "swing": {
      "club_type": "driver",
      "shot_side": "side"
    },
    "feeling": {
      "feeling_code": "perfect"
    }
  },
  {
    "name": "나쁜 스윙",
    "metrics": {
      "backswing_angle": 85,
      "impact_speed": 68,
      "follow_through_angle": 75,
      "balance_score": 0.45,
      "tempo_ratio": 3.5,
      "backswing_time_sec": 1.2,
      "downswing_time_sec": 0.34,
      "head_movement_pct": 15.2,
      "shoulder_rotation_range": 65,
      "hip_rotation_range": 28,
      "rotation_efficiency": 0.52,
      "overall_score": 45
    },
    "swing": {
      "club_type": "iron",
      "shot_side": "front"
    },
    "feeling": {
      "feeling_code": "bad"
    }
  },
  {
    "name": "느낌과 결과 불일치",
    "metrics": {
      "backswing_angle": 95,
      "impact_speed": 78,
      "follow_through_angle": 88,
      "balance_score": 0.62,
      "tempo_ratio": 3.2,
      "backswing_time_sec": 1.0,
      "downswing_time_sec": 0.31,
      "head_movement_pct": 9.5,
      "shoulder_rotation_range": 75,
      "hip_rotation_range": 35,
      "rotation_efficiency": 0.68,
      "overall_score": 60
    },
    "swing": {
      "club_type": "driver",
      "shot_side": "side"
    },
    "feeling": {
      "feeling_code": "perfect"
    }
  }
]
```

#### 4. 수동 테스트 스크립트
**파일**: `test-coaching.js`

```javascript
const { generateCoaching } = require('./services/aiCoachingService');
const testCases = require('./test-cases.json');

async function runTests() {
  console.log('=== AI 코칭 테스트 시작 ===\n');
  
  for (const testCase of testCases) {
    console.log(`\n[테스트 케이스: ${testCase.name}]`);
    console.log(`클럽: ${testCase.swing.club_type}`);
    console.log(`종합 점수: ${testCase.metrics.overall_score}점`);
    console.log(`느낌: ${testCase.feeling?.feeling_code || '없음'}\n`);
    
    try {
      const coaching = await generateCoaching(
        testCase.metrics,
        testCase.swing,
        testCase.feeling
      );
      
      console.log('✅ 생성된 코칭:');
      console.log(coaching);
      console.log('\n' + '='.repeat(60));
      
    } catch (error) {
      console.error('❌ 에러:', error.message);
    }
    
    // API 호출 간격 (rate limit 방지)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runTests();
```

```bash
# 테스트 실행
node test-coaching.js
```

---

### ✅ Day 4 체크리스트 (12월 5일 목요일)

#### 1. 프롬프트 A/B/C 테스트

**A안: 현재 프롬프트** (Day 3 작성)

**B안: Few-shot 예시 포함**
```javascript
const promptB = `당신은 20년 경력의 친절한 골프 레슨 프로입니다.

... (스윙 정보 동일) ...

**좋은 피드백 예시**

[예시 1 - 좋은 스윙]
"드라이버 템포가 2.8로 정말 안정적이네요! 백스윙도 115도로 충분하고, 머리 흔들림도 3.5%로 거의 완벽합니다. 이 느낌 그대로 유지하면서 연습하세요 👍"

[예시 2 - 개선 필요]
"아이언 스윙에서 머리가 15% 정도 많이 움직였어요. 이게 임팩트를 불안정하게 만들 수 있습니다. 어드레스 때 시선을 공 뒤쪽에 고정하고, 다운스윙 때까지 그 자리를 지키는 연습을 해보세요."

[예시 3 - 느낌과 불일치]
"완벽하다고 느끼셨는데 데이터상으론 60점이 나왔네요. 종종 그럴 수 있어요! 특히 템포가 3.2로 조금 빠른 편인데, 백스윙을 0.2초만 더 천천히 가져가보면 더 나아질 거예요."

위 예시를 참고하여, 이번 스윙에 대한 피드백을 작성하세요:`;
```

**C안: 더 캐주얼한 톤**
```javascript
const promptC = `당신은 친구 같은 골프 코치입니다. 편하게 얘기하듯 피드백하세요.

... (스윙 정보 동일) ...

**톤**
- "오~", "음~", "와~" 같은 감탄사 자연스럽게 사용
- "오늘", "이번", "요즘" 같은 시간 표현 활용
- 더 친근하고 격려적으로

2-3문장으로 작성하세요:`;
```

#### 2. 10가지 스윙으로 비교 테스트
```bash
# 각 프롬프트로 10개 스윙 테스트
node test-coaching.js --prompt=A > results-A.txt
node test-coaching.js --prompt=B > results-B.txt
node test-coaching.js --prompt=C > results-C.txt
```

#### 3. 결과 비교 스프레드시트
| 케이스 | A안 | B안 | C안 | 선호도 |
|--------|-----|-----|-----|--------|
| 좋은 스윙 | ... | ... | ... | B |
| 나쁜 스윙 | ... | ... | ... | A |
| ... | ... | ... | ... | ... |

---

### ✅ Day 5 체크리스트 (12월 6일 금요일)

#### 1. 최종 프롬프트 확정
- A/B/C 중 가장 좋은 버전 선택
- 또는 각 버전의 장점 결합

#### 2. 엣지 케이스 처리
```javascript
/**
 * 메트릭 검증 및 전처리
 */
function validateMetrics(metrics) {
  const required = [
    'backswing_angle',
    'impact_speed',
    'overall_score'
  ];
  
  for (const field of required) {
    if (metrics[field] === null || metrics[field] === undefined) {
      throw new Error(`필수 메트릭 누락: ${field}`);
    }
  }
  
  // 극단값 처리
  if (metrics.head_movement_pct > 30) {
    metrics.head_movement_pct_note = '(매우 높음)';
  }
  
  return metrics;
}

/**
 * 느낌과 데이터 불일치 감지
 */
function detectMismatch(metrics, feeling) {
  if (!feeling) return false;
  
  const score = metrics.overall_score;
  const feelingCode = feeling.feeling_code;
  
  // 느낌 "완벽" but 점수 < 70
  if (feelingCode === 'perfect' && score < 70) {
    return true;
  }
  
  // 느낌 "안좋음" but 점수 > 75
  if (feelingCode === 'bad' && score > 75) {
    return true;
  }
  
  return false;
}
```

#### 3. 최종 서비스 코드
**파일**: `services/aiCoachingService.js` (완성본)

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ... (헬퍼 함수들) ...

/**
 * AI 코칭 생성 (최종 버전)
 */
async function generateCoaching(metrics, swing, feeling = null) {
  try {
    // 1. 메트릭 검증
    const validatedMetrics = validateMetrics(metrics);
    
    // 2. 불일치 감지
    const hasMismatch = detectMismatch(validatedMetrics, feeling);
    
    // 3. 프롬프트 생성 (최종 확정 버전)
    const prompt = buildPrompt(validatedMetrics, swing, feeling, hasMismatch);
    
    // 4. API 호출
    const startTime = Date.now();
    const coaching = await callClaudeAPI(prompt);
    const duration = Date.now() - startTime;
    
    // 5. 로깅
    logAICoaching({
      userId: swing.user_id,
      swingId: swing.id,
      success: true,
      duration,
      hasMismatch
    });
    
    return coaching;
    
  } catch (error) {
    console.error('AI 코칭 생성 실패:', error);
    
    logAICoaching({
      userId: swing.user_id,
      swingId: swing.id,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * 규칙 기반 코칭 (Fallback)
 */
function generateRuleBasedComment(metrics) {
  // 기존 commentService.js 로직 사용
  const comments = [];
  
  if (metrics.overall_score >= 80) {
    comments.push("훌륭한 스윙입니다!");
  } else if (metrics.overall_score >= 60) {
    comments.push("괜찮은 스윙이에요. 조금만 더 연습하면 좋아질 거예요.");
  } else {
    comments.push("개선의 여지가 있네요. 천천히 기본부터 다져봅시다.");
  }
  
  if (metrics.head_movement_pct > 10) {
    comments.push("머리 흔들림을 줄여보세요.");
  }
  
  if (metrics.tempo_ratio < 2.0 || metrics.tempo_ratio > 3.5) {
    comments.push("템포를 2.5~3.0 사이로 조절해보세요.");
  }
  
  return comments.slice(0, 3).join(' ');
}

module.exports = {
  generateCoaching,
  generateRuleBasedComment
};
```

---

## 📋 Day 6-8: 백엔드 통합
**기간**: 12월 7-9일 (토-월)

### 목표
실제 스윙 업로드 플로우에 AI 코칭 통합

### ✅ Day 6 체크리스트 (12월 7일 토요일)

#### 1. routes/swings.js 수정

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const db = require('../db');
const { uploadToS3 } = require('../config/s3');
const { authenticateToken } = require('../middlewares/auth');
const { 
  generateCoaching, 
  generateRuleBasedComment 
} = require('../services/aiCoachingService');

// ... (기존 코드) ...

// 스윙 업로드 및 분석
router.post('/api/swings', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { club_type, shot_side } = req.body;
    
    // 1. S3 업로드
    const videoUrl = await uploadToS3(req.file, userId);
    
    // 2. AI 분석 요청
    const analysisResponse = await axios.post(
      'http://localhost:5000/analyze',
      { video_url: videoUrl }
    );
    
    const metrics = analysisResponse.data.metrics;
    
    // 3. AI 코칭 생성
    let comment;
    const useAI = process.env.USE_AI_COACHING === 'true';
    
    if (useAI) {
      try {
        // 임시 swing 객체 (ID는 아직 없음)
        const tempSwing = {
          user_id: userId,
          club_type,
          shot_side
        };
        
        comment = await generateCoaching(metrics, tempSwing);
        console.log('✅ AI 코칭 생성 성공');
        
      } catch (error) {
        console.error('❌ AI 코칭 실패, fallback:', error.message);
        comment = generateRuleBasedComment(metrics);
      }
    } else {
      comment = generateRuleBasedComment(metrics);
    }
    
    // 4. DB 저장
    const [swingResult] = await db.query(
      `INSERT INTO swings 
       (user_id, video_url, club_type, shot_side, comment, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, videoUrl, club_type, shot_side, comment]
    );
    
    const swingId = swingResult.insertId;
    
    // 5. metrics 저장
    await db.query(
      `INSERT INTO metrics 
       (swing_id, backswing_angle, impact_speed, follow_through_angle, 
        balance_score, tempo_ratio, backswing_time_sec, downswing_time_sec,
        head_movement_pct, shoulder_rotation_range, hip_rotation_range,
        rotation_efficiency, overall_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        swingId,
        metrics.backswing_angle,
        metrics.impact_speed,
        metrics.follow_through_angle,
        metrics.balance_score,
        metrics.tempo_ratio,
        metrics.backswing_time_sec,
        metrics.downswing_time_sec,
        metrics.head_movement_pct,
        metrics.shoulder_rotation_range,
        metrics.hip_rotation_range,
        metrics.rotation_efficiency,
        metrics.overall_score
      ]
    );
    
    // 6. 응답
    res.json({
      success: true,
      swing_id: swingId,
      video_url: videoUrl,
      metrics,
      comment
    });
    
  } catch (error) {
    console.error('스윙 업로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '스윙 분석 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
```

#### 2. 환경 변수 토글 추가
```bash
# .env
USE_AI_COACHING=true  # true/false로 전환 가능
```

#### 3. 로컬 테스트
```bash
# PM2 재시작
pm2 restart inswing-api

# 로그 확인
pm2 logs inswing-api

# 테스트 업로드
# 프론트엔드에서 실제 영상 업로드 테스트
```

---

### ✅ Day 7 체크리스트 (12월 8일 일요일)

#### 1. 전체 플로우 테스트
```
사용자 시나리오:
1. 로그인
2. 스윙 영상 선택
3. 클럽 종류 선택 (드라이버)
4. 촬영 방향 선택 (측면)
5. 업로드 버튼 클릭
6. 로딩 화면 (분석 중...)
7. 결과 페이지 이동
8. AI 코칭 확인
9. 느낌 저장 (선택)
```

#### 2. 성능 측정
```javascript
// routes/swings.js에 타이밍 로그 추가

console.time('s3-upload');
const videoUrl = await uploadToS3(req.file, userId);
console.timeEnd('s3-upload');

console.time('ai-analysis');
const analysisResponse = await axios.post(...);
console.timeEnd('ai-analysis');

console.time('ai-coaching');
const comment = await generateCoaching(...);
console.timeEnd('ai-coaching');

console.time('db-save');
await db.query(...);
console.timeEnd('db-save');
```

**목표 시간**:
- S3 업로드: < 3초
- AI 분석: < 12초
- AI 코칭: < 3초
- DB 저장: < 1초
- **총합: < 20초**

#### 3. 병목 지점 파악
```bash
# 로그 확인
tail -f ~/inswing-api/logs/ai-coaching.log

# 분석 결과 예시
s3-upload: 2.3s
ai-analysis: 11.5s ← 병목!
ai-coaching: 2.8s
db-save: 0.3s
---
총: 16.9s
```

---

### ✅ Day 8 체크리스트 (12월 9일 월요일)

#### 1. 에러 핸들링 강화

```javascript
// services/aiCoachingService.js

/**
 * AI 코칭 생성 with 강화된 에러 핸들링
 */
async function generateCoaching(metrics, swing, feeling = null) {
  try {
    // API 키 확인
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // 메트릭 검증
    const validatedMetrics = validateMetrics(metrics);
    
    // 프롬프트 생성
    const prompt = buildPrompt(validatedMetrics, swing, feeling);
    
    // API 호출 (타임아웃, 재시도 포함)
    const coaching = await callClaudeAPI(prompt, {
      timeout: 10000,
      maxRetries: 2
    });
    
    // 응답 검증
    if (!coaching || coaching.trim().length < 10) {
      throw new Error('Invalid coaching response');
    }
    
    return coaching;
    
  } catch (error) {
    // 에러 타입별 처리
    if (error.message.includes('API key')) {
      console.error('❌ API 키 오류');
    } else if (error.message.includes('timeout')) {
      console.error('⏱️ API 타임아웃');
    } else if (error.message.includes('rate limit')) {
      console.error('🚫 Rate limit 초과');
    } else {
      console.error('❌ 알 수 없는 오류:', error);
    }
    
    throw error;
  }
}
```

#### 2. 모니터링 대시보드 데이터

```javascript
// services/aiCoachingService.js

let stats = {
  totalCalls: 0,
  successCalls: 0,
  failedCalls: 0,
  totalDuration: 0,
  totalTokens: 0
};

function updateStats(data) {
  stats.totalCalls++;
  
  if (data.success) {
    stats.successCalls++;
    stats.totalDuration += data.duration;
    stats.totalTokens += data.tokensUsed || 0;
  } else {
    stats.failedCalls++;
  }
}

function getStats() {
  return {
    ...stats,
    successRate: (stats.successCalls / stats.totalCalls * 100).toFixed(2) + '%',
    avgDuration: Math.round(stats.totalDuration / stats.successCalls) + 'ms',
    estimatedCost: '$' + (stats.totalTokens * 0.000003).toFixed(4)
  };
}

// API 엔드포인트 추가
router.get('/api/admin/ai-stats', authenticateToken, (req, res) => {
  res.json(getStats());
});
```

#### 3. 로그 파일 구조

```
logs/
├── ai-coaching.log          # AI 코칭 로그
├── ai-coaching-error.log    # 에러만 따로
└── performance.log          # 성능 측정
```

```javascript
// 로그 파일 분리
function logAICoaching(data) {
  // 일반 로그
  appendLog('ai-coaching.log', data);
  
  // 에러 로그
  if (!data.success) {
    appendLog('ai-coaching-error.log', data);
  }
  
  // 성능 로그 (3초 이상 걸린 경우)
  if (data.duration > 3000) {
    appendLog('performance.log', data);
  }
}
```

---

## 📋 Day 9-10: 프론트엔드 표시
**기간**: 12월 10-11일 (화-수)

### 목표
AI 코칭을 효과적으로 시각화

### ✅ Day 9 체크리스트 (12월 10일 화요일)

#### 1. result.html UI 개선

```html
<!-- app/result.html -->

<div class="result-container">
  <!-- 기존 메트릭 표시 -->
  <div class="metrics-grid">
    <!-- ... -->
  </div>
  
  <!-- ⭐ AI 코칭 섹션 (신규) -->
  <div class="ai-coaching-section">
    <div class="coaching-card">
      <div class="coaching-header">
        <div class="coach-icon">
          <svg><!-- 코치 아이콘 SVG --></svg>
        </div>
        <div class="header-text">
          <h3>AI 코치의 피드백</h3>
          <span class="badge">Claude 분석</span>
        </div>
      </div>
      
      <div class="coaching-body">
        <p class="coaching-text" id="aiCoaching">
          <!-- AI 코칭 내용 -->
        </p>
      </div>
      
      <div class="coaching-footer">
        <button class="btn-secondary" id="regenerateBtn">
          <svg><!-- 새로고침 아이콘 --></svg>
          다시 생성
        </button>
      </div>
    </div>
  </div>
  
  <!-- 느낌 저장 섹션 -->
  <div class="feeling-section">
    <!-- ... -->
  </div>
</div>
```

#### 2. CSS 스타일링

```css
/* app/css/result.css */

.ai-coaching-section {
  margin: 2rem 0;
}

.coaching-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
}

.coaching-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.coach-icon {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.header-text h3 {
  color: white;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.coaching-body {
  padding: 2rem 1.5rem;
  background: white;
}

.coaching-text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #2d3748;
  margin: 0;
  white-space: pre-line;
}

.coaching-footer {
  padding: 1rem 1.5rem;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

#regenerateBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

#regenerateBtn:hover {
  background: #f7fafc;
  border-color: #667eea;
}

/* 로딩 애니메이션 */
.coaching-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1.5rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #718096;
  font-size: 0.9rem;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
  .coaching-card {
    border-radius: 12px;
  }
  
  .coaching-text {
    font-size: 1rem;
  }
  
  .coach-icon {
    width: 40px;
    height: 40px;
  }
}
```

#### 3. JavaScript 로직

```javascript
// app/js/result.js

async function loadSwingResult(swingId) {
  try {
    // 로딩 표시
    showCoachingLoading();
    
    const response = await fetch(`/api/swings/${swingId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    
    // 메트릭 표시
    displayMetrics(data.metrics);
    
    // AI 코칭 표시
    displayAICoaching(data.comment);
    
    // 느낌 표시
    if (data.feeling) {
      displayFeeling(data.feeling);
    }
    
  } catch (error) {
    console.error('결과 로딩 실패:', error);
    showError('결과를 불러오는데 실패했습니다.');
  }
}

function showCoachingLoading() {
  const coachingBody = document.querySelector('.coaching-body');
  coachingBody.innerHTML = `
    <div class="coaching-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">AI 코치가 피드백을 작성하고 있습니다...</p>
    </div>
  `;
}

function displayAICoaching(comment) {
  const coachingText = document.getElementById('aiCoaching');
  
  // 타이핑 효과
  typeWriter(coachingText, comment, 30);
}

function typeWriter(element, text, speed) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  
  type();
}

// 다시 생성 버튼
document.getElementById('regenerateBtn')?.addEventListener('click', async () => {
  const swingId = getSwingIdFromURL();
  
  try {
    showCoachingLoading();
    
    const response = await fetch(`/api/swings/${swingId}/regenerate-coaching`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    displayAICoaching(data.comment);
    
  } catch (error) {
    console.error('코칭 재생성 실패:', error);
  }
});
```

---

### ✅ Day 10 체크리스트 (12월 11일 수요일)

#### 1. history.html 개선

```html
<!-- app/history.html -->

<div class="swing-card">
  <div class="card-header">
    <img src="thumbnail.jpg" alt="스윙 썸네일">
    <div class="card-info">
      <span class="club-badge">드라이버</span>
      <span class="date">2024.12.11</span>
    </div>
  </div>
  
  <div class="card-body">
    <!-- 메트릭 미리보기 -->
    <div class="metrics-preview">
      <div class="metric-item">
        <span class="label">종합</span>
        <span class="value">85점</span>
      </div>
      <div class="metric-item">
        <span class="label">템포</span>
        <span class="value">2.8</span>
      </div>
      <div class="metric-item">
        <span class="label">밸런스</span>
        <span class="value">0.85</span>
      </div>
    </div>
    
    <!-- ⭐ AI 코칭 미리보기 (신규) -->
    <div class="coaching-preview">
      <div class="coaching-icon">💬</div>
      <p class="coaching-snippet">
        드라이버 템포가 2.8로 정말 안정적이네요!
        <span class="more">더보기</span>
      </p>
    </div>
  </div>
  
  <div class="card-footer">
    <button class="btn-view">자세히 보기</button>
  </div>
</div>
```

```css
/* app/css/history.css */

.coaching-preview {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea15, #764ba215);
  border-radius: 8px;
  margin-top: 1rem;
}

.coaching-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.coaching-snippet {
  font-size: 0.9rem;
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.coaching-snippet .more {
  color: #667eea;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
```

#### 2. 로딩 상태 개선

```javascript
// app/js/upload.js

async function uploadSwing(formData) {
  const uploadBtn = document.getElementById('uploadBtn');
  const progressContainer = document.getElementById('uploadProgress');
  const progressBar = progressContainer.querySelector('.progress-bar');
  const progressText = progressContainer.querySelector('.progress-text');
  
  try {
    // 1단계: 업로드 준비
    uploadBtn.disabled = true;
    uploadBtn.textContent = '준비 중...';
    progressContainer.style.display = 'block';
    
    // 2단계: 영상 업로드
    progressText.textContent = '영상 업로드 중...';
    updateProgress(progressBar, 20);
    
    const response = await fetch('/api/swings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    // 3단계: AI 분석
    progressText.textContent = 'AI가 스윙을 분석하는 중...';
    updateProgress(progressBar, 50);
    
    // 폴링으로 진행상황 확인 (선택)
    // await pollAnalysisProgress(swingId);
    
    // 4단계: 코칭 생성
    progressText.textContent = '코치가 피드백을 작성하는 중...';
    updateProgress(progressBar, 80);
    
    const data = await response.json();
    
    // 5단계: 완료
    progressText.textContent = '완료!';
    updateProgress(progressBar, 100);
    
    setTimeout(() => {
      window.location.href = `/app/result.html?id=${data.swing_id}`;
    }, 500);
    
  } catch (error) {
    console.error('업로드 실패:', error);
    progressText.textContent = '업로드 실패';
    progressBar.style.background = '#f56565';
  }
}

function updateProgress(bar, percent) {
  bar.style.width = percent + '%';
}
```

#### 3. 모바일 반응형 테스트

```bash
# 테스트 기기
- iPhone 14 Pro (Safari)
- Samsung Galaxy S23 (Chrome)
- iPad Pro (Safari)

# 테스트 항목
□ 스윙 업로드 정상 작동
□ AI 코칭 카드 레이아웃
□ 로딩 애니메이션
□ 터치 제스처
□ 가로/세로 모드
```

---

## 📋 Day 11-14: 테스트 & 개선
**기간**: 12월 12-15일 (목-일)

### 목표
실사용 테스트 및 프롬프트 최적화

### ✅ Day 11-12 체크리스트 (12월 12-13일)

#### 1. 테스터 모집

**모집 메시지 템플릿**:
```
안녕하세요!

골프 스윙 AI 분석 서비스 INSWING의 베타 테스터를 모집합니다.

🏌️ 테스트 내용:
- 본인의 스윙 영상 3개 업로드
- AI 코치의 피드백 확인
- 간단한 만족도 평가 (5분 소요)

🎁 참여 혜택:
- 정식 출시 후 1개월 무료 이용권
- 피드백 제공자 중 추첨으로 골프공 1더즌

📝 참여 방법:
1. https://inswing.ai 접속
2. 구글/카카오 로그인
3. 스윙 3개 업로드
4. 설문 작성: [구글 폼 링크]

기간: 12월 12-13일 (2일간)
인원: 선착순 10명
```

#### 2. 테스트 시나리오

**테스터용 가이드 문서**:
```markdown
# INSWING 베타 테스트 가이드

## 1단계: 가입 및 로그인
- inswing.ai 접속
- 구글 또는 카카오 로그인

## 2단계: 스윙 업로드 (3회)
- 다양한 클럽으로 촬영 (드라이버, 아이언, 웨지 등)
- 측면 촬영 권장
- 영상 길이: 5-10초

## 3단계: AI 코칭 확인
각 스윙마다:
- AI 코치의 피드백을 읽어보세요
- 도움이 되었나요?
- 이상한 표현이 있나요?

## 4단계: 설문 작성
https://forms.gle/...

질문 항목:
1. AI 코칭이 자연스러웠나요? (1-5점)
2. 피드백이 도움이 되었나요? (1-5점)
3. 가장 좋았던 표현은?
4. 가장 이상했던 표현은?
5. 더 알고 싶은 정보는?
6. 기타 의견
```

#### 3. 피드백 수집 양식

**구글 폼 질문**:
```
1. 전체적인 만족도 (1-5점)
2. AI 코칭의 자연스러움 (1-5점)
3. 피드백의 유용성 (1-5점)
4. 좋았던 점 (주관식)
5. 개선이 필요한 점 (주관식)
6. 가장 좋았던 AI 코칭 예시 (주관식)
7. 가장 이상했던 AI 코칭 예시 (주관식)
8. 추가로 원하는 기능 (주관식)
9. 유료 전환 의향 (예/아니오/모르겠음)
10. 추천 의향 (1-10점, NPS)
```

---

### ✅ Day 13 체크리스트 (12월 14일 토요일)

#### 1. 피드백 분석

**분석 스프레드시트**:
| 테스터 | 만족도 | 자연스러움 | 유용성 | 좋았던 점 | 개선점 |
|--------|--------|------------|--------|-----------|--------|
| A | 4 | 5 | 4 | 구체적 조언 | 전문용어 |
| B | 5 | 4 | 5 | 격려하는 톤 | 없음 |
| C | 3 | 3 | 4 | - | 너무 짧음 |
| ... | ... | ... | ... | ... | ... |

**공통 패턴 추출**:
```
✅ 좋았던 표현:
- "이번 드라이버 템포가~"
- "지난번보다 개선됐어요"
- "이 느낌 그대로~"

❌ 이상했던 표현:
- 너무 전문적인 용어
- 지나치게 긴 문장
- 반복적인 표현
```

#### 2. 프롬프트 v2 작성

```javascript
// 피드백 반영한 개선 버전

const promptV2 = `당신은 20년 경력의 친절한 골프 레슨 프로입니다.
아마추어 골퍼의 스윙 데이터를 보고, 격려하면서도 구체적인 피드백을 제공하세요.

**중요: 다음 원칙을 반드시 지켜주세요**
1. 전문 용어는 최소화하고, 사용할 경우 쉽게 풀어 설명
2. 2-3문장으로 간결하게 (각 문장은 15-20단어 이내)
3. 숫자는 구체적으로 언급 (예: "템포가 2.8로")
4. 긍정적으로 시작하되, 과장하지 말 것
5. 실행 가능한 조언 1가지 포함

... (나머지 동일) ...

**좋은 예시**
"드라이버 템포가 2.8로 안정적이네요! 다만 머리가 7% 움직여서 임팩트가 약간 불안정할 수 있어요. 다운스윙 때 시선을 공에 고정해보세요."

**피해야 할 표현**
- 지나치게 전문적: "골반의 시상면 회전 각도가~"
- 너무 추상적: "밸런스가 좋네요" (구체적 수치 없이)
- 과도한 칭찬: "완벽합니다! 프로 수준이에요!"

위 가이드를 참고하여 피드백을 작성하세요:`;
```

#### 3. A/B 테스트 설정

```javascript
// routes/swings.js

router.post('/api/swings', authenticateToken, upload.single('video'), async (req, res) => {
  // ... (기존 코드) ...
  
  // A/B 테스트: 사용자 ID 기반으로 분할
  const promptVersion = userId % 2 === 0 ? 'v1' : 'v2';
  
  const comment = await generateCoaching(
    metrics, 
    tempSwing, 
    null, 
    { promptVersion }
  );
  
  // 버전 정보 로깅
  await db.query(
    'INSERT INTO ab_test_log (user_id, swing_id, prompt_version) VALUES (?, ?, ?)',
    [userId, swingId, promptVersion]
  );
  
  // ... (나머지 코드) ...
});
```

---

### ✅ Day 14 체크리스트 (12월 15일 일요일)

#### 1. 최종 버전 결정

```javascript
// A/B 테스트 결과 분석

SELECT 
  prompt_version,
  COUNT(*) as swing_count,
  AVG(satisfaction_score) as avg_satisfaction
FROM ab_test_log
JOIN user_feedback ON ab_test_log.swing_id = user_feedback.swing_id
GROUP BY prompt_version;

/*
결과 예시:
v1: 15 swings, 3.8점
v2: 15 swings, 4.4점
→ v2 선택!
*/
```

#### 2. 프로덕션 배포

```bash
# 1. 최종 버전 적용
vim services/aiCoachingService.js
# promptV2를 기본값으로 설정

# 2. 환경 변수 확인
cat .env | grep AI_COACHING
# USE_AI_COACHING=true

# 3. Git 커밋
git add .
git commit -m "feat: AI coaching system v1.0"
git push origin main

# 4. 서버 배포
ssh ec2-user@43.200.111.14
cd ~/inswing-api
git pull
npm install
pm2 restart inswing-api

# 5. 로그 모니터링
pm2 logs inswing-api --lines 50
tail -f ~/inswing-api/logs/ai-coaching.log
```

#### 3. 모니터링 대시보드 확인

```bash
# API 통계 확인
curl -H "Authorization: Bearer $TOKEN" \
  https://api.inswing.ai/api/admin/ai-stats

# 예상 결과:
{
  "totalCalls": 30,
  "successCalls": 28,
  "failedCalls": 2,
  "successRate": "93.33%",
  "avgDuration": "2847ms",
  "estimatedCost": "$0.0924"
}
```

#### 4. Week 1-2 회고

**달성 지표 체크**:
```
✅ 기술 지표
[✓] AI 코칭 생성 성공률: 93% (목표 95%)
[✓] 평균 생성 시간: 2.8초 (목표 3초)
[✓] API 에러율: 6.7% (목표 5%) - 약간 높음

✅ 사용자 지표
[✓] 테스터 확보: 10명
[✓] 평균 만족도: 4.2/5.0 (목표 4.0)
[✓] "도움됨" 응답: 80% (목표 70%)

✅ 품질 지표
[✓] 자연스러운 한국어
[✓] 구체적 조언 포함
[✓] 긍정적/격려 톤 유지
```

**배운 점**:
```
1. 프롬프트 엔지니어링이 핵심
   - Few-shot 예시가 큰 도움
   - 구체적 가이드라인 필수

2. 에러 핸들링 중요
   - Fallback 필수
   - 재시도 로직으로 성공률 향상

3. 사용자 피드백 가치
   - 개발자 관점 ≠ 사용자 관점
   - 실제 테스트로 많은 개선점 발견
```

**개선이 필요한 부분**:
```
1. API 에러율 5% 이하로 낮추기
   - 타임아웃 조정
   - 재시도 로직 강화

2. 응답 시간 단축
   - 프롬프트 길이 최적화
   - 캐싱 도입 검토

3. 비용 최적화
   - Haiku 모델 테스트
   - 배치 처리 도입
```

---

## 📊 최종 성공 지표

### ✅ Level 1 완료 기준

```
기술적 성공:
□ AI 코칭 시스템 프로덕션 배포
□ 성공률 90% 이상
□ 평균 응답 시간 3초 이내

사용자 경험:
□ 10명 테스터 피드백 수집
□ 만족도 4.0/5.0 이상
□ 규칙 기반 대비 만족도 20% 향상

비즈니스:
□ 상품성 검증 완료
□ Level 2 개발 여부 결정
□ 비용 구조 검증 ($100/월 이하)
```

---

## 💰 예상 비용 (첫 달)

```
개발 단계 (Day 1-14):
- API 크레딧: $20
- 테스트 사용: ~100 스윙
- 실제 비용: ~$3

운영 단계 (월간):
- 사용자 100명 × 10스윙/월 = 1,000스윙
- 스윙당 $0.003
- 월 비용: $30 (약 40,000원)

- 사용자 1,000명 = 10,000스윙
- 월 비용: $300 (약 400,000원)
```

---

## 🚨 리스크 관리

### Risk 1: API 장애
```
확률: 중
영향: 고
대응: Fallback (규칙 기반) 자동 전환
```

### Risk 2: 비용 초과
```
확률: 저
영향: 중
대응: 
- 일일 모니터링
- 알림 설정 ($50 초과 시)
- 캐싱 도입
```

### Risk 3: 품질 저하
```
확률: 중
영향: 중
대응:
- 지속적 피드백 수집
- 프롬프트 A/B 테스트
- 분기별 프롬프트 개선
```

---

## 📝 다음 단계 (Level 2)

### Week 3-6: 히스토리 반영 코칭

```
구현 내용:
1. 직전 스윙 비교 (1주)
2. 최근 3개 스윙 트렌드 (1주)
3. 사용자 프로필 DB (1주)
4. 통합 및 테스트 (1주)

목표:
- "나를 아는 코치" 구현
- 재방문율 30% → 50%
- NPS 50 이상
```

---

## ✅ 오늘 할 일 (12월 2일)

```bash
[ ] 1. Anthropic 계정 생성 (30분)
    https://console.anthropic.com

[ ] 2. 크레딧 충전 (10분)
    $20 충전

[ ] 3. 패키지 설치 (5분)
    npm install @anthropic-ai/sdk

[ ] 4. 환경 변수 설정 (5분)
    .env에 ANTHROPIC_API_KEY 추가

[ ] 5. 테스트 파일 작성 (1시간)
    services/aiCoachingService.js

[ ] 6. 첫 테스트 실행 (30분)
    node -e "require('./services/aiCoachingService')..."

[ ] 7. 진행상황 정리 (30분)
```

**예상 소요 시간: 2.5시간**

---

## 📞 문의 및 지원

```
문제 발생 시:
1. 로그 확인: tail -f logs/ai-coaching.log
2. PM2 상태: pm2 status
3. API 상태: curl https://api.anthropic.com/v1/messages
```

---

**🎉 Level 1 완료 후 축하 메시지를 잊지 마세요!**

*"우리는 이제 진짜 AI 코치를 가진 골프 앱입니다!"*