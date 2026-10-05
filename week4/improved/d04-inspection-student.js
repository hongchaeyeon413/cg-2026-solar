/* 학생 확장 시작점. 여기에 본인이 설계한 관찰 인터페이스를 구현하세요.
   제공 기준 버전은 이 파일을 비워 둔 상태입니다.

   const viewer = window.InspectionViewer;
   viewer.controls.state: target, distance, rotation(쿼터니언), fov
   viewer.controls.camera(): 현재 eye/target/up
   viewer.controls.home(): 기본 카메라로 복귀
   viewer.model.poi: 주요 지점의 id/name/position/size/yaw/group
   viewer.model.comparisons: O1/O2 비교 대상 members와 관찰 방향 viewDirection
   viewer.model.tasks: 표지 관찰 6건 + 직교 비교 2건
   viewer.hidden: 일시적으로 숨길 id 또는 group을 담는 Set
   viewer.drawView({eye,target,up,fov,orthographic,halfHeight}, [x,y,w,h])
     : viewport는 CSS 픽셀이 아닌 canvas.width/height 기준, 원점은 왼쪽 아래
   viewer.render = (viewer) => { ... } : 기본 한 화면 그리기를 대체할 선택적 콜백
   document.querySelector('#student-ui'): 본인이 만든 UI를 넣을 자리

   기본 이벤트를 바꾸려면 d04-inspection-controls.js를 수정해도 됩니다.
   중요한 정보는 실제 구조물과 함께 관찰하도록 하고, 답만 목록에 표시하지 마세요.
*/


/* 학생 확장 구현: 3D 오브젝트 직접 클릭 인터페이스 */
/**
 * d04-inspection-student.js
 * 세부 카메라 연산 및 시점 설계 반영
 */
/**
 * d04-inspection-student.js
 * 구면 좌표계 카메라 애니메이션 및 3D 인터랙션 보완
 */
/**
 * d04-inspection-student.js
 * P1~P6, O1~O2 및 각 부품 시점 이동 컨트롤러
 */
(() => {
  'use strict';

  window.addEventListener('load', () => {
    const viewer = window.InspectionViewer;
    if (!viewer) return;

    const { controls, model, hidden } = viewer;

    let animId = null;
    let isAnimating = false;

    // --- UI: 외벽/지붕 숨김 토글 버튼 ---
    const stage = document.querySelector('.stage');
    const hideToggleBtn = document.createElement('button');
    hideToggleBtn.id = 'hide-toggle-btn';
    hideToggleBtn.style.cssText = `
      position: absolute;
      top: auto;
      bottom: 52px;
      left: 14px;
      z-index: 20;
      padding: 6px 12px;
      background: rgba(31, 111, 235, 0.9);
      color: #ffffff;
      border: 1px solid #5ca8fa;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    stage.appendChild(hideToggleBtn);

    function updateHideToggleLabel() {
      const isHidden = hidden.has('structure') || hidden.has('roof');
      hideToggleBtn.textContent = isHidden ? '👁 외벽/지붕 보이기' : '◉ 외벽/지붕 숨기기';
      hideToggleBtn.setAttribute('aria-pressed', String(isHidden));
    }

    hideToggleBtn.addEventListener('click', () => {
      const isHidden = hidden.has('structure') || hidden.has('roof');
      if (isHidden) { hidden.delete('structure'); hidden.delete('roof'); }
      else { hidden.add('structure'); hidden.add('roof'); }
      updateHideToggleLabel();
    });
    updateHideToggleLabel();

    // 구면 좌표계 변환 함수
    function cameraStateFromEyeTarget(eye, target) {
      const dx = eye[0] - target[0];
      const dy = eye[1] - target[1];
      const dz = eye[2] - target[2];
      const distance = Math.hypot(dx, dy, dz) || 0.001;
      const elevation = Math.asin(Math.max(-1, Math.min(1, dy / distance)));
      const azimuth = Math.atan2(dx, dz);
      return { distance, elevation, azimuth, target: [...target] };
    }

    // 시점 이동거리 d = R / sin(FOV / 2) 연산
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

    // Ease-In-Out 애니메이션 이동
    function smoothCameraTransition(targetParams, duration = 800) {
      if (isAnimating) cancelAnimationFrame(animId);
      isAnimating = true;

      const s = controls.state;
      const startTarget = [...s.target];
      const startDist = s.distance;
      const startAzi = s.azimuth;
      const startEle = s.elevation;
      const startFov = s.fov || 45;

      const dest = cameraStateFromEyeTarget(targetParams.eye, targetParams.target);

      let diffAzi = dest.azimuth - startAzi;
      while (diffAzi > Math.PI) diffAzi -= Math.PI * 2;
      while (diffAzi < -Math.PI) diffAzi += Math.PI * 2;

      const startTime = performance.now();
      const easeInOutCubic = t =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        s.target[0] = startTarget[0] + (dest.target[0] - startTarget[0]) * ease;
        s.target[1] = startTarget[1] + (dest.target[1] - startTarget[1]) * ease;
        s.target[2] = startTarget[2] + (dest.target[2] - startTarget[2]) * ease;

        s.distance = startDist + (dest.distance - startDist) * ease;
        s.azimuth = startAzi + diffAzi * ease;
        s.elevation = startEle + (dest.elevation - startEle) * ease;
        s.fov = startFov + ((targetParams.fov || 45) - startFov) * ease;

        s.near = targetParams.near || 0.01;
        s.orthographic = !!targetParams.orthographic;
        if (targetParams.halfHeight) s.halfHeight = targetParams.halfHeight;

        if (progress < 1) {
          animId = requestAnimationFrame(step);
        } else {
          isAnimating = false;
        }
      }

      animId = requestAnimationFrame(step);
    }

    // P1~P6, O1~O2, V1~V4 등 시점 이동 보완 함수
    function moveTo(hit) {
      if (!hit) return;
      const rawId = hit.id || hit.label || '';
      const id = rawId.split(' ')[0]; // P1, O1 등 ID 추출

      if (id === 'O1') {
        // O1-A와 O1-B 명판을 함께 보는 본관 전면 직교 시점입니다.
        smoothCameraTransition({
          eye: [-5.3, 2.6, 18],
          target: [-5.3, 2.6, 6],
          fov: 45,
          near: 0.01,
          orthographic: true,
          halfHeight: 3.4
        });
      } else if (id === 'O2') {
        // O2-A와 O2-B 명판을 함께 보는 별관 오른쪽 측면 직교 시점입니다.
        smoothCameraTransition({
          eye: [23, 4.75, -0.3],
          target: [10.8, 4.75, -0.3],
          fov: 45,
          near: 0.01,
          orthographic: true,
          halfHeight: 3.4
        });
      } else {
        // P1~P6, V1~V4 및 개별 부품 시점
        const signPart = model.signs.find(s => s.id === id);
        const boxPart = model.boxes.find(b => b.id === id);
        const part = signPart || boxPart;

        const pos = hit.point || (part ? part.position : [0, 1.5, 0]);
        let normal = hit.normal || [0, 0.2, 1];

        if (signPart && signPart.yaw !== undefined) {
          normal = [Math.sin(signPart.yaw), 0.2, Math.cos(signPart.yaw)];
        }

        const radius = hit.radius || (part && part.size ? Math.max(...part.size) * 0.8 : 0.8);

        // 건물 내부 장비 시스루 가림 처리
        if (id.includes('V') || (part && part.group === 'equipment') || pos[1] < 1.2) {
          hidden.add('roof');
          hidden.add('structure');
          updateHideToggleLabel();
        }

        const params = calculateCameraParams(pos, normal, radius, 40);
        smoothCameraTransition({
          eye: params.eye,
          target: params.target,
          fov: 40,
          near: 0.01,
          orthographic: false
        });
      }

      const focusStatus = document.querySelector('#focus-status');
      if (focusStatus) {
        focusStatus.textContent = `🎯 ${id} 관찰 시점으로 이동 중`;
      }
    }

    window.InspectionStudent = { moveTo };

    // --- 점검 목록 클릭 연동 ---
    const taskList = document.querySelectorAll('#tasks li');
    taskList.forEach((li, index) => {
      li.addEventListener('click', () => {
        taskList.forEach(item => item.classList.remove('active'));
        li.classList.add('active');

        const taskData = model.tasks[index];
        if (!taskData) return;

        const signPart = model.signs.find(s => s.id === taskData.id);
        const boxPart = model.boxes.find(b => b.id === taskData.id);
        const part = signPart || boxPart;

        const pos = part ? part.position : taskData.position || [0, 1.5, 0];
        const radius = part ? (part.size ? Math.max(...part.size) * 0.8 : 0.8) : 1.0;
        let normal = [0, 0.2, 1];

        if (signPart && signPart.yaw !== undefined) {
          normal = [Math.sin(signPart.yaw), 0.2, Math.cos(signPart.yaw)];
        }

        moveTo({
          id: taskData.id,
          point: pos,
          normal: normal,
          radius: radius,
          group: part ? part.group : 'default'
        });
      });
    });

  });
})();