/* Roll 없는 orbit 카메라. yaw/pitch를 분리해 수평·수직 회전이 대각선으로 꼬이지 않습니다. */
/* Roll 없는 orbit 카메라. yaw/pitch를 분리해 수평·수직 회전이 대각선으로 꼬이지 않습니다.
   직교 뷰(O1/O2)에서는 거리 대신 halfHeight로 확대·축소합니다. */
window.InspectionControls = function(canvas) {
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  const state={target:[3,3,0],distance:30,azimuth:0.55,elevation:0.35,yaw:0.55,pitch:0.35,fov:45,near:0.02,orthographic:false,halfHeight:8,actions:0,dragged:false};
  let drag=null,transition=null;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  // 확대·축소: 직교 뷰는 halfHeight, 원근 뷰는 distance
  function zoom(factor){
    if(state.orthographic) state.halfHeight=clamp(state.halfHeight*factor,0.3,40);
    else state.distance=clamp(state.distance*factor,0.18,120);
  }
  function home(){state.target=[3,3,0];state.azimuth=state.yaw=0.55;state.elevation=state.pitch=0.35;state.distance=30;state.fov=45;state.near=0.02;state.orthographic=false;state.halfHeight=8;transition=null;}
  home();
  function orbit(){const cp=Math.cos(state.elevation);return [state.distance*cp*Math.sin(state.azimuth),state.distance*Math.sin(state.elevation),state.distance*cp*Math.cos(state.azimuth)];}
  function camera(){if(transition){const u=Math.min(1,(performance.now()-transition.start)/transition.duration),e=u*u*(3-2*u);state.target=transition.fromTarget.map((v,i)=>v+(transition.target[i]-v)*e);state.distance=transition.fromDistance+(transition.distance-transition.fromDistance)*e;state.azimuth=state.yaw=transition.fromYaw+(transition.yaw-transition.fromYaw)*e;state.elevation=state.pitch=transition.fromPitch+(transition.pitch-transition.fromPitch)*e;if(u>=1)transition=null;}const offset=orbit();return {eye:add(state.target,offset),target:[...state.target],up:[0,1,0],fov:state.fov,near:state.near,orthographic:state.orthographic,halfHeight:state.halfHeight};}
  function focus(target,normal,radius=0.5){const n=normalize(normal),d=Math.max(0.45,radius/Math.tan(state.fov*Math.PI/360)*1.35),azimuth=Math.atan2(n[0],n[2])+Math.PI,elevation=Math.asin(Math.max(-0.95,Math.min(0.95,n[1])));transition={start:performance.now(),duration:700,fromTarget:[...state.target],target:[...target],fromDistance:state.distance,distance:d,fromYaw:state.azimuth,yaw:azimuth,fromPitch:state.elevation,pitch:elevation};state.actions++;}
  canvas.style.touchAction='none';canvas.tabIndex=0;canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(drag||![0,2].includes(e.button))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,target:[...state.target],yaw:state.azimuth,pitch:state.elevation,pan:e.shiftKey||e.button===2};state.dragged=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)state.dragged=true;if(drag.pan){
      // 직교 뷰는 화면 세로 길이(2*halfHeight)가 곧 월드 길이, 원근 뷰는 거리와 FOV로 계산
      const scale=state.orthographic?2*state.halfHeight/canvas.clientHeight:2*state.distance*Math.tan(state.fov*Math.PI/360)/canvas.clientHeight;
      const right=[Math.cos(state.azimuth),0,-Math.sin(state.azimuth)];const up=[0,1,0];state.target=drag.target.map((v,i)=>v-dx*scale*right[i]+dy*scale*up[i]);
    }else{state.azimuth=state.yaw=drag.yaw-dx*0.008;state.elevation=state.pitch=Math.max(-1.45,Math.min(1.45,drag.pitch+dy*0.008));}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.0035));state.actions++;},{passive:false});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;e.preventDefault();state.actions++;if(e.key==='Home'){home();return;}if(e.key==='+')zoom(1/1.25);else if(e.key==='-')zoom(1.25);else{state.azimuth=state.yaw+=e.key==='ArrowLeft'?.08:e.key==='ArrowRight'?-.08:0;state.elevation=state.pitch=Math.max(-1.45,Math.min(1.45,state.elevation+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0)));}});
  return {state,home,camera,focus};
};