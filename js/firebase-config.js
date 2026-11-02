// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에서 복사한 값이에요 (프로젝트 nc2-knu).
// null로 바꾸면 홈페이지는 예시 글을 보여 주고, 관리자 페이지는 설정 안내만 보여 줘요.
export const firebaseConfig = {
  apiKey: 'AIzaSyD7LxKq63bdc2-9hunoRAuFY3GZhOunRfk',
  authDomain: 'nc2-knu.firebaseapp.com',
  projectId: 'nc2-knu',
  storageBucket: 'nc2-knu.firebasestorage.app',
  messagingSenderId: '805219932182',
  appId: '1:805219932182:web:f8136cb8920c922ea73d37',
};

// 로컬 에뮬레이터로 시험할 때만 씀. 예: { auth: 'http://127.0.0.1:9099', firestore: ['127.0.0.1', 8080] }
export const emulator = null;
