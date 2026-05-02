# Location Reference Cards

책 전체에서 등장하는 구체적인 장소들의 reference image.
캐릭터 카드와 함께 페이지 프롬프트에 첨부하여 시각적 일관성 확보.

## 작업 순서

1. 이 폴더의 6개 프롬프트 파일을 순서대로 Gemini 앱(Nano Banana Pro)에 입력 (캐릭터 reference 첨부 X — 빈 장소만 생성)
2. 생성된 이미지를 `c:\Projects\WebToon\images\locations\` 폴더에 저장:
   - `realistic_house.png`
   - `living_room.png`
   - `cafe.png`
   - `bakery.png`
   - `flower_shop.png`
   - `village_square.png`
3. 각 카드 확인 → 마음에 안 드는 부분 있으면 프롬프트 조정 → 재생성
4. 6개 모두 확정되면 → 페이지 프롬프트가 이 ref 카드들을 사용하도록 업데이트

## 마을 일관성 원칙

모든 장소가 같은 **마을 색 팔레트**를 공유:
- 따뜻한 베이지 (Mr. Realistic 집)
- 더스티 핑크 (꽃집)
- 골든 베이지 (빵집)
- 소프트 브라운 (카페)
- 세이지 그린, 버터 옐로우, 소프트 테라코타 (기타 집들)

장소 간 시각 차별화는 **시그니처 디테일**로:
- Realistic 집 → 테라코타 문 + 돋보기 장식
- 카페 → 노란 글로우 큰 창문 + 크림/브라운 줄무늬 어닝
- 빵집 → 창문 안 빵 디스플레이 + 빨강/흰색 어닝
- 꽃집 → 앞에 놓인 꽃 양동이 + 초록/흰색 어닝
- 광장 → 돌우물 + 큰 나무 + 벤치

## 페이지 생성 시 사용법

각 페이지의 무대에 해당하는 location 카드를 캐릭터 카드와 함께 첨부:

| 장소 | 등장 페이지 | 첨부 |
|---|---|---|
| Mr. Realistic 집 외관 | Ch1 p01, p02, Ch2 p01 | `realistic_house.png` + 캐릭터 카드 |
| 거실 (내부) | Ch1 p13, p14 / Ch2 p02-p18 (11장) | `living_room.png` + 캐릭터 카드 |
| 카페 | Ch1 p04, p05, p06 | `cafe.png` + 캐릭터 카드 |
| 빵집 | Ch1 p09, p10 | `bakery.png` + 캐릭터 카드 |
| 꽃집 | Ch1 p09, p10 | `flower_shop.png` + 캐릭터 카드 |
| 마을 광장 | Ch1 p03 | `village_square.png` + 캐릭터 카드 |

빵집/꽃집은 페어로 등장 (분쟁 장면) — 두 카드 함께 첨부.

## 파일 목록

| 파일 | 장소 | 등장 페이지 수 |
|---|---|---|
| `01_realistic_house.md` | Mr. Realistic 집 외관 | 3 |
| `02_living_room.md` | Mr. Realistic 거실 (내부) | 13 |
| `03_cafe.md` | 카페 (외관 + 내부) | 3 |
| `04_bakery.md` | 빵집 외관 | 2 |
| `05_flower_shop.md` | 꽃집 외관 | 2 |
| `06_village_square.md` | 마을 광장 (우물) | 1 |

총 24장 페이지가 location 카드 활용 (32장 중 75%).

## 생략된 장소

- **Ch1 P07** (화내는 사람 + Mr. Rational): 의도적으로 추상적 인테리어 — 페이지 프롬프트에서 직접 묘사
- **Ch1 P08** (셋의 자신감 히어로 샷): 고지대 일회성 — 페이지 프롬프트에서 직접 묘사
- **Ch1 P11** (Rational 저울 클로즈업): 추상 배경
- **Ch1 P12** (Realistic 객관성): 중립 배경
- **Ch2 P04, P05, P09** (경기장 TV 방송): TV 베젤이 자연스럽게 일관성 잡아줌
- **Ch2 P13, P14, P16** (Mr. Bias 보이드): 의도적으로 추상적
