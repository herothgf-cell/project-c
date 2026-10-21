# 웹 프로토타입 v0.1.0 검증 기록

- 확인일: 2026-10-21
- 상태: **구현, 자동 실행 테스트, GitHub Pages 배포 완료**. 외부 사람의 재미 검증은 미실시.
- 플레이: https://herothgf-cell.github.io/project-c/
- 구현 PR: https://github.com/herothgf-cell/project-c/pull/1 (main 병합 완료)
- 배포된 게임 커밋: `3e602a4e1c2f7bd1970555dd3563b695a4b11150`

## 구현한 내용
- P01 최신 관련 기억 선택, P02 사건을 사용한 후 삭제하는 순서, P03 소유자가 다른 기억의 독립성.
- 실제 세계와 믿음의 분리, 결정론적 동시 실행, 오배송 우선 실패, Unknown 대기.
- 삭제/실행 단위 전체 상태 Undo, Restart, 결과의 지속성.
- 시작/이어하기/규칙, 기억 카드 선택 및 삭제 전 판단 미리보기, 로봇 선택, 행동 로그, 힌트.
- 짧은 이야기 도입/방별 결말, 공개 공지·내부 보관 및 다시 선택.
- 저장소 오류 fallback, 새 게임 초기화 확인, 모바일 대응, 키보드, 선택적 효과음.

## 로컬 검증
`npm test`: **25개 통과 / 0개 실패** (Node.js v22.16.0).
규칙 테스트 18개 + 저장 테스트 6개 + 빌드 테스트 1개.

검증 범위: 문서 T01~T14, 불변성·결정론, 삭제 중 시간 정지, 사건 전체 삭제, 완료 배송 중복 방지, terminal 명령 거부, P02의 최초 삭제 조합 8개가 순서 개입 없이 성공하지 못함.

Playwright/Chromium 로컬 **메모리 내 DOM 렌더 모드**: 7개 시나리오 그룹 통과, page error 0.
이 실행 환경의 Chromium은 URL 접근을 차단하므로 정책을 변경하지 않고 자체 HTML/CSS/JS만 인메모리로 렌더했습니다. 이 로컬 테스트의 저장은 테스트용 stand-in입니다. 이를 실제 HTTP 오리진/실물 휴대폰 검증이라고 보고하지 않습니다.

## GitHub CI: 실제 HTTP 서버와 브라우저 저장소 검증
PR 검증 실행: https://github.com/herothgf-cell/project-c/actions/runs/39562618032
main 검증 및 배포 실행: https://github.com/herothgf-cell/project-c/actions/runs/39562984244

두 실행 모두 테스트/빌드가 성공했습니다. PR의 로그에서 Node.js 22.23.3, Python 3.12.15, Playwright 1.55.0 / Chromium 140.0.7339.16을 확인했습니다.

프로덕션 빌드 `dist/`를 실제 localhost HTTP 서버로 제공하고, `OFFLINE_RENDER` 없이 실제 브라우저 localStorage를 사용했습니다. 자동 테스트 **25/25 통과**, 브라우저 **7개 시나리오 그룹 통과**, **page error 0**.

1. 실패 → Undo → Restart
2. Delete / Z / E / R 키보드 조작
3. 데스크톱 3개 퍼즐과 양쪽 결말, 새로고침 후 이어하기
4. 도움말과 새 게임 취소
5. 390px 터치 에뮬레이션에서 3개 퍼즐과 결말, 가로 넘침 없음
6. 손상 저장/저장소 접근 차단 fallback
7. 360 / 768 / 1280px 시작 화면 가로 넘침 검사

화면 캡처와 `browser-report.json`은 각 실행의 `browser-test-evidence` 아티팩트에 포함됩니다(보관 기간 14일). PR 실행의 HTTP 모드 보고서를 다운로드해 확인했고 데스크톱 캡처도 시각적으로 점검했습니다.

## 웹 배포 및 공개 파일 확인
워크플로: `.github/workflows/pages.yml`.
main 실행 `39562984244`의 **test / deploy 두 작업 모두 success**.
배포 작업: https://github.com/herothgf-cell/project-c/actions/runs/39562984244/job/119098739020

2026-10-21 07:35:59 UTC 배포 작업 로그에서 다음 결과를 확인했습니다.

```text
LIVE VERIFIED: https://herothgf-cell.github.io/project-c/ — all 6 assets match tested source
```

`index.html`, `app.js`, `engine.js`, `content.js`, `storage.js`, `style.css`를 공개 URL에서 HTTP 200으로 받아 SHA-256이 테스트한 소스와 동일함을 검증했습니다. 빌드 산출물은 `public/`의 정적 파일과 `.nojekyll`만 포함합니다. 테스트 성공에 의존해 배포하며, main의 게임 코드 변경 시 이 검증이 반복됩니다. docs/README만 변경하면 재배포하지 않습니다.

공개 사이트를 이 대화의 웹 열기 도구로도 확인하려 했으나 해당 도구에서는 접근 불가 응답을 받았습니다. 따라서 공개 접속 확인 근거는 위 CI의 실제 HTTP 응답·파일 일치 검사이며, 이 환경에서 공개 URL을 브라우저로 직접 플레이했다고 주장하지 않습니다.

## 검토와 한계
독립된 외부 리뷰어/사람 플레이테스트는 수행하지 않았습니다. 자체 코드 검토 및 자동 테스트 결과입니다.

현재 저장은 방 단위입니다. 다음 버튼을 누르기 전 성공을 되돌리면 완료 이력이 확정되지 않습니다. 새로고침은 현재 방의 중간 상태를 초기화합니다. 네이티브 모바일·Safari·실제 휴대폰·음향 장치별 검증, 정량적 이해도·재미 평가는 남아 있습니다.

이번 구현은 HTML/CSS/JavaScript 웹 프로토타입이며 Godot 프로젝트가 아닙니다. 기존 기획 파일은 원문 보존했습니다. 이후 Godot 이식에는 재구현·재검증이 필요합니다.
