# 3주차 — 그래픽스 파이프라인과 셰이더

# 실습 1

완성 목표: 높은 곳에서 대각선으로 내려다보는 시점에서, 바닥이 깔린 3차원 공간에 공 하나가 공중에 떠서 천천히 도는 장면

## 6단계 — 변환 순서 비교: 자전 vs 공전

행렬의 **오른쪽부터 적용**된다는 규칙(2주차)을 직접 확인합니다.

### 자전 (기본)

```javascript
const model = M4.multiply(M4.translate(0, 1.9, 0), M4.rotateY(time * 0.8));
```

**적용 순서** (오른쪽부터):
1. **rotateY** (오른쪽): 공을 원점에서 y축으로 회전
2. **translate(0, 1.9, 0)** (왼쪽): 회전한 공을 위로 옮김

**결과**: 공이 y=1.9 자리에 고정되고 **제자리에서 도는 자전** (rotation around own center)

**표면 확인**: 경도별 밝기 차이 때문에 공이 도는 것을 확인할 수 있습니다.

![자전: 공이 제자리에서 도는 모습](images/자전.png)

### 공전 (순서 변경)

```javascript
const model = M4.multiply(M4.rotateY(time * 0.8), M4.translate(0, 2.0, 1.9));
```

**적용 순서** (오른쪽부터):
1. **translate(0, 2.0, 1.9)** (오른쪽): 공을 (0, 2.0, 1.9) 위치로 이동
2. **rotateY** (왼쪽): 이동한 공을 원점(y축) 중심으로 회전

**결과**: 공이 **y축 둘레를 큰 원으로 도는 공전** (orbit around center axis)

**주의**: 이동에 **x 성분(2.0)**이 있어야 공전이 눈에 띄게 보입니다. y 방향만 이동하면 y축으로 회전해도 위치가 바뀌지 않아 자전처럼 보입니다.

![공전: 공이 y축 둘레를 큰 원으로 도는 모습](images/공전.png)

### 왜 순서가 중요한가?

2주차의 핵심 원리: **행렬은 오른쪽부터 적용된다**.

- **회전 → 이동**: 먼저 회전하고 나서 이동하므로, 로컬 좌표축(물체 자신의 중심)을 중심으로 회전. 이동된 위치에서 제자리 회전 = **자전**
- **이동 → 회전**: 먼저 이동하고 나서 회전하므로, 월드 좌표축(세계 원점)을 중심으로 회전. 원점에서 거리를 두고 회전 = **공전**


---

## 8단계 — 프래그먼트 셰이더 예제 실험

### uTime을 사용한 시간 기반 색상 변화

시간에 따라 색이 변하는 효과를 만들었습니다. 이 예제로 `uTime` 값이 실제로 셰이더에 전달되고 있음을 확인합니다.

**셰이더 코드**

```glsl
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.45, 0.8, 0.35));
  
  float diff = max(dot(N, L), 0.0);
  
  // 시간에 따라 색상이 변함
  vec3 timeColor = vec3(
    sin(uTime * 2.0) * 0.5 + 0.5,
    cos(uTime * 2.0) * 0.5 + 0.5,
    1.0
  );
  
  fragColor = vec4(vColor * timeColor * (0.3 + 0.7 * diff), 1.0);
}
```

**동작 원리**

- `sin(uTime * 2.0)` : −1~1 범위로 진동 → `* 0.5 + 0.5`로 0~1로 변환 → 빨강 채널
- `cos(uTime * 2.0)` : `sin`보다 π/2만큼 앞당겨진 진동 → 초록 채널
- `1.0` : 파랑 채널은 항상 최대

**화면 결과**

![uTime 셰이더: 공의 색이 시간에 따라 변함](images/uTime셰이더.png)

**관찰**

공의 색이 계속 변하면서도 조명 효과(밝고 어두운 부분)는 유지됩니다. 색이 부드럽게 순환합니다. 

---

## 코드의 여섯 구역

### 1구역: 메시 데이터
```javascript
function makeBox(...) { ... }
function makeSphere(...) { ... }
```
**역할**: 정점 위치, 법선, 색, 인덱스를 계산하는 함수들입니다. CPU에서 실행되며, 화면에 그릴 형태의 배열을 반환합니다.

**예시**: `makeSphere(0.8, 64, 128, ...)`는 반지름 0.8, 정점 8,385개의 공을 만듭니다.

### 2구역: 버텍스 셰이더
```glsl
const VS_SOURCE = `#version 300 es
...
void main() { 
  vColor  = aColor;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uViewProj * uModel * vec4(aPos, 1.0);
}
`;
```

**역할**: GPU에서 각 정점마다 한 번씩 실행됩니다. 정점의 3D 좌표를 화면 2D 좌표(gl_Position)로 변환하고, 보간할 값(색, 법선)을 다음 단계로 넘깁니다.

**핵심**: `mat3(uModel) * aNormal`은 법선에 회전만 적용하고 이동은 버립니다.

### 3구역: 프래그먼트 셰이더
```glsl
const FS_SOURCE = `#version 300 es
...
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.45, 0.8, 0.35));
  float diff = max(dot(N, L), 0.0);
  fragColor = vec4(vColor * (0.3 + 0.7 * diff), 1.0);
}
`;
```

**역할**: GPU에서 각 픽셀마다 한 번씩 실행됩니다. 내적을 이용해 빛의 밝기를 계산하고, 픽셀의 최종 색(fragColor)을 결정합니다.

**핵심**: 조명 계산은 여기서 일어납니다. 법선과 광원 방향의 내적이 곧 밝기입니다.

### 4구역: WebGL 준비
```javascript
const program = createProgram(VS_SOURCE, FS_SOURCE);
const uTimeLoc = gl.getUniformLocation(program, 'uTime');
const uModelLoc = gl.getUniformLocation(program, 'uModel');
const uViewProjLoc = gl.getUniformLocation(program, 'uViewProj');

const M4 = { 
  identity, translate, scale, rotateX, rotateY, multiply 
};
```

**역할**: 
- 셰이더 코드를 컴파일하고 프로그램으로 링크합니다.
- 셰이더 내 uniform 변수의 위치를 미리 찾아두어 실행 중 빠르게 접근할 수 있게 합니다.
- 행렬 계산 도구들을 정의합니다.

**왜 필요**: Uniform 위치를 매 프레임마다 검색하는 것은 비효율적이므로, 한 번만 찾아 변수에 저장합니다.

### 5구역: 버퍼 만들기
```javascript
function createMesh(mesh) { 
  // VAO, VBO 생성
  // positions, normals, colors를 GPU 메모리로 복사
}

const ball  = createMesh(makeSphere(...));
const floor = createMesh(makeBox(...));
```

**역할**: CPU의 배열을 GPU 메모리(VBO: Vertex Buffer Object)로 복사하고, VAO(Vertex Array Object)에 저장합니다.

**결과**: `ball.vao`, `floor.vao`를 나중에 그릴 때 사용합니다.

### 6구역: 그리기 루프
```javascript
function render() {
  // 매 프레임마다 호출 (초당 60회)
  
  // 시간 계산
  const time = (performance.now() - startTime) / 1000;
  
  // 카메라 행렬 구성 (①~⑥)
  let camera = M4.identity();
  camera = M4.multiply(M4.translate(0, -1.1, 0), camera);
  // ... (②~⑥ 생략)
  const viewProj = camera;
  
  // 셰이더 프로그램 활성화
  gl.useProgram(program);
  gl.uniform1f(uTimeLoc, time);           // 시간을 전달
  gl.uniformMatrix4fv(uViewProjLoc, false, viewProj);
  
  // 바닥 그리기
  gl.uniformMatrix4fv(uModelLoc, false, M4.translate(0, -0.06, 0));
  gl.bindVertexArray(floor.vao);
  gl.drawElements(gl.TRIANGLES, floor.count, gl.UNSIGNED_SHORT, 0);
  
  // 공 그리기 (자전)
  const model = M4.multiply(M4.translate(0, 1.9, 0), M4.rotateY(time * 0.8));
  gl.uniformMatrix4fv(uModelLoc, false, model);
  gl.bindVertexArray(ball.vao);
  gl.drawElements(gl.TRIANGLES, ball.count, gl.UNSIGNED_SHORT, 0);
  
  // 다음 프레임 예약
  requestAnimationFrame(render);
}
```

**역할**: 초당 60회 반복 실행되며, 매 프레임마다:
1. 시간을 계산합니다
2. 시간에 따라 변하는 행렬을 계산합니다
3. Uniform을 GPU로 보냅니다
4. 바닥, 공을 차례로 그립니다

**흐름**: 6구역 → 2구역(버텍스 셰이더) → 3구역(프래그먼트 셰이더) → 화면에 표시


# 실습2

`