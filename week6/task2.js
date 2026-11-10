/* 6주차 실습 2 — catholic 기본 행성
 * UV 구 메시 위에 5주차 해왕성풍 절차 패턴과 6주차 PBR을 결합한다.
 */
(() => {
'use strict';
const cv=document.querySelector('#cv'), gl=D.context(cv); if(!gl)return;

const VS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uVP,uModel;
uniform mat3 uNormalMat;
out vec3 vLocalPos,vWorldPos,vWorldNormal;
out vec2 vUV;
void main(){
 vec4 world=uModel*vec4(aPos,1.0);
 vLocalPos=aPos;
 vWorldPos=world.xyz;
 vWorldNormal=normalize(uNormalMat*aNormal);
 vUV=aUV;
 gl_Position=uVP*world;
}`;

const FS=`#version 300 es
precision highp float;
const float PI=3.14159265;
in vec3 vLocalPos,vWorldPos,vWorldNormal; in vec2 vUV;
out vec4 outColor;
uniform sampler2D uColor,uNormal,uIceNormal,uARM,uEnv;
uniform vec3 uEye,uLight;
uniform float uRough,uMetal,uNormalStrength,uIceNormalStrength,uPower,uSolarLight,uAmbient,uEnvPower,uTime;
uniform float uIceAmount,uIceThreshold,uIceStrength;
uniform float uCraterAmount,uCraterSize,uCraterStrength;
uniform float uSolarDistance;
uniform int uDebugMode,uSunMode,uCompare;

vec3 srgbToLinear(vec3 c){
 return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));
}
vec3 linearToSrgb(vec3 c){
 return mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));
}
float hash31(vec3 p){
 p=fract(p*vec3(.1031,.1030,.0973));
 p+=dot(p,p.yzx+33.33);
 return fract((p.x+p.y)*p.z);
}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);
 f=f*f*(3.0-2.0*f);
 float x00=mix(hash31(i),hash31(i+vec3(1,0,0)),f.x);
 float x10=mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x);
 float x01=mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x);
 float x11=mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x);
 return mix(mix(x00,x10,f.y),mix(x01,x11,f.y),f.z);
}
float fbm(vec3 p){
 float value=0.0,amplitude=.5;
 for(int i=0;i<5;i++){
  value+=amplitude*noise3(p);
  p=p*2.0+vec3(17,31,47);
  amplitude*=.5;
 }
 return value;
}
float iceMask(vec3 S){
 float latitude= smoothstep(.28,.92,abs(S.y));
 float regional=fbm(S*vec3(4.0,7.0,4.0)+vec3(11.0,3.0,19.0));
 float breakup=fbm(S*vec3(11.0,16.0,11.0)+vec3(5.0,17.0,29.0));
 float pattern=mix(regional,breakup,.35);
 float signal=clamp(latitude*.72+pattern*.48,0.0,1.0);
 return smoothstep(uIceThreshold-.12,uIceThreshold+.12,signal)*uIceAmount;
}
float crackMask(vec3 S,vec2 uv){
 float crackAmount=1.0-uSolarDistance;
 if(crackAmount<=0.0)return 0.0;
 float regionNoise=fbm(S*vec3(3.0,5.0,3.0)+vec3(23.0,7.0,41.0));
 float region=smoothstep(.82-crackAmount*.72,.94-crackAmount*.72,regionNoise);
 vec2 normalXY=texture(uIceNormal,uv*vec2(4.0,2.0)).xy*2.0-1.0;
 float line=smoothstep(.015,.22,length(normalXY));
 return clamp(region*line*crackAmount*1.35,0.0,1.0);
}
float eruptionDistance(vec3 S){
 float scale=mix(8.0,3.0,uCraterSize);
 vec3 p=S*scale;
 vec3 cell=floor(p),f=fract(p);
 float best=9.0;
 for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){
  vec3 g=vec3(float(x),float(y),float(z));
  vec3 id=cell+g;
  float accepted=step(hash31(id+41.7),uCraterAmount);
  vec3 offset=vec3(hash31(id),hash31(id+7.3),hash31(id+13.7));
  float size=(.36+.52*hash31(id+21.1))*mix(.72,1.35,uCraterSize);
  vec3 delta=g+offset-f;
  best=min(best,mix(9.0,length(vec2(delta.y,delta.z*.35))/size,accepted));
 }
 return best;
}
float eruptionMask(vec3 S){
 return 1.0-smoothstep(.10,.58,eruptionDistance(S));
}
vec3 nereidBase(vec3 S){
 float lat=S.y;
 float warp=fbm(S*vec3(3,8,3)+vec3(uTime*.03,0,0));
 float band=.5+.5*sin(lat*13.0+warp*3.0);
 vec3 base=mix(vec3(.07,.15,.48),vec3(.15,.34,.82),band);
 vec3 spotCenter=normalize(vec3(.30,-.35,.89));
 vec3 east=normalize(vec3(spotCenter.z,0,-spotCenter.x));
 vec3 north=normalize(cross(spotCenter,east));
 vec3 delta=S-spotCenter;
 float spotDist=length(vec2(dot(delta,east)*.60,dot(delta,north)));
 float spot=1.0-smoothstep(.06,.14,spotDist);
 base=mix(base,vec3(.025,.07,.28),spot*.8);
 float streak=smoothstep(.64,.74,fbm(S*vec3(3,11,3)+vec3(uTime*.03,3,0)));
 return mix(base,vec3(.82,.92,1.0),streak*.6);
}
vec3 directPBR(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal){
 vec3 H=normalize(V+L);
 float nl=max(dot(N,L),0.0),nv=max(dot(N,V),0.0);
 float nh=max(dot(N,H),0.0),vh=max(dot(V,H),0.0);
 float a=rough*rough,a2=a*a;
 float den=nh*nh*(a2-1.0)+1.0;
 float D=a2/max(PI*den*den,1e-6);
 float k=(rough+1.0)*(rough+1.0)/8.0;
 float G=(nl/(nl*(1.0-k)+k))*(nv/(nv*(1.0-k)+k));
 vec3 F0=mix(vec3(.04),base,metal);
 vec3 F=F0+(1.0-F0)*pow(1.0-vh,5.0);
 vec3 kd=(1.0-F)*(1.0-metal);
 return (kd*base/PI+D*G*F/max(4.0*nl*nv,1e-4))*nl*uPower*uSolarLight;
}
void main(){
 if(uSunMode==1){
  vec3 emission=vec3(7.0,3.0,0.65);
  emission=emission/(1.0+emission);
  outColor=vec4(linearToSrgb(emission),1.0);
  return;
 }
 vec3 N=normalize(vWorldNormal),V=normalize(uEye-vWorldPos);
 vec3 L=normalize(uLight-vWorldPos);
 vec3 S=normalize(vLocalPos);
 float crack=crackMask(S,vUV);
 vec3 textureBase=srgbToLinear(texture(uColor,vUV).rgb);
 vec3 base=nereidBase(S)*textureBase;
 float ice=iceMask(S);
 float eruption=eruptionMask(S);
 if(uDebugMode==1){
  outColor=vec4(vec3(ice),1.0);
  return;
 }
 if(uDebugMode==2){
  outColor=vec4(vec3(eruption),1.0);
  return;
 }
 if(uDebugMode==3){
  outColor=vec4(vec3(crack),1.0);
  return;
 }
 vec3 iceColor=vec3(.38,.78,1.0);
 float surfaceEffects=1.0-float(uCompare);
 float iceEffect=clamp(ice*uIceStrength*1.35,0.0,1.0)*surfaceEffects;
 base=mix(base,mix(iceColor,vec3(1.0,.99,.96),ice),iceEffect);
 float crackEffect=crack*surfaceEffects;
 base=mix(base,vec3(.02,.10,.22),crackEffect);
 float eruptionEffect=eruption*uCraterStrength*surfaceEffects;
 base=mix(base,vec3(.92,.96,1.0),eruptionEffect);
 vec3 arm=texture(uARM,vUV).rgb;
 float ao=arm.r;
 float rough=max(arm.g*uRough,.045);
 float metal=arm.b*uMetal;
 rough=mix(rough,.46,iceEffect);
 rough=mix(rough,.8,eruptionEffect);
 rough=mix(rough,.12,crackEffect);
 if(uNormalStrength>0.0){
  vec3 dp1=dFdx(vWorldPos),dp2=dFdy(vWorldPos);
  vec2 du1=dFdx(vUV),du2=dFdy(vUV);
  vec3 T=cross(dp2,N)*du1.x+cross(N,dp1)*du2.x;
  vec3 B=cross(dp2,N)*du1.y+cross(N,dp1)*du2.y;
  float inv=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-8));
  vec3 rockN=texture(uNormal,vUV).xyz*2.0-1.0;
  vec3 iceN=texture(uIceNormal,vUV*vec2(4.0,2.0)).xyz*2.0-1.0;
  iceN.xy*=uIceNormalStrength*5.0;
  iceN=normalize(iceN);
  vec3 mapN=normalize(mix(rockN,iceN,ice*surfaceEffects));
  mapN.xy*=uNormalStrength;
  float crackNoise=noise3(S*32.0+vec3(7.0,13.0,23.0));
  float crack=smoothstep(.42,.58,crackNoise);
  vec2 iceBump=vec2(
   noise3(S*46.0+vec3(2.0,19.0,31.0)),
   noise3(S*46.0+vec3(37.0,5.0,11.0))
  )*2.0-1.0;
  mapN.xy+=iceBump*(.08+.12*crack)*iceEffect;
  N=normalize(mat3(T*inv,B*inv,N)*normalize(mapN));
 }
 vec3 color=directPBR(N,V,L,base,rough,metal);
 vec3 F0=mix(vec3(.04),base,metal);
 color+=uAmbient*ao*(base*(1.0-metal)*(1.0-F0)+F0);
 vec3 reflected=reflect(-V,N);
 vec2 envUV=vec2(atan(reflected.z,reflected.x)/(2.0*PI)+.5,
                  asin(clamp(reflected.y,-1.0,1.0))/PI+.5);
 vec3 envColor=srgbToLinear(textureLod(uEnv,envUV,rough*7.0).rgb);
 color+=uEnvPower*ao*envColor*F0;
 color=max(color,vec3(0));
 color=color/(1.0+color);
 outColor=vec4(linearToSrgb(color),1.0);
}`;

const prog=D.program(gl,VS,FS),U=D.uniforms(gl,prog,[
 'uVP','uModel','uNormalMat','uEye','uLight','uRough','uMetal',
 'uNormalStrength','uIceNormalStrength','uPower','uSolarLight','uAmbient','uEnvPower','uTime',
 'uIceAmount','uIceThreshold','uIceStrength',
 'uCraterAmount','uCraterSize','uCraterStrength','uDebugMode',
 'uSolarDistance','uSunMode','uCompare',
 'uColor','uNormal','uIceNormal','uARM','uEnv'
]);
const mesh=D.upload(gl,D.revolution(D.profiles.sphere(.95,64),96));

function solidTexture(r,g,b){
 const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([r,g,b,255]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 return tex;
}
function loadImage(name,fallback=[0,0,0,255],extension='.jpg',repeat=false){
 const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(fallback));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 if(repeat){
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 }
 const job=new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   gl.bindTexture(gl.TEXTURE_2D,tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   if(repeat){
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
   }
   resolve();
  };
  image.onerror=()=>resolve();
  image.src='assets/week06/'+name+extension;
 });
 return {tex,job};
}
const colorTex=solidTexture(255,255,255);
const normalAsset=loadImage('rock_boulder_dry_nor_gl',[128,128,255,255]);
const normalTex=normalAsset.tex;
const iceNormalAsset=loadImage('Ice003_2K-PNG_NormalGL',[128,128,255,255],'.png',true);
const iceNormalTex=iceNormalAsset.tex;
const armTex=solidTexture(255,255,0);
const env=loadImage('studio_small_09_tonemapped');
Promise.all([env.job,normalAsset.job,iceNormalAsset.job]).then(()=>{document.querySelector('#status').textContent='catholic · PBR 텍스처와 노멀맵 로딩 완료';});

document.querySelector('#ui').innerHTML='';
const S=D.UI('#ui',[
 {id:'rough',label:'roughness',min:.05,max:1,step:.01,value:.62},
 {id:'metal',label:'metallic',min:0,max:1,step:.01,value:.08},
 {id:'normal',label:'normal 강도',min:0,max:5,step:.1,value:1},
 {id:'iceNormal',label:'ice normal 강도',min:0,max:5,step:.1,value:1.5},
 {id:'power',label:'직접광 세기',min:0,max:8,step:.1,value:4},
 {id:'ambient',label:'상수 ambient',min:0,max:1,step:.01,value:.15},
 {id:'env',label:'환경맵 반사 세기',min:0,max:3,step:.1,value:1.2},
 {id:'iceAmount',label:'얼음 분포량',min:0,max:1,step:.01,value:1},
 {id:'iceThreshold',label:'얼음 경계',min:0,max:1,step:.01,value:.62},
 {id:'iceStrength',label:'얼음 강도',min:0,max:1,step:.01,value:.72},
 {id:'craterAmount',label:'분출 개수',min:0,max:1,step:.01,value:.45},
 {id:'craterSize',label:'분출 범위',min:0,max:1,step:.01,value:.5},
 {id:'craterStrength',label:'분출 강도',min:0,max:1,step:.01,value:.75},
 {id:'spin',type:'check',label:'자전 정지',value:false},
 {id:'compare',type:'check',label:'기본 표면과 비교',value:false},
 {id:'debug',type:'select',label:'진단 모드',value:'final',options:[
  {value:'final',label:'일반 모드'},
  {value:'ice',label:'얼음 마스크'},
  {value:'crater',label:'분출 마스크'},
  {value:'crack',label:'균열 마스크'}]},
 {id:'solarDistance',label:'태양 거리',min:0,max:1,step:.01,value:.45}
]);
const cam=D.orbit(cv,{dist:5.2,pitch:.12});
document.querySelector('#reset').onclick=()=>{cam.dist=5.2;cam.yaw=0;cam.pitch=.12;};
const view=D.M4.create(),proj=D.M4.create(),vp=D.M4.create(),model=D.M4.create();
const eye=[0,0,0],light=[0,0,0],sunModel=D.M4.create();
document.querySelector('#note').textContent='catholic · 태양 거리와 얼음 분포가 연결된 해왕성풍 행성';
let visible=true; new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(cv);
let lastTime=null,spinAngle=0;
D.loop((time)=>{
 const delta=lastTime===null?0:time-lastTime;
 lastTime=time;
 if(!visible||document.hidden)return;
 D.fit(cv); gl.viewport(0,0,cv.width,cv.height); D.clearColor(gl);
 gl.enable(gl.DEPTH_TEST); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const camera=cam.eye(eye);
 D.M4.lookAt(view,camera,[0,0,0],[0,1,0]);
 D.M4.perspective(proj,Math.PI/4,cv.width/cv.height,.1,100);
 D.M4.multiply(vp,proj,view);
 D.M4.identity(model);
 if(!S.spin)spinAngle+=delta*.18;
 D.M4.rotateY(model,model,spinAngle);
 const solarDistance=S.solarDistance;
 light[0]=1.8+.9*solarDistance;
 light[1]=1.0+.5*solarDistance;
 light[2]=2.4+1.2*solarDistance;
 gl.useProgram(prog);
 gl.uniformMatrix4fv(U.uVP,false,vp);
 gl.uniformMatrix4fv(U.uModel,false,model);
 gl.uniformMatrix3fv(U.uNormalMat,false,D.M4.normalFrom(model));
 gl.uniform3fv(U.uEye,camera);
 gl.uniform3fv(U.uLight,light);
 gl.uniform1f(U.uTime,time);
 gl.uniform1f(U.uSolarDistance,solarDistance);
 gl.uniform1f(U.uSolarLight,1.15-.43*solarDistance);
 gl.uniform1i(U.uSunMode,0);
 for(const [key,value] of Object.entries({
  uRough:S.rough,uMetal:S.metal,uNormalStrength:S.normal,uIceNormalStrength:S.iceNormal,
  uPower:S.power,uAmbient:S.ambient,uEnvPower:S.env
 })) gl.uniform1f(U[key],value);
 gl.uniform1i(U.uCompare,S.compare?1:0);
 gl.uniform1f(U.uIceAmount,S.iceAmount);
 gl.uniform1f(U.uIceThreshold,S.iceThreshold);
 gl.uniform1f(U.uIceStrength,S.iceStrength);
 gl.uniform1f(U.uCraterAmount,S.craterAmount);
 gl.uniform1f(U.uCraterSize,S.craterSize);
 gl.uniform1f(U.uCraterStrength,S.craterStrength);
 gl.uniform1i(U.uDebugMode,S.debug==='crack'?3:(S.debug==='crater'?2:(S.debug==='ice'?1:0)));
 const textures=[colorTex,normalTex,iceNormalTex,armTex,env.tex];
 textures.forEach((tex,i)=>{
  gl.activeTexture(gl.TEXTURE0+i); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(U[['uColor','uNormal','uIceNormal','uARM','uEnv'][i]],i);
 });
 gl.bindVertexArray(mesh.vao);
 gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 D.M4.identity(sunModel);
 D.M4.translate(sunModel,sunModel,light);
 D.M4.scale(sunModel,sunModel,[.28,.28,.28]);
 gl.uniformMatrix4fv(U.uModel,false,sunModel);
 gl.uniformMatrix3fv(U.uNormalMat,false,D.M4.normalFrom(sunModel));
 gl.uniform1i(U.uSunMode,1);
 gl.bindVertexArray(mesh.vao);
 gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 gl.bindVertexArray(null);
});
})();
