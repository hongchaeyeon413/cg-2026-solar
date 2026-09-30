## 1. GitHub Pages 실행 주소 및 조작법

### 1-1. 기본 버전 (Baseline)

- 실행 주소: [https://your-github-id.github.io/repository-name/week4/baseline/](https://your-github-id.github.io/repository-name/week4/baseline/)
- 조작법:

    - 마우스 좌클릭 + 드래그: 모델 중심 회전 (trackball rotate)
    - 마우스 우클릭 + 드래그: 화면 평면 이동 (pan)
    - 마우스 휠 스크롤: 줌 인 / 줌 아웃 (zoom in / out)
    - 화면의 Preset 버튼 클릭: 지정된 관찰 위치로 순간 이동

### 1-2. 개선 버전 (Improved)

- 실행 주소: [https://your-github-id.github.io/repository-name/week4/improved/](https://your-github-id.github.io/repository-name/week4/improved/)
- 조작법:

    - 기존 트랙볼 조작 유지: 마우스 좌클릭, 우클릭, 휠로 자유롭게 탐색할 수 있습니다.
    - 관찰 지점 프리셋 버튼 (`P1` ~ `P6`, `O1` ~ `O2`, 전체 보기): 화면 상단이나 측면 패널의 버튼을 누르면, 시야가 가려지지 않는 시점과 거리로 카메라가 부드럽게 이동(smooth transition)합니다.
    - 투영 방식 전환 토글 (Perspective ↔ Orthographic): 버튼 한 번으로 원근 투영과 직교 투영을 바꿔서, 정면과 측면 정렬 비교를 쉽게 합니다.
    - 카메라 속도/감도 조절기 또는 Reset 버튼: 줌 감도를 보정하고, 길을 잃었을 때 한 번에 처음 전체 보기 상태로 돌아옵니다.


## 2. 기존 트랙볼 조작 방식 관찰 시간 및 불편점 분석

### 2-1. 관찰 지점별 탐색 시간 측정 결과

[기본 트랙볼 뷰어](https://cg.catholic.ac.kr/~mgchoi/CG/demos/d04-inspection.html)에서 지정된 8개 관찰 지점을 마우스 트랙볼 조작만으로 찾아가며 소요 시간을 측정했습니다.

| 관찰 지점 | 확인할 정보와 위치 | 소요 시간 |
| --- | --- | --- |
| `P1` | 본관 입구 안내 (동 이름, 층수) | 6초 |
| `P2` | 1층 안쪽 밸브 (식별 번호, 상태) | 19초 |
| `P3` | 2층 제어함 (작은 명판의 회로 번호) | 18초 |
| `P4` | 옥상 서비스 장치 (장치 이름, 점검 주기) | 12초 |
| `P5` | 별관 펌프 (제한 온도) | 18초 |
| `P6` | 전면 패널 정렬 (상단 높이, 폭 비교) | 25초 |
| `O1` | 전면 패널 정렬 (직교 뷰 비교) | 18초 |
| `O2` | 측면 돌출 비교 (전면 끝 돌출 비교) | 20초 |
| 전체 | 8개 지점 총 탐색 시간 | **136초 (약 2분 16초)** |

### 2-2. 상세 불편 사항 및 원인 분석

1. **줌(Zoom) 반응이 느리고 거리가 답답하게 줄어듦 (`P2` 등)**

    - **상태**: 마우스 휠을 많이 돌려도 조작 감도가 작아서, 모델과의 거리가 아주 조금씩만 가까워집니다.
    - **문제점**: 1층 안쪽 밸브처럼 건물 깊숙이 있는 세부 부품을 볼 때 답답하고 시간이 지연됩니다.

2. **회전 축이 부자연스럽고 의도치 않게 대각선으로 움직임 (`P6`)**

    - **상태**: 수평이나 수직으로 회전하려 해도 마우스 궤적에 따라 화면이 삐딱하게 돌거나 대각선으로 틀어집니다.
    - **문제점**: 시점을 일직선으로 맞추기 어렵고 카메라 축이 비틀어져서, 정밀한 뷰 위치를 잡는 데 25초로 가장 오래 걸렸습니다.

    ![P6으로 가는 도중 불편함](images/불편2.png)

3. **벽, 난간, 구조물에 의한 시야 가림(`P2`)**

    - **상태**: 건물 내부 부품이나 2층, 옥상 장치를 보려 할 때 앞쪽의 외벽, 난간, 다른 층 구조물이 시야를 막습니다.
    - **문제점**: 장애물을 피해 카메라를 안쪽으로 밀어 넣으려고 불필요하게 복잡한 회전과 이동을 반복해야 합니다.

    ![P2를 가는 도중 불편함](images/불편3.png)

4. **공간적 맥락(spatial context) 상실**

    - **상태**: 작은 글씨나 명판을 읽으려고 극단적으로 줌인하면 화면 전체가 그 명판으로 가득 찹니다.
    - **문제점**: 정보를 확인한 직후 내가 건물의 어느 층, 어느 구역에 있는지 알 수 없게 되어, 전체 보기와 줌인을 번갈아 반복해야 합니다.

    ![확대와 줌인의 불편함](images/불편4.png)

## 3. 사용자·관찰 목표 및 대안 비교·최종 설계

### 3-1. 사용자 및 관찰 목표

- **타겟 사용자**: 시설을 처음 접하는 검수자가 복합 연구시설 안의 주요 점검 부품(밸브, 제어함, 펌프 등)의 위치와 명판 정보를 빠르고 정확하게 확인해야 하는 상황
- **관찰 목표**: 트랙볼 조작의 비틀림이나 답답함 없이, 벽·난간에 가려진 내부 세부 장치에 바로 접근하고, 건물 전체에서 내가 어디에 있는지(맥락)를 계속 알 수 있게 하는 것

### 3-2. 대안 스케치 및 장단점 비교 (기본 조작의 불편점 기준)

| 구분 | 대안 A — 측면 고정 UI 패널 | 대안 B — 우측 하단 네비게이터 미니맵 |
| --- | --- | --- |
| 개념 | 화면 가장자리에 `P1` ~ `P6`, `O1` ~ `O2` 관찰 위치 버튼, 카메라 리셋 버튼, 투영 전환 버튼을 고정 배치 | 화면 우측 하단에 건물 전체의 2D 미니맵을 두고, 현재 카메라의 위치와 시야를 초록색 사각형으로 표시 |
| 장점 | 버튼을 한 번 누르면 장애물을 피해 최적의 관찰 시점으로 부드럽게 자동 이동 | 줌인해도 건물 전체에서 현재 위치(공간적 맥락)를 바로 알 수 있어 길 잃음 문제를 해결 |
| 단점 | 버튼 패널이 3D 화면의 일부를 계속 차지해서 화면이 답답해짐 | 미니맵만으로는 세부 부품까지 트랙볼로 일일이 이동해야 해서 조작 피로가 남음 |

### 3-3. 최종 선택 및 결합 대안: "3D 오브젝트 직접 클릭 + 네비게이터 미니맵"

**결합 및 개선 이유**

화면 측면에 고정 UI 패널을 크게 띄우면, 미니맵과 함께 있을 때 화면 공간을 지나치게 많이 차지하는 문제가 있었습니다. 그래서 UI 요소를 최소화하기 위해 두 가지를 조합했습니다.

- 3D 화면 속 건물의 해당 위치나 부품을 마우스로 **직접 클릭**하면 그 관찰 시점으로 카메라가 부드럽게 이동합니다.
- 우측 하단에는 **현재 위치를 나타내는 미니맵**을 그대로 유지했습니다.

**줄인 조작 (What operation is reduced?)**

- **불필요한 드래그와 휠 조작 감소**: 줌 감도가 낮아서 휠을 수십 번 돌리거나, 회전 축이 비틀려 대각선으로 헤매던 트랙볼 조작을 없앴습니다.
- **장애물 회피 조작 단축**: 벽이나 난간을 피해 시점을 복잡하게 돌아 이동할 필요 없이, 대상을 한 번 클릭하면 접근이 끝납니다.

**유지한 정보 (What information is maintained?)**

- **공간적 맥락 (global context)**: 3D 화면을 극단적으로 줌인해서 명판 글씨를 읽는 중에도, 우측 하단 미니맵의 초록색 영역으로 건물 전체에서 카메라의 현재 위치를 계속 확인할 수 있습니다.
- **정밀 시각 정보 (detail view)**: 클릭 한 번으로 이동하면서도, 관찰 대상(글씨, 밸브 등)이 읽기 좋은 각도와 거리로 유지됩니다.

### 3-4. 세부 카메라 연산 및 시점 설계

#### ① Eye · Target · Up 과 관찰 거리 결정

- **Target (바라보는 점)**: 선택한 부품이나 명판의 중심 3D 좌표(`P_target`)로 정합니다.
- **Eye (카메라 위치)**: 대상 명판의 법선 벡터 `N` 방향으로 거리 `d` 만큼 떨어진 곳에 둡니다. 그러면 명판을 항상 정면에서 직각으로 보게 되어 글자를 읽기 쉽습니다.
- **Up (상방 벡터)**: 건물의 수직 축 `(0, 1, 0)` 을 유지해서 화면이 뒤집히거나 기울어지지 않게 합니다.
- **관찰 거리 `d` 의 결정**: 대상의 바운딩 스피어 반지름을 `R`, 카메라 화각을 `FOV` 라 할 때, 대상이 화면에 가득 차면서 글자가 또렷하게 읽히는 거리를 아래 식으로 구합니다.

```text
Eye = P_target + N * d
d   = R / sin(FOV / 2)
```

작은 명판(`P2`, `P3` 등)은 `R` 이 작아 `d` 가 가깝게 계산되고, 옥상이나 건물 전체는 `R` 에 맞춰 `d` 가 자동으로 멀어집니다.

#### ② 자유 회전 중심 (Orbit Center)

- **전체 상태**: 건물 중심점을 기준으로 자유롭게 회전합니다.
- **대상 선택 상태**: 선택한 부품의 중심(`Target`)을 회전 중심으로 자동 재설정합니다. 세부 부품 주변을 돌려 볼 때 물체가 화면 밖으로 튕겨 나가지 않습니다.

#### ③ 직교(Orthographic)와 원근(Perspective) 투영의 구분 적용

- **Perspective (원근 투영)**: `P1` ~ `P6` 세부 명판과 건물 전체를 탐색할 때 씁니다. 깊이감과 입체감을 줍니다.
- **Orthographic (직교 투영)**: `O1` (전면 비교)과 `O2` (우측 측면 비교)로 전환할 때 씁니다. 원근에 따른 왜곡이 없어서, 전면 패널의 높이 정렬과 측면 돌출 길이를 같은 배율로 정확하게 비교할 수 있습니다.

#### ④ 가림(Occlusion), Near Clipping, 카메라 이동 경로

- **시야 가림과 시스루(see-through)**: 1층 밸브 같은 내부 부품을 볼 때는 앞을 가리는 외벽과 난간 레이어를 잠시 투명하게(alpha blending) 하거나 숨깁니다. 화면 한쪽에는 `[숨김 해제]` 상태 표시 UI를 둡니다.
- **Near Clipping Plane 보정**: 내부에 바짝 붙어 관찰할 때 벽이나 명판이 잘려 나가지 않도록 카메라 절두체(frustum)의 Near 값을 `0.01` 로 크게 줄입니다.
- **카메라 이동 경로 (smooth transition)**: 순간 이동하면 멀미가 나거나 공간 감각을 잃기 쉽습니다. 그래서 시점 사이를 이동할 때 `Eye` 와 `Target` 좌표를 구면 선형 보간(slerp)과 ease-in-out 으로 0.8초 동안 부드럽게 이동시킵니다

## 4. 구현한 카메라·투영·입력 방식

### 4-1. 카메라 시스템

**메커니즘**

- **구면 좌표계 기반 궤도(orbit) 제어**: 회전 중심점(`target`), 거리(`distance`), 방위각(`azimuth`), 고도각(`elevation`)을 조합해 관찰점을 중심으로 회전합니다.
- **관찰 거리 자동 계산**: 대상의 반경 `R` 과 시야각 `theta` (FOV)로, 대상이 화면에 알맞게 차는 거리 `d` 를 자동으로 구합니다.

```text
    d = R / sin(theta / 2)
```

- **Ease-in-out cubic 보간 애니메이션**: 시점을 옮길 때 방위각이 가장 짧은 경로로 돌도록 보정(azimuth shortest path wrapping)하고, 3차 완화 곡선(cubic ease-in-out)을 적용했습니다. 그래서 화면이 갑자기 튀지 않고 부드럽게 전환됩니다.

**대표 코드**

```javascript
// 관찰 대상 반경(R)과 FOV 기준 최적 카메라 거리 계산
function calculateCameraParams(targetPos, normalVec, radius, fovDeg = 45) {
  const fovRad = (fovDeg * Math.PI) / 180;
  const distance = Math.max(radius / Math.sin(fovRad / 2), 0.8);
  const len = Math.hypot(...normalVec) || 1;
  const normN = normalVec.map(v => v / len);

  const eyePos = [
    targetPos[0] + normN[0] * distance,
    targetPos[1] + normN[1] * distance,
    targetPos[2] + normN[2] * distance
  ];
  return { eye: eyePos, target: targetPos, distance };
}

// CUBIC Ease-In-Out 카메라 보간 이동 애니메이션
function smoothCameraTransition(targetParams, duration = 800) {
  const s = controls.state;
  const startTarget = [...s.target];
  const startDist = s.distance, startAzi = s.azimuth, startEle = s.elevation, startFov = s.fov || 45;
  const dest = cameraStateFromEyeTarget(targetParams.eye, targetParams.target);

  let diffAzi = dest.azimuth - startAzi;
  while (diffAzi > Math.PI) diffAzi -= Math.PI * 2;
  while (diffAzi < -Math.PI) diffAzi += Math.PI * 2;

  const startTime = performance.now();
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function step(now) {
    const ease = easeInOutCubic(Math.min((now - startTime) / duration, 1));
    s.target = startTarget.map((v, i) => v + (dest.target[i] - v) * ease);
    s.distance = startDist + (dest.distance - startDist) * ease;
    s.azimuth = startAzi + diffAzi * ease;
    s.elevation = startEle + (dest.elevation - startEle) * ease;
    s.fov = startFov + ((targetParams.fov || 45) - startFov) * ease;

    if ((now - startTime) / duration < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

### 4-2. 투영 방식

**메커니즘**

- **원근·직교 투영 행렬 지원**: 기본 뷰어에서는 원근(perspective) 투영 행렬을 쓰고, 카메라 옵션(`camera.orthographic`)에 따라 직교(orthographic) 행렬로 바꿀 수 있습니다.
- **행렬 곱**: 뷰 행렬과 투영 행렬을 곱해 셰이더에 넘길 통합 변환 행렬을 만듭니다.

```text
    VP = M_proj * M_view
```

- **2D 미니맵 매핑**: 3D 월드의 바운딩 박스(bounding box) 범위를 2D 캔버스 좌표로 정규화해 매핑하고, 카메라의 시선 중심점(`target`) 위치에 사각형 영역을 그려 현재 위치를 보여 줍니다.

**대표 코드**

```javascript
// WebGL 3D 투영 및 뷰 변환 행렬 구성
function drawView(camera, viewport = [0, 0, canvas.width, canvas.height]) {
  gl.viewport(...viewport);
  M.lookAt(view, camera.eye, camera.target, camera.up || [0, 1, 0]);

  if (camera.orthographic) {
    const half = camera.halfHeight || 8;
    M.ortho(projection, -half * w / h, half * w / h, -half, half, camera.near || 0.02, camera.far || 180);
  } else {
    M.perspective(projection, (camera.fov || controls.state.fov) * Math.PI / 180, w / h, camera.near || 0.02, camera.far || 180);
  }

  M.multiply(vp, projection, view);
  gl.uniformMatrix4fv(U.uVP, false, vp);
}

// 2D 미니맵 직교 좌표 투영 및 시점 영역 렌더링
function drawMinimap(camera) {
  const b = model.bounds;
  const sx = (w - 2 * pad) / (b.max[0] - b.min[0]);
  const sz = (h - 2 * pad) / (b.max[2] - b.min[2]);
  const px = x => pad + (x - b.min[0]) * sx;
  const pz = z => h - pad - (z - b.min[2]) * sz;

  const tx = px(camera.target[0]), tz = pz(camera.target[2]);
  miniCtx.fillStyle = 'rgba(34, 197, 94, 0.38)';
  miniCtx.fillRect(tx - 22, tz - 18, 44, 36);
  miniCtx.strokeStyle = '#10b981';
  miniCtx.strokeRect(tx - 22, tz - 18, 44, 36);
}
```

### 4-3. 입력 및 피킹 방식

**메커니즘**

- **광선 투사(ray casting) 기반 3D 피킹**: 뷰포트 마우스 좌표 `(u, v)` 를 카메라 FOV와 화면 비율(aspect ratio)을 반영해 3D 월드의 시선 광선(ray)으로 바꿉니다.
- **바운딩 스피어(bounding sphere) 교차 판별**: 광선과 구의 교차 방정식을 풀어서 3D 팻말(`P1` ~ `P6`, `O1` ~ `O2`)과 부품 박스에 부딪혔는지 판별합니다.

```text
    t^2 + 2bt + c = 0
```

- **통합 이벤트 처리**: 3D 화면 클릭, 미니맵 2D 영역 클릭, HTML 점검 목록 항목 클릭을 모두 하나의 `moveTo()` 진입점에 연결해서, 어느 방식으로 눌러도 같은 방식으로 카메라가 전환되게 했습니다.

**대표 코드**

```javascript
// 마우스 포인터 2D 좌표 -> 3D Ray 방향 벡터 생성
function pointerRay(e) {
  const r = canvas.getBoundingClientRect();
  const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  const tan = Math.tan((controls.state.fov) * Math.PI / 360), aspect = r.width / r.height;

  const forward = norm(sub(c.target, c.eye));
  const right = norm(cross(forward, c.up || [0, 1, 0]));
  const up = norm(cross(right, forward));

  return {
    origin: c.eye,
    direction: norm(add(add(forward, right * ((2 * u - 1) * tan * aspect)), up * ((1 - 2 * v) * tan)))
  };
}

// 3D 객체 피킹 연산 (팻말 및 부품 교차 판별)
function pick(e) {
  const ray = pointerRay(e);
  let best = null;

  for (const s of signs) {
    const radius = Math.max(s.size[0], s.size[1], 1.2) * 0.8;
    const t = raySphere(ray, s.position, radius);
    if (t < Infinity && (!best || t < best.t)) {
      best = {
        t, point: s.position,
        normal: [Math.sin(s.yaw || 0), 0.2, Math.cos(s.yaw || 0)],
        radius, id: s.id
      };
    }
  }
  return best;
}
```