# INSWING 프로젝트

## 🎯 현재 상태
✅ AWS 인프라 (EC2 + Nginx + SSL + PM2)
✅ API 서버 (server.js - 메모리 DB)
✅ 프론트엔드 (upload/history/result)
🔲 OAuth 로그인
🔲 MySQL 연동
🔲 AI 분석 서버
🔲 S3 영상 저장

## 🔗 빠른 참조
- **API**: https://api.inswing.ai
- **프론트**: https://inswing.ai
- **EC2**: 43.200.111.14
- **SSH**: `ssh -i inswing-key-pair.pem ec2-user@43.200.111.14`

## 🛠️ 주요 명령어
```bash
# 서버
pm2 restart inswing-api
pm2 logs inswing-api
sudo nginx -t && sudo systemctl reload nginx

# 배포
cd ~/inswing-api && git pull && npm install && pm2 restart inswing-api
```

## 📂 구조
```
inswing-api/          # 백엔드
├─ server.js
├─ package.json
└─ uploads/

inswing/              # 프론트
├─ ko/, en/           # 랜딩
└─ app/               # 서비스
   ├─ js/app.js
   ├─ upload.html
   ├─ history.html
   └─ result.html
```

## 🔌 API 엔드포인트
```
POST   /api/swings              # 업로드
GET    /api/swings              # 리스트
GET    /api/swings/:id          # 단건
POST   /api/swings/:id/feeling  # 느낌
GET    /health                  # 헬스
```

## 📋 다음 작업
🔲 login.html + JWT 발급 (OAuth 준비)