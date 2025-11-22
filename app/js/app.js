// /app/js/app.js
const API_BASE = 'https://api.inswing.ai';

// 1. 토큰 가져오기
function getToken() {
  try {
    return localStorage.getItem('inswing_token');
  } catch (e) {
    return null;
  }
}

// 2. 로그인 체크
function requireLogin() {
  const token = getToken();
  if (!token) {
    alert('로그인이 필요합니다.');
    window.location.href = '/app/login.html';  // 변경
  }
  return token;
}

// 3. 공통 fetch 헬퍼
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(API_BASE + path, {
    ...options,
    headers,
  });
}

// 4. URL에서 쿼리스트링 파라미터 가져오기
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
