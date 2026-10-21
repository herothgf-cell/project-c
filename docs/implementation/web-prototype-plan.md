# 망각 설계자 웹 프로토타입 구현 계획

**Goal:** v0.3의 퍼즐 3개와 2종 결말을 브라우저에서 플레이하고 테스트 후 GitHub Pages에 게시한다.
**Architecture:** 정적인 ES modules 앱. 콘텐츠, 순수 상태 전이, 세이브, DOM UI를 분리한다. 외부 폰트/이미지/CDN/서버/계정 없이 실행한다.
**Tech Stack:** HTML/CSS/JavaScript, Node.js 22 내장 테스트 러너, Playwright Python (브라우저 검증), GitHub Actions/Pages.
**Spec:** `docs/game-design/core-design-v0.3.md`, `docs/prototype/story-content-v0.1.md`.

## 결정 기록
- 사용자 요청: 구현·실행 테스트·웹 배포까지 진행. 기획서를 다시 제안하고 멈추지 않는다.
- 엔진은 이전 기획에서 미확정. 이번 검증 버전은 웹 접근성 및 작은 규칙 엔진에 맞춰 엔진 없는 웹 구현으로 선정. Godot 프로젝트를 만들었다고 표현하지 않는다. 이후 Godot 이식 시 로직은 재구현과 재검증이 필요하다.
- 기존 기획 파일은 보존한다. 현재 원격 기준 커밋 `327b070ac15a2de45783ccd57e9719acad4067bf`.
- 로컬은 네트워크 연결이 안 되는 격리된 신규 작업 디렉터리. 원격 조회/쓰기는 연결된 GitHub 도구로 수행하고 기존 tree를 기준으로 파일을 추가한다.
- 저장은 마지막으로 **확정한** 완료 방, 현재 방 번호, 최종 보고 선택. 중간 삭제/실행/Undo 이력은 새로고침 후 보존하지 않으며 이를 UI에서 알린다. 성공 화면의 되돌리기가 캠페인 완료 기록을 남기지 않도록 다음 방/보고 버튼을 눌렀을 때 완료를 확정한다.

## 불변 조건
- 목적·능력 고정, 최신 **획득순** 사실 선택, 사건 전체 삭제, 소유자별 독립.
- 삭제는 턴을 진행하지 않으며 실행은 모든 로봇의 행동을 실행 직전 상태로 결정.
- 오배송 우선 실패, Unknown이면 순번을 건너뛰지 않고 대기.
- 삭제/실행 각각 Undo 1회. 실패·성공 상태도 복원. 재시작은 방 이력 제거.
- P01 2장, P02 3장, P03 4장; 정답은 문서의 데이터와 같다.

## Review focus
1. 잘못된 저장 JSON/구버전 저장/저장소 접근 거부 → 안전한 초기 상태, 저장 실패 안내.
2. P02 첫 배송 후 Undo → 배송·로그·턴까지 복원, 완료 기록에 영향 없음.
3. 실패·성공 뒤 키보드 반복 입력 → 삭제/실행 불가, Undo만 허용.
4. 360px 화면, 키보드·터치, 결과 화면 → 가로 잘림·누락된 버튼 없음.
5. 프로젝트 경로 `/project-c/` 아래 배포 → 모든 상대 경로 정상, 외부 런타임 의존성 없음.

## 작업
- [x] 1. 규칙/콘텐츠: `public/content.js`, `public/engine.js`; `createState`, `belief`, `transition`을 Node 테스트로 구현. P01~P03 성공/오답/Unknown, 불변성, 동시 처리, Undo/Restart, 모든 P02 선삭제 조합 검사.
- [x] 2. 저장: `public/storage.js`; `freshProgress`, `readProgress`, `writeProgress`, `completeStage`. 손상/차단/경로 복구 검사.
- [x] 3. UI: `public/index.html`, `public/style.css`, `public/app.js`. 시작/기억 카드/방/현재 근거/실행 로그/결과/기록 선택. 모바일·접근성·소리.
- [x] 4. 빌드 및 브라우저: `scripts/build.mjs`, `scripts/serve.mjs`, `tests/browser_smoke.py`. 실제 클릭으로 세 방과 양쪽 결말, 새로고침 저장, 실패 Undo, 모바일 완료 확인.
- [ ] 5. 배포: `.github/workflows/pages.yml`; 테스트 성공에 의존한 배포. 원격 변경 충돌 확인 후 main에 반영. Actions 로그와 공개 URL 확인. 실패 시 미완료 부분을 분리 기록.

## 검증 명령
`npm test`, `npm run build`, `npm run dev`, `python tests/browser_smoke.py`.
브라우저 테스트는 엔진의 테스트 전용 API를 주입하지 않고 실제 버튼/카드 선택으로 진행한다.

## 진행 기록
규칙·저장·화면 구현과 로컬 검증 완료. 독립 리뷰어 대신 자체 검토. 공개 배포는 CI 및 공개 자산 확인 후 별도로 기록한다.
