// API Base URL
const API_BASE = 'https://api.inswing.ai';

// 1. 토큰 관리
function getToken() {
  return localStorage.getItem('inswing_token');
}

function setToken(token) {
  localStorage.setItem('inswing_token', token);
}

// 2. 로그인 체크
function requireLogin() {
  const token = getToken();
  if (!token) {
    alert('로그인이 필요합니다.');
    window.location.href = '/app/login.html';
    return null;
  }
  return token;
}

// 3. API 호출
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  
  const config = {
    ...options,
    headers
  };
  
  try {
    const response = await fetch(API_BASE + path, config);
    return response;
  } catch (error) {
    console.error('API 호출 실패:', error);
    throw error;
  }
}

// 4. URL 쿼리 파라미터 가져오기
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 5. 로그아웃
function logout() {
  if (!confirm('로그아웃 하시겠습니까?')) {
    return;
  }
  
  try {
    localStorage.removeItem('inswing_token');
    localStorage.removeItem('inswing_user');
    window.location.href = '/app/login.html';
  } catch (e) {
    console.error('로그아웃 실패:', e);
    window.location.href = '/app/login.html';
  }
}

// 6. 현재 페이지 활성화 표시
function setActiveNav() {
  const path = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (path.includes(href)) {
      link.classList.add('active');
    }
  });
}

// 페이지 로드 시 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setActiveNav);
} else {
  setActiveNav();
}