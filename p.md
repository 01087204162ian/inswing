# INSWING 프로젝트

## 🎯 현재 상태
✅ AWS 인프라 (EC2 + Nginx + SSL + PM2)
✅ API 서버 (server.js - 메모리 DB)
✅ 프론트엔드 (S3 + CloudFront)
✅ upload/history/result 페이지 완성
🔲 OAuth 로그인 (다음 작업)
🔲 MySQL 연동
🔲 AI 분석 서버
🔲 S3 영상 저장

## 🔗 빠른 참조
- **API**: https://api.inswing.ai
- **프론트**: https://inswing.ai (S3 호스팅)
- **EC2**: 43.200.111.14
- **SSH**: `ssh -i inswing-key-pair.pem ec2-user@43.200.111.14`

## 🛠️ 주요 명령어
```bash
# 백엔드 (EC2)
cd ~/inswing-api
git pull
npm install
pm2 restart inswing-api
pm2 logs inswing-api

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# 프론트 (S3)
aws s3 sync . s3://inswing.ai --exclude ".git/*"
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

## 📂 구조
```
inswing-api/ (EC2)       # 백엔드
├─ server.js             # Express API
├─ package.json
└─ uploads/              # 영상 임시 저장

inswing/ (S3)            # 프론트
├─ index.html            # 언어 분기
├─ ko/, en/              # 랜딩 페이지
└─ app/                  # 서비스 기능
   ├─ js/app.js          # getToken, apiFetch, requireLogin
   ├─ upload.html        # 영상 업로드
   ├─ history.html       # 스윙 리스트
   └─ result.html        # 분석 결과 + 느낌
```

## 🔌 API 엔드포인트
```
POST   /api/swings              # 업로드 + AI 분석
GET    /api/swings              # 리스트
GET    /api/swings/:id          # 단건 조회
POST   /api/swings/:id/feeling  # 느낌 저장
GET    /health                  # 헬스체크
```

## 💾 현재 데이터 구조 (메모리)
```javascript
let swings = [];       // 스윙 정보
let metricsMap = {};   // AI 분석 결과
let feelingsMap = {};  // 사용자 느낌
```

## 📋 다음 작업
🔲 login.html + server.js JWT 발급 (OAuth 준비 단계)