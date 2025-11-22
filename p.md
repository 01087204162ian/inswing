# INSWING 프로젝트

## 🎯 현재 상태
✅ AWS 인프라 (EC2 + Nginx + SSL + PM2)
✅ API 서버 (server.js - MySQL)
✅ MySQL (EC2 로컬 - users, swings, metrics, feelings)
✅ 프론트엔드 (S3 + CloudFront + GitHub Actions)
✅ JWT 로그인 시스템
✅ 업로드/히스토리/결과 페이지
✅ MySQL Workbench SSH 터널 접속
🔲 느낌 저장 기능 테스트
🔲 실제 OAuth (구글/카카오)
🔲 AI 분석 서버
🔲 S3 영상 저장
🔲 RDS 마이그레이션

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

# MySQL
sudo mysql -u root -p
mysql -u inswing_user -p

# 프론트 (자동 배포)
git push  # → GitHub Actions → S3 + CloudFront
```

## 📂 구조
```
inswing-api/ (EC2)       # 백엔드
├─ server.js             # Express API + MySQL
├─ db.js                 # MySQL 연결 풀
├─ package.json
└─ uploads/              # 영상 임시 저장

inswing/ (S3)            # 프론트
├─ .github/workflows/deploy.yml  # 자동 배포
├─ index.html            # 언어 분기
├─ ko/, en/              # 랜딩 페이지
└─ app/                  # 서비스 기능
   ├─ js/app.js          # getToken, apiFetch, requireLogin
   ├─ login.html         # JWT 로그인
   ├─ upload.html        # 영상 업로드
   ├─ history.html       # 스윙 리스트
   └─ result.html        # 분석 결과 + 느낌
```

## 🔌 API 엔드포인트
```
POST   /auth/login              # JWT 발급
POST   /swings                  # 업로드 + AI 분석
GET    /swings                  # 리스트
GET    /swings/:id              # 단건 조회
POST   /swings/:id/feeling      # 느낌 저장
GET    /health                  # 헬스체크
```

## 💾 데이터베이스 (MySQL)
**위치**: EC2 localhost (MariaDB 10.5)
**DB**: inswing
**사용자**: inswing_user / inswing2025!

**테이블:**
```sql
users      # 사용자 (id, email)
swings     # 스윙 기록 (id, user_id, video_url, club_type, shot_side)
metrics    # AI 분석 결과 (swing_id, backswing_angle, impact_speed, ...)
feelings   # 사용자 느낌 (swing_id, feeling_code, note)
```

**Workbench 접속:**
```bash
# 1. SSH 터널 (터미널에서 실행, 열어둠)
ssh -i inswing-key-pair.pem -L 3307:localhost:3306 ec2-user@43.200.111.14 -N

# 2. Workbench 설정
Connection Method: Standard (TCP/IP)
Hostname: 127.0.0.1
Port: 3307
Username: inswing_user
Password: inswing2025!
```

## 🚀 배포
### 프론트 (자동)
```bash
git add .
git commit -m "Update"
git push  # → GitHub Actions → S3 sync → CloudFront 무효화
```

### 백엔드 (수동)
```bash
ssh -i inswing-key-pair.pem ec2-user@43.200.111.14
cd ~/inswing-api
git pull
npm install
pm2 restart inswing-api
```

## 📋 다음 작업
🔲 페이지 디자인 (우선순위)
   - upload.html (업로드 폼 + 프리뷰)
   - history.html (카드 레이아웃)
   - result.html (비디오 + 분석 + 느낌)
🔲 느낌 저장 기능 테스트
🔲 실제 OAuth (구글/카카오)
🔲 AI 분석 서버 연동
🔲 S3 영상 저장
🔲 RDS 마이그레이션