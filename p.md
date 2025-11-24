# INSWING - 골프 스윙 AI 분석 서비스

## 📋 프로젝트 개요

**서비스명:** INSWING  
**도메인:** https://inswing.ai  
**API 서버:** https://api.inswing.ai  
**목표:** 골퍼가 인식하는 스윙과 객관적인 AI 분석 스윙의 차이를 인식시켜 개선 도움

---

## 🏗️ 시스템 아키텍처

### 인프라
- **프론트엔드:** S3 + CloudFront (정적 웹사이트)
- **백엔드 API:** EC2 (Node.js + Express) - `api.inswing.ai`
- **AI 분석 서버:** EC2 (Python + Flask) - 포트 5000
- **데이터베이스:** MySQL (RDS 또는 EC2 내부)
- **비디오 저장:** S3 (`inswing-videos`) + CloudFront
- **배포:** GitHub Actions (자동 배포)

### 서버 스펙
- **인스턴스:** t3.micro (1GB RAM)
- **OS:** Ubuntu 24
- **IP:** 43.200.111.14

---

## 🗂️ 디렉토리 구조
```
inswing/
├── app/
│   ├── index.html           # 메인 페이지
│   ├── login.html           # 로그인 페이지
│   ├── upload.html          # 비디오 업로드
│   ├── history.html         # 스윙 히스토리
│   ├── result.html          # 분석 결과
│   └── js/
│       └── app.js           # 공통 JavaScript
├── ko/
│   └── index.html           # 한국어 랜딩 페이지
└── assets/
    └── ...                  # 이미지, 아이콘 등

inswing-api/ (EC2 서버)
├── server.js                # Express 메인 서버
├── db.js                    # MySQL 연결
├── .env                     # 환경 변수
├── uploads/                 # 임시 업로드 디렉토리
└── package.json
```

---

## 🔐 인증 시스템

### OAuth 2.0 소셜 로그인
- **Google OAuth**
- **Kakao OAuth**

### JWT 토큰
- **저장 위치:** `localStorage`
  - Key: `inswing_token`
  - Value: JWT 토큰
- **만료 시간:** 7일
- **검증:** `authMiddleware` (백엔드)

### 프론트엔드 인증 흐름
```javascript
// 1. 로그인 체크
function requireLogin() {
  const token = getToken();
  if (!token) {
    window.location.href = '/app/login.html';
  }
}

// 2. API 호출 시 토큰 포함
async function apiFetch(path, options) {
  const token = getToken();
  headers['Authorization'] = 'Bearer ' + token;
  // ...
}

// 3. 로그아웃
function logout() {
  localStorage.removeItem('inswing_token');
  window.location.href = '/app/login.html';
}
```

---

## 📡 API 엔드포인트

### 인증 (Auth)
```
GET  /auth/google              # Google OAuth 시작
GET  /auth/google/callback     # Google OAuth 콜백
GET  /auth/kakao               # Kakao OAuth 시작
GET  /auth/kakao/callback      # Kakao OAuth 콜백
POST /auth/login               # 이메일 로그인 (미사용)
```

### 스윙 (Swings)
```
POST /swings                   # 스윙 업로드 + AI 분석
GET  /swings                   # 스윙 목록 (히스토리)
GET  /swings/:id               # 특정 스윙 조회
POST /swings/:id/feeling       # 스윙 느낌 저장
```

### 헬스체크
```
GET  /health                   # 서버 상태 확인
GET  /api/health               # API 상태 확인
```

---

## 📊 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### swings 테이블
```sql
CREATE TABLE swings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  video_url VARCHAR(500),
  club_type VARCHAR(50),
  shot_side VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### metrics 테이블
```sql
CREATE TABLE metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  swing_id INT NOT NULL,
  backswing_angle DECIMAL(5,2),
  impact_speed DECIMAL(5,2),
  follow_through_angle DECIMAL(5,2),
  balance_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (swing_id) REFERENCES swings(id)
);
```

### feelings 테이블
```sql
CREATE TABLE feelings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  swing_id INT NOT NULL,
  feeling_code VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (swing_id) REFERENCES swings(id)
);
```

---

## 🎨 프론트엔드

### 기술 스택
- **HTML5**
- **CSS3** (Vanilla, 반응형 디자인)
- **JavaScript** (ES6+, Fetch API)

### 주요 기능

#### 1. 네비게이션 바
```javascript
// 모든 app 페이지에 공통 적용
<nav class="top-nav">
  <a href="/ko/index.html" class="nav-logo">
    <span class="nav-logo-mark">INS</span>
    <span class="nav-logo-text">WING</span>
  </a>
  <div class="nav-menu">
    <a href="/app/upload.html" class="nav-link">업로드</a>
    <a href="/app/history.html" class="nav-link">히스토리</a>
    <a href="#" onclick="logout(); return false;" class="nav-link logout">로그아웃</a>
  </div>
</nav>
```

#### 2. 공통 JavaScript (app.js)
```javascript
// API Base URL
const API_BASE = 'https://api.inswing.ai';

// 토큰 관리
function getToken();
function setToken(token);

// 로그인 체크
function requireLogin();

// API 호출 (토큰 자동 포함)
async function apiFetch(path, options);

// 로그아웃
function logout();

// 현재 페이지 활성화 표시
function setActiveNav();

// URL 쿼리 파라미터
function getQueryParam(name);
```

#### 3. 업로드 플로우
```javascript
1. upload.html
   ↓ 파일 선택 + 클럽 선택 + 촬영 방향 선택
2. FormData 생성
   ↓ POST /api/swings
3. 서버에서 AI 분석
   ↓ S3 업로드
4. 응답: { swing_id: 7 }
   ↓ 리다이렉트
5. result.html?id=7
```

---

## 🖥️ 백엔드

### 기술 스택
- **Node.js** (v18+)
- **Express.js** (웹 프레임워크)
- **mysql2** (MySQL 드라이버)
- **multer** (파일 업로드)
- **@aws-sdk/client-s3** (S3 업로드)
- **passport** (OAuth 인증)
- **jsonwebtoken** (JWT)
- **axios** (AI 서버 통신)

### 주요 설정

#### Nginx 설정 (`/etc/nginx/conf.d/inswing-api.conf`)
```nginx
server {
    listen 443 ssl;
    server_name api.inswing.ai;

    ssl_certificate /etc/letsencrypt/live/api.inswing.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.inswing.ai/privkey.pem;

    client_max_body_size 500M;
    client_body_timeout 300s;
    send_timeout 300s;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

#### 환경 변수 (.env)
```bash
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=...
DB_NAME=inswing

JWT_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...

AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=inswing-videos
CLOUDFRONT_DOMAIN=...
```

### 스윙 업로드 플로우
```javascript
1. POST /swings (multipart/form-data)
   - video: File
   - club_type: String
   - shot_side: String

2. multer로 로컬 임시 저장 (uploads/)

3. AI 분석 요청
   POST http://localhost:5000/analyze
   → 메트릭 받기

4. S3에 비디오 업로드
   → CloudFront URL 생성

5. DB에 저장
   - swings 테이블
   - metrics 테이블

6. 로컬 파일 삭제

7. 응답
   { swing_id: 7 }
```

### API 응답 구조

#### GET /swings (히스토리)
```json
{
  "ok": true,
  "swings": [
    {
      "id": 7,
      "video_url": "https://...",
      "club_type": "driver",
      "shot_side": "back",
      "created_at": "2025-11-24T15:24:34.000Z",
      "metrics": {
        "backswing_angle": "179.68",
        "impact_speed": "1.63",
        "follow_through_angle": "159.46",
        "balance_score": "1.00"
      },
      "feeling": null
    }
  ]
}
```

#### GET /swings/:id (상세 조회)
```json
{
  "ok": true,
  "swing": {
    "id": 7,
    "video_url": "https://...",
    "club_type": "driver",
    "shot_side": "back",
    "created_at": "2025-11-24T15:24:34.000Z"
  },
  "metrics": {
    "backswing_angle": "179.68",
    "impact_speed": "1.63",
    "follow_through_angle": "159.46",
    "balance_score": "1.00"
  },
  "feeling": null
}
```

---

## 🤖 AI 분석 서버

### 기술 스택
- **Python 3**
- **Flask**
- **MediaPipe** (포즈 감지)
- **OpenCV** (비디오 처리)

### 엔드포인트
```
POST /analyze
Content-Type: multipart/form-data
Body: video (File)

Response:
{
  "backswing_angle": 179.68,
  "impact_speed": 1.63,
  "follow_through_angle": 159.46,
  "balance_score": 1.00
}
```

### PM2 관리
```bash
pm2 list
pm2 logs inswing-ai
pm2 restart inswing-ai
```

---

## 🚀 배포

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    steps:
      - Checkout code
      - Configure AWS credentials
      - Sync to S3
      - Invalidate CloudFront cache
```

### 수동 배포 (백엔드)
```bash
# EC2 접속
ssh ec2-user@43.200.111.14

# 코드 업데이트
cd ~/inswing-api
git pull origin main

# 의존성 설치
npm install

# PM2 재시작
pm2 restart inswing-api
pm2 logs inswing-api
```

---

## 🐛 알려진 이슈 및 해결

### 1. FormData Content-Type 문제
**문제:** FormData 전송 시 `Content-Type: application/json` 설정됨  
**해결:** FormData일 때는 Content-Type 설정 안 함
```javascript
if (!(options.body instanceof FormData)) {
  headers['Content-Type'] = 'application/json';
}
```

### 2. API 경로 불일치
**문제:** 프론트엔드 `/api/swings/upload`, 백엔드 `POST /swings`  
**해결:** 프론트엔드를 `/api/swings`로 통일

### 3. 백엔드 응답 구조 불일치
**문제:** 프론트엔드가 flat 구조 예상, 백엔드는 nested 구조 반환  
**해결:** 프론트엔드에서 구조 분해
```javascript
const { swing, metrics, feeling } = data;
```

### 4. 메트릭 데이터 타입
**문제:** 백엔드가 문자열로 반환, 프론트엔드가 숫자 메서드 호출  
**해결:** `parseFloat()` 변환 추가
```javascript
parseFloat(metrics.backswing_angle).toFixed(1)
```

### 5. 파일 크기 제한
**문제:** 큰 파일 업로드 시 서버 메모리 부족  
**제한:** 현재 30MB 이하 권장 (t3.micro 1GB RAM)  
**향후:** 서버 업그레이드 또는 S3 직접 업로드

---

## 📈 성능 최적화

### 현재 제한사항
- **서버:** t3.micro (1GB RAM)
- **권장 파일 크기:** 30MB 이하
- **동시 업로드:** 제한적

### 향후 개선 방안
1. **서버 업그레이드:** t3.small (2GB) 이상
2. **S3 Pre-signed URL:** 클라이언트 직접 업로드
3. **비디오 압축:** 프론트엔드에서 사전 압축
4. **CDN 캐싱:** CloudFront 최적화

---

## 🔒 보안

### 구현된 보안 기능
- ✅ HTTPS (Let's Encrypt SSL)
- ✅ JWT 토큰 인증
- ✅ authMiddleware (API 보호)
- ✅ CORS 설정
- ✅ Nginx 프록시

### 주의사항
- ⚠️ `.env` 파일 Git에 커밋 금지
- ⚠️ JWT_SECRET 주기적 변경
- ⚠️ OAuth Client Secret 보안 관리

---

## 📝 개발 가이드

### 로컬 개발 환경

#### 프론트엔드
```bash
# 로컬 서버 실행 (Live Server 등)
cd D:\ian\inswing
# VS Code Live Server 또는
python -m http.server 8080
```

#### 백엔드
```bash
# EC2에서 개발
ssh ec2-user@43.200.111.14
cd ~/inswing-api

# 환경 변수 설정
cp .env.example .env
nano .env

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 또는 PM2
pm2 restart inswing-api --watch
```

### Git 워크플로우
```bash
# 1. 기능 개발
git checkout -b feature/new-feature

# 2. 커밋
git add .
git commit -m "Add: new feature description"

# 3. 푸시
git push origin feature/new-feature

# 4. Pull Request (선택)
# 5. Merge to main (자동 배포됨)
```

### 디버깅

#### 프론트엔드
```javascript
// Console 로그
console.log('📦 Data:', data);

// Network 탭 확인
F12 → Network → 요청 클릭

// localStorage 확인
localStorage.getItem('inswing_token')
```

#### 백엔드
```bash
# PM2 로그
pm2 logs inswing-api

# 실시간 로그
pm2 logs inswing-api --lines 100

# 에러 로그만
pm2 logs inswing-api --err
```

---

## 🧪 테스트

### API 테스트 (curl)
```bash
# 헬스체크
curl https://api.inswing.ai/health

# 토큰으로 스윙 조회
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.inswing.ai/api/swings
```

### 프론트엔드 테스트
```
1. 로그인 → 토큰 저장 확인
2. 업로드 → result.html 이동 확인
3. 히스토리 → 목록 표시 확인
4. 결과 → 비디오 재생, 메트릭 표시 확인
5. 로그아웃 → 로그인 페이지 이동 확인
```

---

## 📞 유지보수

### 정기 점검
- **주간:** 서버 상태, 디스크 용량
- **월간:** 로그 분석, 에러 트래킹
- **분기:** 보안 업데이트, 의존성 업데이트

### 모니터링
```bash
# 서버 상태
pm2 status

# 디스크 용량
df -h

# 메모리 사용량
free -h

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
```

---

## 📚 참고 자료

### 기술 문서
- [Express.js](https://expressjs.com/)
- [MySQL](https://dev.mysql.com/doc/)
- [AWS S3](https://docs.aws.amazon.com/s3/)
- [MediaPipe](https://google.github.io/mediapipe/)
- [Passport.js](http://www.passportjs.org/)

### API 문서
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Kakao OAuth](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)

---

## 👥 팀

**Founder & Developer:** Seongjun (Ian Swing)  
**Email:** 01087204162ian@gmail.com  
**GitHub:** https://github.com/01087204162ian/inswing

---

## 📅 버전 히스토리

### v1.0.0 (2025-11-24)
- ✅ OAuth 로그인 (Google, Kakao)
- ✅ 비디오 업로드 + AI 분석
- ✅ S3 + CloudFront 비디오 저장
- ✅ 스윙 히스토리
- ✅ 분석 결과 조회
- ✅ 느낌 선택 기능
- ✅ 네비게이션 바 + 로그아웃

### 향후 계획
- [ ] 스윙 비교 기능
- [ ] 프로 스윙 DB
- [ ] 레슨 프로 B2B
- [ ] 실내 연습장 제휴
- [ ] 모바일 앱
- [ ] 스윙 궤적 시각화

---

**최종 업데이트:** 2025-11-24  
**문서 버전:** 1.0.0