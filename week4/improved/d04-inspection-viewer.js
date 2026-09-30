/* WebGL2 렌더러. drawView를 여러 번 호출하면 분할 뷰를 구성할 수 있습니다.
   기본 기능은 트랙볼/이동/거리 조절/전체 보기뿐이며 자동 안내는 구현하지 않습니다. */
(() => {
  'use strict';
  const canvas=document.querySelector('#cv'),gl=canvas.getContext('webgl2',{antialias:true}),read=document.querySelector('#readings');
  if(!gl){read.textContent='WebGL2를 사용할 수 없습니다. 지원하는 브라우저에서 열어 주세요.';return;}
  const M=D.M4,model=window.InspectionModel,controls=window.InspectionControls(canvas);
  const program=D.program(gl,`#version 300 es
    layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
    uniform mat4 uModel,uVP;uniform mat3 uNormal;out vec3 vN;out vec2 vUV;
    void main(){vN=uNormal*aNormal;vUV=aUV;gl_Position=uVP*uModel*vec4(aPos,1.0);}
  `,`#version 300 es
    precision highp float;in vec3 vN;in vec2 vUV;uniform vec3 uColor;uniform bool uText;uniform sampler2D uMap;out vec4 outColor;
    void main(){if(uText){outColor=texture(uMap,vUV);return;}float light=.48+.52*max(dot(normalize(vN),normalize(vec3(.4,1,.6))),0.0);outColor=vec4(uColor*light,1.0);}
  `);
  const U=D.uniforms(gl,program,['uModel','uVP','uNormal','uColor','uText','uMap']);
  const cube=D.upload(gl,D.cube(1));
  const plane=D.upload(gl,{pos:new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),nrm:new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),uv:new Float32Array([0,0,1,0,1,1,0,1]),idx:new Uint16Array([0,1,2,0,2,3])});
  function matrix(position,size,yaw=0){const m=M.create();M.translate(m,m,position);M.rotateY(m,m,yaw);M.scale(m,m,size);return m;}
  const parts=model.boxes.map(p=>({...p,matrix:matrix(p.position,p.size)}));
  function texture(sign){
    const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle='#fff9e9';ctx.fillRect(0,0,512,256);ctx.fillStyle='#122337';ctx.fillRect(0,0,512,62);
    ctx.fillStyle='#ffffff';ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.fillText(sign.id,256,46);
    ctx.fillStyle='#122337';ctx.font='bold 60px sans-serif';ctx.fillText(sign.text[0],256,140);ctx.fillText(sign.text[1],256,220);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    return tex;
  }
  const signs=model.signs.map(p=>({...p,matrix:matrix(p.position,[...p.size,1],p.yaw),texture:texture(p)}));
  const view=M.create(),projection=M.create(),vp=M.create();
  const hidden=new Set();
  const minimap=document.querySelector('#minimap'),miniCtx=minimap.getContext('2d'),focusStatus=document.querySelector('#focus-status');
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  
  function pointerRay(e){
    const r=canvas.getBoundingClientRect(),c=controls.camera(),u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;
    const forward=norm(sub(c.target,c.eye)),right=norm(cross(forward,c.up||[0,1,0])),up=norm(cross(right,forward));
    const tan=Math.tan((c.fov||controls.state.fov)*Math.PI/360),aspect=r.width/r.height;
    return {origin:c.eye,direction:norm(add(add(forward,right*((2*u-1)*tan*aspect)),up*((1-2*v)*tan)))};
  }
  function raySphere(ray,center,radius){const oc=sub(ray.origin,center),b=dot(oc,ray.direction),h=b*b-dot(oc,oc)+radius*radius;if(h<0)return Infinity;const t=-b-Math.sqrt(h);return t>0?t:(-b+Math.sqrt(h));}
  
  function pick(e){
    const ray=pointerRay(e),camera=controls.camera();let best=null;
    // P1~P6, O1~O2 등 팻말 피킹
    for(const s of signs){
      const radius=Math.max(s.size[0],s.size[1],1.2)*0.8;
      const t=raySphere(ray,s.position,radius);
      if(t<Infinity&&(!best||t<best.t)){
        let normal=[Math.sin(s.yaw||0),0.2,Math.cos(s.yaw||0)];
        best={t,point:s.position,normal,radius:Math.max(radius,.8),label:s.id+' '+(s.text||[]).join(' '),group:s.group,id:s.id};
      }
    }
    // 박스 부품 피킹
    for(const p of parts){
      if(p.id==='ground')continue;
      const radius=Math.hypot(...p.size)*0.6;
      const t=raySphere(ray,p.position,radius);
      if(t<Infinity&&(!best||t<best.t)){
        best={t,point:p.position,normal:norm(sub(camera.eye,p.position)),radius:Math.max(radius,.5),label:p.id,group:p.group,id:p.id};
      }
    }
    return best;
  }

  // 3D 공간 클릭 이벤트
  canvas.addEventListener('click', e => {
    if (controls.state.dragged) return;
    const hit = pick(e);
    if (!hit) return;
    if (window.InspectionStudent && window.InspectionStudent.moveTo) {
      window.InspectionStudent.moveTo(hit);
    } else if (controls.focus) {
      controls.focus(hit.point, hit.normal, hit.radius);
    }
  });

  // 미니맵 그리기는 초록색 사각형 영역만 렌더링
  function drawMinimap(camera){
    const w=minimap.width,h=minimap.height,pad=18,b=model.bounds,sx=(w-2*pad)/(b.max[0]-b.min[0]),sz=(h-2*pad)/(b.max[2]-b.min[2]);
    const px=x=>pad+(x-b.min[0])*sx,pz=z=>h-pad-(z-b.min[2])*sz;
    
    miniCtx.clearRect(0,0,w,h);
    miniCtx.fillStyle='#121c2a';
    miniCtx.fillRect(0,0,w,h);
    miniCtx.strokeStyle='#2d3f58';
    miniCtx.strokeRect(pad,pad,w-2*pad,h-2*pad);

    // 건물 평면 구조 그리기
    for(const p of parts){
      if(p.id==='ground')continue;
      miniCtx.fillStyle=p.group==='equipment'?'#d2600f':p.group==='roof'?'#1f6feb':'#aab5c3';
      miniCtx.globalAlpha=p.group==='structure'?.34:.7;
      miniCtx.fillRect(px(p.position[0]-p.size[0]/2),pz(p.position[2]+p.size[2]/2),p.size[0]*sx,p.size[2]*sz);
    }
    miniCtx.globalAlpha=1;

    // Target(시선 중심) 좌표
    const tx = Math.max(pad, Math.min(w - pad, px(camera.target[0])));
    const tz = Math.max(pad, Math.min(h - pad, pz(camera.target[2])));

    // Target 위치에 반투명 초록색 영역 사각형만 생성 (긴 선 제거)
    const rectW = 44;
    const rectH = 36;
    miniCtx.fillStyle = 'rgba(34, 197, 94, 0.38)';
    miniCtx.fillRect(tx - rectW / 2, tz - rectH / 2, rectW, rectH);
    
    miniCtx.strokeStyle = '#10b981';
    miniCtx.lineWidth = 2;
    miniCtx.strokeRect(tx - rectW / 2, tz - rectH / 2, rectW, rectH);

    // 상단 범례 표시
    miniCtx.fillStyle='#a7f3d0';
    miniCtx.font='bold 11px sans-serif';
    miniCtx.fillText('🟩 현재 보기 위치', pad+4, 14);
  }

  function drawMesh(mesh,m,color,text=false){gl.uniformMatrix4fv(U.uModel,false,m);gl.uniformMatrix3fv(U.uNormal,false,M.normalFrom(m));gl.uniform3fv(U.uColor,color);gl.uniform1i(U.uText,text?1:0);gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);}
  function drawView(camera,viewport=[0,0,canvas.width,canvas.height]){
    const [x,y,w,h]=viewport;if(w<=0||h<=0)return;
    gl.viewport(x,y,w,h);gl.enable(gl.SCISSOR_TEST);gl.scissor(x,y,w,h);D.clearColor(gl);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.SCISSOR_TEST);
    M.lookAt(view,camera.eye,camera.target,camera.up||[0,1,0]);
    if(camera.orthographic){const half=camera.halfHeight||8;M.ortho(projection,-half*w/h,half*w/h,-half,half,camera.near||.02,camera.far||180);}
    else M.perspective(projection,(camera.fov||controls.state.fov)*Math.PI/180,w/h,camera.near||.02,camera.far||180);
    M.multiply(vp,projection,view);gl.useProgram(program);gl.uniformMatrix4fv(U.uVP,false,vp);gl.uniform1i(U.uMap,0);gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.CULL_FACE);
    for(const p of parts)if(!hidden.has(p.id)&&!hidden.has(p.group))drawMesh(cube,p.matrix,p.color);
    for(const s of signs)if(!hidden.has(s.id)&&!hidden.has(s.group)){
      drawMesh(plane,s.matrix,[.25,.28,.32]);gl.enable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);gl.bindTexture(gl.TEXTURE_2D,s.texture);drawMesh(plane,s.matrix,[1,1,1],true);gl.depthFunc(gl.LESS);gl.disable(gl.CULL_FACE);
    }
  }
  gl.enable(gl.DEPTH_TEST);
  let started=null,last='';
  const api={canvas,gl,model,controls,hidden,drawView,render:null};window.InspectionViewer=api;
  document.querySelector('#home').addEventListener('click',()=>{controls.home();controls.state.actions++;});
  document.querySelector('#measure').addEventListener('click',()=>{started=performance.now();controls.state.actions=0;});
  for(const p of model.tasks){const li=document.createElement('li');const title=document.createElement('strong');title.textContent=p.id+' '+p.name;li.append(title,document.createElement('br'),document.createTextNode(p.task));document.querySelector('#tasks').appendChild(li);}
  D.loop(()=>{
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const camera=controls.camera();
    if(api.render)api.render(api);else drawView(camera);
    drawMinimap(camera);
    const s=controls.state,value=`기본 트랙볼 · 거리 ${s.distance.toFixed(2)}m · FOV ${s.fov}°\n회전 중심 (${s.target.map(v=>v.toFixed(2)).join(', ')})\n측정 ${started===null?'시작 전':((performance.now()-started)/1000).toFixed(0)+'초'} · 기본 조작 ${s.actions}회`;
    if(value!==last){read.textContent=value;last=value;}
  });
})();
