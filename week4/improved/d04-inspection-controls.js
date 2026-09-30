/* Roll 없는 orbit 카메라. yaw/pitch를 분리해 수평·수직 회전이 대각선으로 꼬이지 않습니다. */
window.InspectionControls = function(canvas) {
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  const state={target:[3,3,0],distance:30,yaw:0.55,pitch:0.35,fov:45,actions:0,dragged:false};
  let drag=null,transition=null;
  function home(){state.target=[3,3,0];state.distance=30;state.yaw=0.55;state.pitch=0.35;state.fov=45;transition=null;}
  home();
  function orbit(){const cp=Math.cos(state.pitch);return [state.distance*cp*Math.sin(state.yaw),state.distance*Math.sin(state.pitch),state.distance*cp*Math.cos(state.yaw)];}
  function camera(){if(transition){const u=Math.min(1,(performance.now()-transition.start)/transition.duration),e=u*u*(3-2*u);state.target=transition.fromTarget.map((v,i)=>v+(transition.target[i]-v)*e);state.distance=transition.fromDistance+(transition.distance-transition.fromDistance)*e;state.yaw=transition.fromYaw+(transition.yaw-transition.fromYaw)*e;state.pitch=transition.fromPitch+(transition.pitch-transition.fromPitch)*e;if(u>=1)transition=null;}const offset=orbit();return {eye:add(state.target,offset),target:[...state.target],up:[0,1,0],fov:state.fov};}
  function focus(target,normal,radius=0.5){const n=normalize(normal),d=Math.max(0.45,radius/Math.tan(state.fov*Math.PI/360)*1.35),yaw=Math.atan2(n[0],n[2])+Math.PI,pitch=Math.asin(Math.max(-0.95,Math.min(0.95,n[1])));transition={start:performance.now(),duration:700,fromTarget:[...state.target],target:[...target],fromDistance:state.distance,distance:d,fromYaw:state.yaw,yaw,fromPitch:state.pitch,pitch};state.actions++;}
  canvas.style.touchAction='none';canvas.tabIndex=0;canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(drag||![0,2].includes(e.button))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,target:[...state.target],yaw:state.yaw,pitch:state.pitch,pan:e.shiftKey||e.button===2};state.dragged=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)state.dragged=true;if(drag.pan){const scale=2*state.distance*Math.tan(state.fov*Math.PI/360)/canvas.clientHeight;const right=[Math.cos(state.yaw),0,-Math.sin(state.yaw)];const up=[0,1,0];state.target=drag.target.map((v,i)=>v-dx*scale*right[i]+dy*scale*up[i]);}else{state.yaw=drag.yaw-dx*0.008;state.pitch=Math.max(-1.45,Math.min(1.45,drag.pitch+dy*0.008));}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.distance=Math.max(0.18,Math.min(120,state.distance*Math.exp(e.deltaY*.0035)));state.actions++;},{passive:false});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;e.preventDefault();state.actions++;if(e.key==='Home'){home();return;}if(e.key==='+')state.distance=Math.max(.18,state.distance/1.25);else if(e.key==='-')state.distance=Math.min(120,state.distance*1.25);else{state.yaw+=(e.key==='ArrowLeft'?.08:e.key==='ArrowRight'?-.08:0);state.pitch=Math.max(-1.45,Math.min(1.45,state.pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0)));}});
  return {state,home,camera,focus};
};
