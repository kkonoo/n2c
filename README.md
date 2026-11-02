# 경북대학교 세포·기질연구소 천연나노융합사업단(N2C) 홈페이지

2026 교육부 글로컬랩(거점형) 천연나노융합사업단(N2C, Natural Nano Convergence Center)의 홈페이지예요. GitHub Pages로 열고, 관리자가 공지·세미나·소식과 참여 연구원 명단을 올려요. 레이아웃과 디자인은 세포·기질연구소 홈페이지([kkonoo/cmri](https://github.com/kkonoo/cmri))와 같아요.

- 홈페이지: https://kkonoo.github.io/nc2/
- 관리자: https://kkonoo.github.io/nc2/admin.html

## 하는 일

| 화면 | 하는 일 |
| --- | --- |
| 메인 (`index.html`) | 첫 화면(표지 그림·숫자) → 공지사항·세미나 → 사업단 소식 → 비전·단계별 목표 → 핵심과제 → 인재 양성 → 참여 기관·협력. 공지·세미나·소식은 관리자가 올린 최신 글을 보여 줘요 |
| 사업단 소개 (`about.html`) | 개요(로고·비전·5대 핵심기술·글로컬랩 목표·CMRI 추진 전략·발전 단계·주관 연구소), 사업단장, 추진 체계, 참여 기관·협력 기업 11곳, 오시는 길 |
| 연구 (`research.html`) | 연구 배경(나노베지클, 대장암, 동물 EV와 식물 PDNV 비교, 선행 연구), 연구 목표, 핵심과제 3개, 대표 성과, 자율과제 5개, 단계별 로드맵, 연구 기반(공간·장비) |
| 인재 양성 (`programs.html`) | 모집 공고, 공통 프로그램, 박사후·신진연구자, 대학원생, 학부생, 고교생·지역, 의료인문학 |
| 구성원 (`people.html`) | 연구진(그룹별 책임자·공동연구원, 자율과제), 국제 협력 연구자, 참여 연구원(관리자가 넣은 명단) |
| 게시판 (`board.html`, `post.html`) | 공지사항·세미나·사업단 소식 목록과 글 보기. 목록은 쪽 번호로 나눠 보고(한 쪽에 10/25/50/100개, 기본 25개), 고정 공지는 쪽마다 맨 위에 |
| 관리자 → 게시글 | 글 쓰기·고치기·삭제, 공지 고정, 첨부 링크, 세미나 일시·장소·연사 |
| 관리자 → 구성원 | 전임연구원·박사후연구원·연구원·대학원생·행정 명단과 사진. 엑셀에서 붙여 넣기, 사진 여러 장을 파일 이름(홍길동.jpg, Gil-Dong Hong.jpg)으로 한꺼번에 넣기 |
| 관리자 → 관리자 | 관리자 추가·빼기 (구글 계정) |

- **한국어/영어**: 오른쪽 위 `EN`/`KO` 버튼. 처음에는 브라우저 언어를 따라요(한국어가 아니면 영어). 관리자가 쓴 글은 쓴 그대로 보여요.
- **밝은/어두운 화면**: 오른쪽 위 달·해 버튼. 처음에는 기기 설정을 따라요.
- 고른 값은 이 브라우저에 저장돼요(`n2c-prefs`).
- 공지 분류를 **모집**으로 쓰면 인재 양성 → 모집 공고에도 나와요.
- 사업단 소식에 사진 주소(.jpg·.png)를 첨부 링크로 넣으면 첫 사진이 메인 카드에 나와요.
- 구성원 → **연구진**(그룹 책임자·공동연구원)과 **국제 협력 연구자**는 `people.html`에 적힌 글이에요. 관리자 화면의 구성원 탭은 그 아래 **참여 연구원**만 다뤄요. 아무도 없으면 ‘준비 중’ 안내가 보여요. 사진은 관리자 화면에서 세로 3:4로 잘라 작게 줄여 Firestore에 바로 저장해요.

메일 보내기와 온라인 신청·제출은 넣지 않았어요. 필요해지면 세포·기질연구소 홈페이지의 것을 옮겨 올 수 있어요.

## 처음 설정 (한 번만)

Firebase 프로젝트 `nc2-knu`의 웹 앱 설정값은 이미 [`js/firebase-config.js`](js/firebase-config.js)에 들어 있어요. 콘솔에서 아래만 하면 돼요.

1. https://console.firebase.google.com → `nc2-knu` → **Authentication** → 시작하기 → 로그인 방법에서 **Google** 사용. 설정 → 승인된 도메인에 `kkonoo.github.io` 추가.
2. **Firestore Database** → 데이터베이스 만들기 → 위치 **asia-northeast3 (서울)**, 프로덕션 모드.
3. Firestore → 규칙 탭에 [`firestore.rules`](firestore.rules) 내용을 그대로 붙여 넣고 **게시**.
4. 첫 관리자 등록: Firestore → 데이터 → 컬렉션 시작 `admins` → 문서 ID에 관리자 구글 이메일(소문자, 예: `hong@gmail.com`) → 필드 아무거나 하나(예: `name` = 홍길동). 나머지 관리자는 관리자 페이지 → 관리자 탭에서 추가하면 돼요.
5. GitHub 저장소 Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.

Firestore를 만들기 전에는 메인과 게시판에 ‘글을 불러오지 못했어요’가 보여요. 규칙은 Firebase CLI로도 올릴 수 있어요: `firebase deploy --only firestore:rules` (프로젝트는 [`.firebaserc`](.firebaserc)의 `nc2-knu`).

## 데이터는 어디에

모두 Firestore에 있고, 누가 읽고 쓸 수 있는지는 [`firestore.rules`](firestore.rules)가 정해요.

| 컬렉션 | 내용 | 읽기 | 쓰기 |
| --- | --- | --- | --- |
| `notices`, `seminars`, `news` | 게시글 | 누구나 | 관리자 |
| `members` | 참여 연구원 (이메일도 공개돼요) | 누구나 | 관리자 |
| `admins` | 관리자 (문서 ID = 이메일) | 관리자 | 관리자 |

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 메인 |
| `about.html`, `research.html`, `programs.html`, `people.html` | 하위 페이지 |
| `board.html`, `post.html` | 게시판 목록, 글 보기 |
| `admin.html` | 관리자 |
| `css/style.css` | 공통 스타일 (색·간격 토큰은 맨 위 `:root`) |
| `css/admin.css` | 관리자 화면 스타일 |
| `js/main.js` | 언어·화면 밝기 버튼, 모바일 메뉴, 하위 페이지 안 메뉴 표시 |
| `js/live-lists.js` | 인재 양성 → 모집 공고 목록 (분류가 ‘모집’인 공지) |
| `js/members.js` | 구성원 → 참여 연구원 목록 |
| `js/firebase-config.js` | Firebase 설정값 |
| `js/firebase.js` | Firebase SDK 불러오기 |
| `js/posts.js` | 게시글 불러오기·그리기 공통 |
| `js/home.js`, `js/board.js` | 메인 최신 글, 게시판·글 보기 |
| `js/admin.js` | 관리자 로그인·탭·관리자 목록 |
| `js/admin-posts.js`, `js/admin-pager.js` | 게시글 관리, 목록 쪽 나누기 |
| `js/admin-members.js` | 구성원 관리, 사진 줄이기 |
| `firestore.rules` | Firestore 보안 규칙 |
| `firebase.json`, `.firebaserc` | Firebase CLI 설정 (프로젝트 `nc2-knu`) |
| `img/` | N2C 로고·마크·파비콘, 첫 화면 그림, 의과대학 본관 사진, 푸터 로고 |

## 글 고치기

- 한 페이지 안에 한국어와 영어가 함께 있어요. `<span lang="ko">한국어</span><span lang="en">English</span>`처럼 짝으로 쓰면 고른 언어만 보여요. 긴 문단은 `<p lang="ko">`, `<p lang="en">`로 나눠요.
- 위쪽 메뉴와 푸터는 모든 공개 페이지(`index`, `about`, `research`, `programs`, `people`, `board`, `post`)에 똑같이 들어 있어요. 메뉴나 연락처를 바꿀 때는 일곱 파일을 함께 고쳐요.
- 색은 `css/style.css` 맨 위 `:root`(밝은 화면)와 바로 아래 어두운 화면 블록에서 바꿔요. 지금은 세포·기질연구소 홈페이지와 같은 파랑·주황이에요.

## 내용 출처

| 영역 | 출처 |
| --- | --- |
| 비전·목표·핵심과제·자율과제·로드맵·추진 체계·참여 기관·연구진·인재 양성·연구 기반 | 2026 글로컬랩 발표 자료와 세포·기질연구소 홈페이지의 글로컬랩·프로그램 페이지 |
| 사업단장 약력 | 세포·기질연구소 홈페이지, 발표 자료 |
| 연락처 | 사업단 (053-420-4971, 의과대학 본관 216호) |
| 첫 화면 그림, 의과대학 본관 사진 | 발표 자료에서 잘라 냄 |
| 영어 문장, 영문 이름·기관명 | 직접 옮김. 이름·회사 영문 표기와 문장은 확인을 권해요 |
