# 망각 설계자 · Project C

> 필요한 과거는 남기고, 나머지는 지우세요.

기획 v0.3의 규칙을 구현한 **웹 프로토타입 v0.1.0**입니다. 3개 퍼즐, 기억 카드 9장, 배송 로봇 2종, 최종 보고 2종을 포함합니다.

**배포 주소:** https://herothgf-cell.github.io/project-c/  
배포의 실제 성공/실패는 [GitHub Actions](https://github.com/herothgf-cell/project-c/actions) 및 [검증 기록](docs/implementation/web-prototype-validation.md)에서 확인합니다.

## 플레이

1. 실제 주민 위치와 로봇의 기억을 살펴봅니다.
2. 기억 카드를 선택한 뒤 **선택한 장면 지우기**를 누릅니다. 삭제만으로 시간은 흐르지 않습니다.
3. **한 단계 실행**을 누르면 모든 로봇이 남은 최신 기억에 따라 행동합니다.
4. 실패해도 **되돌리기**와 **다시 시작**이 가능합니다.

PC: 마우스 / E 실행 / Z 되돌리기 / R 재시작 / Delete 선택 카드 삭제. 모바일: 터치 조작.

완료한 방과 최종 보고는 브라우저에 저장됩니다. 진행 중인 방의 삭제·실행 이력은 새로고침 시 초기화됩니다. 다음 방/최종 보고로 진행할 때 완료를 확정합니다. 계정·서버·분석 도구·외부 런타임 리소스는 없습니다.

## 로컬 실행

Node.js 22 이상. 런타임 npm 의존성이 없어 `npm install`이 필요하지 않습니다.

```sh
npm test
npm run dev
# http://127.0.0.1:4173/
npm run build
# 배포 파일: dist/
```

HTTP 기반 브라우저 테스트(별도 터미널에서 서버를 실행):

```sh
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tests/browser_smoke.py
```

`BASE_URL`로 다른 서버/배포 주소를 지정할 수 있습니다. `OFFLINE_RENDER=1`은 네트워크 제한 환경의 DOM 검증용이며, HTTP/실제 저장소 검증과 구분합니다. 테스트 결과와 화면 캡처는 `test-results/`에 생성됩니다.

## 기술 선택과 범위

기존 문서의 Godot 2D + GDScript는 **미확정 후보**였습니다. 이번 작은 링크 공유용 검증 버전은 HTML/CSS/JavaScript로 구현했습니다. Godot 프로젝트 또는 네이티브 앱이 아닙니다. 규칙을 UI와 분리했지만, 이후 Godot 이식에는 재구현·재검증이 필요합니다.

실행 중 새 기억 습득, 이동·충돌, 본편 확장 스테이지, 상업 패키지 및 외부 사람의 재미 검증은 포함하지 않습니다.

## 파일 구조

```text
public/           콘텐츠·순수 퍼즐 규칙·저장·플레이 화면
scripts/          정적 빌드·로컬 서버·공개 배포 바이트 검증
tests/            규칙/저장/빌드 자동 테스트 + 실제 클릭 브라우저 테스트
.github/workflows/ 테스트 통과 후 GitHub Pages 배포
docs/             기존 기획 + 구현 결정 및 검증 기록
```

## 기획과 구현 문서

- [핵심 기획 v0.3](docs/game-design/core-design-v0.3.md)
- [세계관·스토리·콘텐츠](docs/prototype/story-content-v0.1.md)
- [프로토타입 개발 로드맵](docs/prototype/development-roadmap-v0.1.md)
- [이번 구현 계획 및 기술 결정](docs/implementation/web-prototype-plan.md)
- [검증 결과와 남은 한계](docs/implementation/web-prototype-validation.md)

기존 기획 문서는 원문 보존합니다. 이 README와 구현 기록이 현재 구현 상태를 설명하며, 외부 플레이테스트의 재미/이해도 검증이 완료됐다는 뜻은 아닙니다.
