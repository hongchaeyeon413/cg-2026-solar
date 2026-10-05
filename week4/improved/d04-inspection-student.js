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
/* =========================================================
   Week 4 3D Inspection Viewer - Student Extension
   공간 인식 개선 버전

   주요 개선:
   1. 팻말/장비 클릭 시 적절한 근접 관찰 시점으로 이동
   2. 근접 관찰 중에도 오른쪽 아래 미니맵으로 전체 공간 확인
   3. 현재 카메라 위치 표시
   4. 팻말을 누르기 전 위치 표시
   5. 현재 관찰 대상(P1~P6/O1/O2) 표시
   6. 현재 층 정보 표시
   7. 카메라 방향 표시
   8. 전체 보기 버튼 제공
   9. 기존 외벽/지붕 숨기기 기능 유지
   ========================================================= */

(() => {
  'use strict';

  window.addEventListener('load', () => {

    const viewer = window.InspectionViewer;
    if (!viewer) return;

    const { controls, model, hidden } = viewer;

    let animId = null;
    let isAnimating = false;

    /* =====================================================
       1. 기본 DOM
       ===================================================== */

    const stage = document.querySelector('.stage');

    if (!stage) return;


    /* =====================================================
       2. 현재 관찰 상태
       ===================================================== */

    let currentFocusId = null;

    // 팻말을 누르기 전 카메라 위치
    let previousCameraPosition = null;

    // 현재 카메라 위치
    let currentCameraPosition = null;


    /* =====================================================
       3. 외벽 / 지붕 숨기기 버튼
       ===================================================== */

    const hideToggleBtn = document.createElement('button');

    hideToggleBtn.id = 'hide-toggle-btn';

    hideToggleBtn.style.cssText = `
      position: absolute;
      bottom: 52px;
      left: 14px;
      z-index: 20;

      padding: 7px 12px;

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

      const isHidden =
        hidden.has('structure') ||
        hidden.has('roof');

      hideToggleBtn.textContent =
        isHidden
          ? '👁 외벽/지붕 보이기'
          : '◉ 외벽/지붕 숨기기';

      hideToggleBtn.setAttribute(
        'aria-pressed',
        String(isHidden)
      );
    }


    hideToggleBtn.addEventListener('click', () => {

      const isHidden =
        hidden.has('structure') ||
        hidden.has('roof');

      if (isHidden) {

        hidden.delete('structure');
        hidden.delete('roof');

      } else {

        hidden.add('structure');
        hidden.add('roof');

      }

      updateHideToggleLabel();

    });


    updateHideToggleLabel();


    /* =====================================================
       4. 공간 안내 UI
       ===================================================== */

    const contextPanel = document.createElement('div');

    contextPanel.id = 'inspection-context-panel';

    contextPanel.style.cssText = `
      position: absolute;

      top: 14px;
      right: 14px;

      z-index: 30;

      min-width: 190px;

      padding: 10px 12px;

      background: rgba(10, 20, 32, 0.82);

      color: #ffffff;

      border: 1px solid rgba(255,255,255,0.22);

      border-radius: 8px;

      font-size: 12px;
      line-height: 1.5;

      backdrop-filter: blur(5px);

      box-shadow: 0 4px 16px rgba(0,0,0,0.35);

      pointer-events: none;
    `;

    contextPanel.innerHTML = `
      <div style="
        font-size:11px;
        color:#9fb6cc;
        margin-bottom:3px;
      ">
        현재 관찰 위치
      </div>

      <div
        id="context-focus"
        style="
          font-size:15px;
          font-weight:bold;
          margin-bottom:3px;
        "
      >
        전체 공간
      </div>

      <div
        id="context-floor"
        style="
          color:#cbd8e4;
        "
      >
        현재 층: -
      </div>

      <div
        id="context-description"
        style="
          color:#aebdca;
          margin-top:3px;
        "
      >
        미니맵에서 현재 위치를 확인할 수 있습니다.
      </div>
    `;

    stage.appendChild(contextPanel);


    /* =====================================================
       5. 미니맵 UI 생성
       ===================================================== */

    const miniMapBox = document.createElement('div');

    miniMapBox.id = 'inspection-mini-map';

    miniMapBox.style.cssText = `
      position: absolute;

      right: 14px;
      bottom: 14px;

      z-index: 25;

      width: 210px;
      height: 165px;

      padding: 8px;

      box-sizing: border-box;

      background: rgba(8, 17, 28, 0.90);

      border: 1px solid rgba(255,255,255,0.25);

      border-radius: 9px;

      box-shadow: 0 4px 18px rgba(0,0,0,0.4);

      backdrop-filter: blur(5px);

      pointer-events: none;
    `;


    miniMapBox.innerHTML = `

      <div style="
        position:absolute;
        top:7px;
        left:10px;

        color:#dbe8f4;

        font-size:11px;
        font-weight:bold;
      ">
        공간 위치
      </div>

      <canvas
        id="inspection-map-canvas"
        width="380"
        height="280"
        style="
          position:absolute;
          left:7px;
          top:25px;

          width:196px;
          height:130px;
        "
      ></canvas>

      <div style="
        position:absolute;
        left:10px;
        bottom:5px;

        font-size:9px;
        color:#9fb0bf;
      ">
        ● 현재 위치　◆ 이전 위치　→ 바라보는 방향
      </div>

    `;

    stage.appendChild(miniMapBox);


    const miniMapCanvas =
      document.querySelector('#inspection-map-canvas');

    const miniMapCtx =
      miniMapCanvas.getContext('2d');


    /* =====================================================
       6. 전체 보기 버튼
       ===================================================== */

    const overviewBtn = document.createElement('button');

    overviewBtn.id = 'overview-btn';

    overviewBtn.textContent = '◎ 전체 보기';

    overviewBtn.style.cssText = `
      position: absolute;

      right: 235px;
      bottom: 14px;

      z-index: 30;

      padding: 7px 12px;

      background: rgba(10,20,32,0.88);

      color: #ffffff;

      border: 1px solid rgba(255,255,255,0.25);

      border-radius: 6px;

      font-size: 12px;
      font-weight: bold;

      cursor: pointer;

      box-shadow: 0 2px 10px rgba(0,0,0,0.3);

      backdrop-filter: blur(4px);
    `;

    stage.appendChild(overviewBtn);


    /* =====================================================
       7. 카메라 상태 계산
       ===================================================== */

    function cameraStateFromEyeTarget(eye, target) {

      const dx = eye[0] - target[0];
      const dy = eye[1] - target[1];
      const dz = eye[2] - target[2];

      const distance =
        Math.hypot(dx, dy, dz) || 0.001;

      const elevation =
        Math.asin(
          Math.max(
            -1,
            Math.min(1, dy / distance)
          )
        );

      const azimuth =
        Math.atan2(dx, dz);

      return {
        distance,
        elevation,
        azimuth,
        target: [...target]
      };
    }


    /* =====================================================
       8. 현재 카메라 위치 가져오기
       ===================================================== */

    function getCameraPosition() {

      try {

        const camera = controls.camera();

        if (camera && camera.eye) {

          return [...camera.eye];

        }

      } catch (error) {

        console.warn(
          '카메라 위치를 가져올 수 없습니다.',
          error
        );

      }


      // fallback
      const s = controls.state;

      const target = [...s.target];

      const distance = s.distance;

      const elevation = s.elevation;

      const azimuth = s.azimuth;

      const horizontal =
        Math.cos(elevation) * distance;

      return [
        target[0] + Math.sin(azimuth) * horizontal,
        target[1] + Math.sin(elevation) * distance,
        target[2] + Math.cos(azimuth) * horizontal
      ];
    }


    /* =====================================================
       9. 카메라 이동거리 계산
       ===================================================== */

    function calculateCameraParams(
      targetPos,
      normalVec,
      radius,
      fovDeg = 45
    ) {

      const fovRad =
        (fovDeg * Math.PI) / 180;

      const distance =
        Math.max(
          radius / Math.sin(fovRad / 2),
          0.8
        );

      const len =
        Math.hypot(...normalVec) || 1;

      const normN =
        normalVec.map(
          v => v / len
        );

      const eyePos = [

        targetPos[0] +
          normN[0] * distance,

        targetPos[1] +
          normN[1] * distance,

        targetPos[2] +
          normN[2] * distance

      ];

      return {
        eye: eyePos,
        target: targetPos,
        distance
      };
    }


    /* =====================================================
       10. 부드러운 카메라 이동
       ===================================================== */

    function smoothCameraTransition(
      targetParams,
      duration = 800
    ) {

      if (isAnimating) {

        cancelAnimationFrame(animId);

      }

      isAnimating = true;

      const s = controls.state;

      const startTarget =
        [...s.target];

      const startDist =
        s.distance;

      const startAzi =
        s.azimuth;

      const startEle =
        s.elevation;

      const startFov =
        s.fov || 45;


      const dest =
        cameraStateFromEyeTarget(
          targetParams.eye,
          targetParams.target
        );


      let diffAzi =
        dest.azimuth - startAzi;


      while (diffAzi > Math.PI) {

        diffAzi -= Math.PI * 2;

      }


      while (diffAzi < -Math.PI) {

        diffAzi += Math.PI * 2;

      }


      const startTime =
        performance.now();


      const easeInOutCubic = t =>

        t < 0.5

          ? 4 * t * t * t

          : 1 -
            Math.pow(
              -2 * t + 2,
              3
            ) / 2;


      function step(now) {

        const elapsed =
          now - startTime;

        const progress =
          Math.min(
            elapsed / duration,
            1
          );

        const ease =
          easeInOutCubic(progress);


        s.target[0] =
          startTarget[0] +
          (dest.target[0] -
            startTarget[0]) *
          ease;


        s.target[1] =
          startTarget[1] +
          (dest.target[1] -
            startTarget[1]) *
          ease;


        s.target[2] =
          startTarget[2] +
          (dest.target[2] -
            startTarget[2]) *
          ease;


        s.distance =
          startDist +
          (dest.distance -
            startDist) *
          ease;


        s.azimuth =
          startAzi +
          diffAzi *
          ease;


        s.elevation =
          startEle +
          (dest.elevation -
            startEle) *
          ease;


        s.fov =
          startFov +
          (
            (targetParams.fov || 45) -
            startFov
          ) *
          ease;


        s.near =
          targetParams.near || 0.01;


        s.orthographic =
          !!targetParams.orthographic;


        if (targetParams.halfHeight) {

          s.halfHeight =
            targetParams.halfHeight;

        }


        if (progress < 1) {

          animId =
            requestAnimationFrame(step);

        } else {

          isAnimating = false;

        }

      }


      animId =
        requestAnimationFrame(step);

    }


    /* =====================================================
       11. 층 계산
       ===================================================== */

    function getFloorFromY(y) {

      if (y < 1.8) {

        return '1층';

      }

      if (y < 4.8) {

        return '2층';

      }

      if (y < 7.5) {

        return '3층';

      }

      return '옥상 / 상부';

    }


    /* =====================================================
       12. POI 찾기
       ===================================================== */

    function getPoi(id) {

      if (!model.poi) {

        return null;

      }

      return model.poi.find(
        p => p.id === id
      ) || null;

    }


    /* =====================================================
       13. 미니맵 좌표 변환
       ===================================================== */

    function worldToMap(x, z) {

      const bounds =
        model.bounds || {
          min: [-8, -0.55, -7.5],
          max: [14.5, 9.7, 7.5]
        };


      const minX =
        bounds.min[0];

      const maxX =
        bounds.max[0];

      const minZ =
        bounds.min[2];

      const maxZ =
        bounds.max[2];


      const padding = 25;

      const width =
        miniMapCanvas.width;

      const height =
        miniMapCanvas.height;


      const px =
        padding +
        (
          (x - minX) /
          (maxX - minX)
        ) *
        (width - padding * 2);


      // WebGL Z축은 위아래 방향을 뒤집어서 표시
      const py =
        height -
        (
          padding +
          (
            (z - minZ) /
            (maxZ - minZ)
          ) *
          (height - padding * 2)
        );


      return {
        x: px,
        y: py
      };
    }


    /* =====================================================
       14. 건물 영역 그리기
       ===================================================== */

    function drawBuildingOutline() {

      const bounds =
        model.bounds || {
          min: [-8, -0.55, -7.5],
          max: [14.5, 9.7, 7.5]
        };


      const p1 =
        worldToMap(
          bounds.min[0],
          bounds.min[2]
        );


      const p2 =
        worldToMap(
          bounds.max[0],
          bounds.min[2]
        );


      const p3 =
        worldToMap(
          bounds.max[0],
          bounds.max[2]
        );


      const p4 =
        worldToMap(
          bounds.min[0],
          bounds.max[2]
        );


      miniMapCtx.beginPath();

      miniMapCtx.moveTo(
        p1.x,
        p1.y
      );

      miniMapCtx.lineTo(
        p2.x,
        p2.y
      );

      miniMapCtx.lineTo(
        p3.x,
        p3.y
      );

      miniMapCtx.lineTo(
        p4.x,
        p4.y
      );

      miniMapCtx.closePath();


      miniMapCtx.fillStyle =
        'rgba(80,110,140,0.20)';

      miniMapCtx.fill();


      miniMapCtx.strokeStyle =
        'rgba(160,190,215,0.55)';

      miniMapCtx.lineWidth = 2;

      miniMapCtx.stroke();


      // 본관 / 별관을 구분하는 선
      const center =
        worldToMap(
          6.5,
          0
        );


      miniMapCtx.beginPath();

      miniMapCtx.moveTo(
        center.x,
        p1.y
      );

      miniMapCtx.lineTo(
        center.x,
        p4.y
      );

      miniMapCtx.strokeStyle =
        'rgba(255,255,255,0.15)';

      miniMapCtx.lineWidth = 1;

      miniMapCtx.stroke();

    }


    /* =====================================================
       15. POI 그리기
       ===================================================== */

    function drawPOIs() {

      const poiList =
        model.poi ||
        [];


      poiList.forEach(poi => {

        if (
          !poi.position ||
          !poi.id
        ) {

          return;

        }


        const pos =
          worldToMap(
            poi.position[0],
            poi.position[2]
          );


        const isCurrent =
          poi.id === currentFocusId;


        // POI 원
        miniMapCtx.beginPath();

        miniMapCtx.arc(
          pos.x,
          pos.y,
          isCurrent ? 7 : 4,
          0,
          Math.PI * 2
        );


        miniMapCtx.fillStyle =
          isCurrent
            ? '#ffcc33'
            : '#5ca8fa';

        miniMapCtx.fill();


        miniMapCtx.strokeStyle =
          '#ffffff';

        miniMapCtx.lineWidth = 1;

        miniMapCtx.stroke();


        // P1~P6 라벨
        miniMapCtx.font =
          isCurrent
            ? 'bold 13px sans-serif'
            : '10px sans-serif';

        miniMapCtx.textAlign =
          'left';

        miniMapCtx.textBaseline =
          'middle';

        miniMapCtx.fillStyle =
          isCurrent
            ? '#ffe38a'
            : '#dce9f4';


        miniMapCtx.fillText(
          poi.id,
          pos.x + 8,
          pos.y
        );

      });

    }


    /* =====================================================
       16. 이전 위치 표시
       ===================================================== */

    function drawPreviousPosition() {

      if (!previousCameraPosition) {

        return;

      }


      const pos =
        worldToMap(
          previousCameraPosition[0],
          previousCameraPosition[2]
        );


      miniMapCtx.save();


      miniMapCtx.beginPath();

      miniMapCtx.moveTo(
        pos.x,
        pos.y - 7
      );

      miniMapCtx.lineTo(
        pos.x + 7,
        pos.y + 6
      );

      miniMapCtx.lineTo(
        pos.x - 7,
        pos.y + 6
      );

      miniMapCtx.closePath();


      miniMapCtx.fillStyle =
        '#ff8a65';

      miniMapCtx.fill();


      miniMapCtx.strokeStyle =
        '#ffffff';

      miniMapCtx.lineWidth = 1;

      miniMapCtx.stroke();


      miniMapCtx.restore();

    }


    /* =====================================================
       17. 현재 카메라 위치 표시
       ===================================================== */

    function drawCurrentCamera() {

      const camera =
        getCameraPosition();


      if (!camera) {

        return;

      }


      currentCameraPosition =
        camera;


      const pos =
        worldToMap(
          camera[0],
          camera[2]
        );


      miniMapCtx.save();


      // 현재 위치 원
      miniMapCtx.beginPath();

      miniMapCtx.arc(
        pos.x,
        pos.y,
        6,
        0,
        Math.PI * 2
      );


      miniMapCtx.fillStyle =
        '#35e58b';

      miniMapCtx.fill();


      miniMapCtx.strokeStyle =
        '#ffffff';

      miniMapCtx.lineWidth = 2;

      miniMapCtx.stroke();


      // 카메라 방향
      const s =
        controls.state;


      const azimuth =
        s.azimuth || 0;


      const arrowLength = 18;


      // azimuth 기준 방향
      const dx =
        Math.sin(azimuth) *
        arrowLength;


      const dy =
        -Math.cos(azimuth) *
        arrowLength;


      miniMapCtx.beginPath();

      miniMapCtx.moveTo(
        pos.x,
        pos.y
      );

      miniMapCtx.lineTo(
        pos.x + dx,
        pos.y + dy
      );


      miniMapCtx.strokeStyle =
        '#35e58b';

      miniMapCtx.lineWidth = 3;

      miniMapCtx.stroke();


      // 화살표 머리
      const angle =
        Math.atan2(dy, dx);


      miniMapCtx.beginPath();

      miniMapCtx.moveTo(
        pos.x + dx,
        pos.y + dy
      );

      miniMapCtx.lineTo(
        pos.x +
          dx -
          Math.cos(angle - 0.5) * 7,

        pos.y +
          dy -
          Math.sin(angle - 0.5) * 7
      );

      miniMapCtx.lineTo(
        pos.x +
          dx -
          Math.cos(angle + 0.5) * 7,

        pos.y +
          dy -
          Math.sin(angle + 0.5) * 7
      );

      miniMapCtx.closePath();

      miniMapCtx.fillStyle =
        '#35e58b';

      miniMapCtx.fill();


      miniMapCtx.restore();

    }


    /* =====================================================
       18. 미니맵 전체 갱신
       ===================================================== */

    function updateMiniMap() {

      if (!miniMapCtx) {

        return;

      }


      miniMapCtx.clearRect(
        0,
        0,
        miniMapCanvas.width,
        miniMapCanvas.height
      );


      // 배경
      miniMapCtx.fillStyle =
        'rgba(14,27,42,0.75)';

      miniMapCtx.fillRect(
        0,
        0,
        miniMapCanvas.width,
        miniMapCanvas.height
      );


      drawBuildingOutline();

      drawPOIs();

      drawPreviousPosition();

      drawCurrentCamera();

    }


    /* =====================================================
       19. 현재 상태 패널 갱신
       ===================================================== */

    function updateContextPanel() {

      const focusEl =
        document.querySelector(
          '#context-focus'
        );


      const floorEl =
        document.querySelector(
          '#context-floor'
        );


      const descriptionEl =
        document.querySelector(
          '#context-description'
        );


      const camera =
        getCameraPosition();


      if (camera) {

        currentCameraPosition =
          camera;

      }


      const y =
        camera
          ? camera[1]
          : 0;


      const floor =
        getFloorFromY(y);


      if (focusEl) {

        focusEl.textContent =
          currentFocusId
            ? `📍 ${currentFocusId}`
            : '전체 공간';

      }


      if (floorEl) {

        floorEl.textContent =
          `현재 위치: ${floor}`;

      }


      if (descriptionEl) {

        if (previousCameraPosition) {

          descriptionEl.textContent =
            '◆ 이전 위치가 주황색으로 표시됩니다.';

        } else {

          descriptionEl.textContent =
            '● 현재 위치와 방향을 확인하세요.';

        }

      }

    }


    /* =====================================================
       20. 애니메이션 중 미니맵 계속 갱신
       ===================================================== */

    function startContextUpdater() {

      function update() {

        updateMiniMap();

        updateContextPanel();

        requestAnimationFrame(
          update
        );

      }

      update();

    }


    /* =====================================================
       21. 전체 보기 카메라
       ===================================================== */

    function moveToOverview() {

      const bounds =
        model.bounds || {
          min: [-8, -0.55, -7.5],
          max: [14.5, 9.7, 7.5]
        };


      const center = [

        (bounds.min[0] +
          bounds.max[0]) / 2,

        (
          bounds.min[1] +
          bounds.max[1]
        ) / 2,

        (
          bounds.min[2] +
          bounds.max[2]
        ) / 2

      ];


      const sizeX =
        bounds.max[0] -
        bounds.min[0];

      const sizeY =
        bounds.max[1] -
        bounds.min[1];

      const sizeZ =
        bounds.max[2] -
        bounds.min[2];


      const radius =
        Math.max(
          sizeX,
          sizeY,
          sizeZ
        ) * 1.15;


      const eye = [

        center[0] + radius * 0.95,

        center[1] + radius * 0.72,

        center[2] + radius * 0.95

      ];


      // 전체 보기로 갈 때는 이전 위치를 남기지 않음
      previousCameraPosition =
        null;


      currentFocusId =
        null;


      smoothCameraTransition(
        {
          eye,
          target: center,
          fov: 45,
          near: 0.01,
          orthographic: false
        },
        900
      );


      const focusStatus =
        document.querySelector(
          '#focus-status'
        );


      if (focusStatus) {

        focusStatus.textContent =
          '🏢 전체 건물 공간을 보는 중';

      }

    }


    overviewBtn.addEventListener(
      'click',
      moveToOverview
    );


    /* =====================================================
       22. 실제 대상 이동
       ===================================================== */

    function moveTo(hit) {

      if (!hit) return;


      /*
       * 핵심 개선점
       *
       * 팻말을 누르기 직전에 현재 카메라 위치를 저장한다.
       * 이후 미니맵에서 이 위치를 ◆로 표시한다.
       */

      previousCameraPosition =
        getCameraPosition();


      const rawId =
        hit.id ||
        hit.label ||
        '';


      const id =
        rawId.split(' ')[0];


      currentFocusId =
        id;


      /* -------------------------------------------------
         O1
         ------------------------------------------------- */

      if (id === 'O1') {

        smoothCameraTransition(
          {
            eye: [-5.3, 2.6, 18],

            target: [
              -5.3,
              2.6,
              6
            ],

            fov: 45,

            near: 0.01,

            orthographic: true,

            halfHeight: 3.4
          }
        );

      }


      /* -------------------------------------------------
         O2
         ------------------------------------------------- */

      else if (id === 'O2') {

        smoothCameraTransition(
          {
            eye: [
              23,
              4.75,
              -0.3
            ],

            target: [
              10.8,
              4.75,
              -0.3
            ],

            fov: 45,

            near: 0.01,

            orthographic: true,

            halfHeight: 3.4
          }
        );

      }


      /* -------------------------------------------------
         P1~P6 / V1~V4 / 개별 부품
         ------------------------------------------------- */

      else {

        const signPart =
          model.signs.find(
            s => s.id === id
          );


        const boxPart =
          model.boxes.find(
            b => b.id === id
          );


        const nearestSign =
          !signPart && boxPart

            ? model.signs
                .slice()
                .sort(
                  (a, b) => {

                    const da =
                      Math.hypot(
                        a.position[0] -
                          boxPart.position[0],

                        a.position[1] -
                          boxPart.position[1],

                        a.position[2] -
                          boxPart.position[2]
                      );


                    const db =
                      Math.hypot(
                        b.position[0] -
                          boxPart.position[0],

                        b.position[1] -
                          boxPart.position[1],

                        b.position[2] -
                          boxPart.position[2]
                      );


                    return da - db;

                  }
                )[0]

            : null;


        const focusSign =
          signPart ||
          nearestSign;


        const part =
          focusSign ||
          boxPart;


        const pos =
          focusSign

            ? focusSign.position

            : (
                hit.point ||
                (
                  part
                    ? part.position
                    : [0, 1.5, 0]
                )
              );


        let normal =
          hit.normal ||
          [0, 0.2, 1];


        if (
          focusSign &&
          focusSign.yaw !== undefined
        ) {

          normal = [

            Math.sin(
              focusSign.yaw
            ),

            0.2,

            Math.cos(
              focusSign.yaw
            )

          ];

        }


        const radius =
          focusSign &&
          focusSign.size

            ? Math.max(
                ...focusSign.size
              ) * 0.8

            : (
                hit.radius ||
                (
                  part &&
                  part.size

                    ? Math.max(
                        ...part.size
                      ) * 0.8

                    : 0.8
                )
              );


        /*
         * 건물 내부 장비를 관찰할 때
         * 외벽/지붕을 자동으로 숨긴다.
         */

        if (
          id.includes('V') ||
          (
            boxPart &&
            boxPart.group === 'equipment'
          ) ||
          pos[1] < 1.2
        ) {

          hidden.add('roof');

          hidden.add('structure');

          updateHideToggleLabel();

        }


        const params =
          calculateCameraParams(
            pos,
            normal,
            radius,
            40
          );


        smoothCameraTransition(
          {
            eye: params.eye,

            target: params.target,

            fov: 40,

            near: 0.01,

            orthographic: false
          }
        );

      }


      /* -------------------------------------------------
         상태 표시
         ------------------------------------------------- */

      const focusStatus =
        document.querySelector(
          '#focus-status'
        );


      if (focusStatus) {

        focusStatus.textContent =
          `🎯 ${id} 관찰 시점으로 이동 중`;

      }


      updateContextPanel();

    }


    /* =====================================================
       23. 외부에서 moveTo 사용할 수 있도록 공개
       ===================================================== */

    window.InspectionStudent = {

      moveTo,

      moveToOverview,

      updateMiniMap

    };


    /* =====================================================
       24. 점검 목록 클릭 연동
       ===================================================== */

    const taskList =
      document.querySelectorAll(
        '#tasks li'
      );


    taskList.forEach(
      (li, index) => {

        li.addEventListener(
          'click',
          () => {

            taskList.forEach(
              item =>
                item.classList.remove(
                  'active'
                )
            );


            li.classList.add(
              'active'
            );


            const taskData =
              model.tasks[index];


            if (!taskData) {

              return;

            }


            const signPart =
              model.signs.find(
                s =>
                  s.id ===
                  taskData.id
              );


            const boxPart =
              model.boxes.find(
                b =>
                  b.id ===
                  taskData.id
              );


            const part =
              signPart ||
              boxPart;


            const pos =
              part
                ? part.position
                : (
                    taskData.position ||
                    [0, 1.5, 0]
                  );


            const radius =
              part

                ? (
                    part.size
                      ? Math.max(
                          ...part.size
                        ) * 0.8
                      : 0.8
                  )

                : 1.0;


            let normal =
              [0, 0.2, 1];


            if (
              signPart &&
              signPart.yaw !== undefined
            ) {

              normal = [

                Math.sin(
                  signPart.yaw
                ),

                0.2,

                Math.cos(
                  signPart.yaw
                )

              ];

            }


            moveTo(
              {
                id: taskData.id,

                point: pos,

                normal,

                radius,

                group:
                  part
                    ? part.group
                    : 'default'
              }
            );

          }
        );

      }
    );


    /* =====================================================
       25. 초기 상태
       ===================================================== */

    updateMiniMap();

    updateContextPanel();

    startContextUpdater();


  });

})();