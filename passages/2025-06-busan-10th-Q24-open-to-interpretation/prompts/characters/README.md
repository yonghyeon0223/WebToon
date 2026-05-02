# Character Reference Cards

Mr. Realistic 시리즈에 등장하는 6명의 캐릭터를 **각각 1장씩** 생성하여 reference image로 사용합니다.

## 작업 순서

1. 이 폴더의 6개 프롬프트 파일을 차례대로 Gemini 앱(Nano Banana Pro)에 입력
2. 생성된 이미지를 `c:\Projects\WebToon\images\characters\` 폴더에 저장
   - 파일명: `mr_realistic.png`, `mr_logical.png`, `mr_rational.png`, `mr_red.png`, `mr_blue.png`, `mr_bias.png`
3. 각 카드 확인 후 마음에 안 드는 부분 메모 → 프롬프트 조정 후 재생성
4. 6장 모두 확정되면 → 페이지별 프롬프트 생성 단계로 진행

## 페이지 생성 시 사용법

각 페이지의 장면에 등장하는 캐릭터의 카드만 reference image로 첨부합니다.
Nano Banana Pro는 다중 reference image를 지원하므로, 한 장면에 3명이 나오면 그 3명의 카드를 함께 첨부.

예: Chapter 1 차 마시는 장면 → `mr_realistic.png` + `mr_logical.png` + `mr_rational.png` 첨부

## 파일 목록

| 파일 | 캐릭터 | 등장 |
|---|---|---|
| `01_realistic.md` | Mr. Realistic | Ch1 전체, Ch2 전체 |
| `02_logical.md` | Mr. Logical | Ch1 중반~, Ch2 전체 |
| `03_rational.md` | Mr. Rational | Ch1 중반~, Ch2 전체 |
| `04_red.md` | Mr. Red | Ch2 전체 |
| `05_blue.md` | Mr. Blue | Ch2 전체 |
| `06_bias.md` | Mr. Bias | Ch2 후반 |
