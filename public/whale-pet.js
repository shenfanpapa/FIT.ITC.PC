(()=>{
  if(matchMedia('(max-width:768px)').matches)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),pet=document.createElement('div'),bubble=document.createElement('div');
  const makeVideo=src=>{const video=document.createElement('video');video.src=src;video.muted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.setAttribute('disablepictureinpicture','');video.setAttribute('controlslist','nodownload noremoteplayback nopictureinpicture');return video;};
  const idle=makeVideo('/assets/whale-pet/whale-idle.webm'),walk=makeVideo('/assets/whale-pet/whale-walk.webm');
  pet.id='whalePet';bubble.id='whalePetBubble';pet.append(idle,walk);document.body.append(pet,bubble);
  let x=40,y=40,vx=0,vy=0,dragging=false,last,mode='idle',active=idle,frameId=null,bubbleTimer=null;
  const say=(text,duration=5000)=>{bubble.textContent=text;bubble.classList.add('show');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>bubble.classList.remove('show'),duration);};
  window.whalePetSay=say;say('こんにちは。話しかけてね。');
  const floor=()=>{const tabs=document.getElementById('bottomTabs');return tabs?tabs.getBoundingClientRect().top-208:innerHeight-208};
  // The supplied walk clip faces screen-left by default, so mirror it while travelling right.
  const setFacing=()=>{walk.style.transform=vx<0?'scaleX(1)':'scaleX(-1)';};
  const showVideo=video=>{if(active===video)return;active.style.opacity='0';active.pause();active=video;active.style.opacity='1';};
  const playState=next=>{if(reduced.matches)return;mode=next;const video=mode==='idle'?idle:walk;showVideo(video);video.currentTime=0;video.play().catch(()=>{});};
  const beginWalk=()=>{const rightEdge=Math.max(0,innerWidth-208);vx=x<36?1.25:x>rightEdge-36?-1.25:(Math.random()<.5?-1.25:1.25);setFacing();playState('walk');};
  function put(){x=Math.max(0,Math.min(innerWidth-208,x));y=Math.max(0,Math.min(floor(),y));pet.style.transform=`translate3d(${x}px,${y}px,0)`;bubble.style.left=(x>innerWidth-330?x-20:x+104)+'px';bubble.style.top=Math.max(8,y-54)+'px';}
  function tick(){if(reduced.matches){put();active.pause();frameId=null;return;}if(!dragging){vy+=.35;y+=vy;const f=floor();if(y<=0)vy=Math.abs(vy)*.35;if(y>=f){y=f;vy*=-.18;if(Math.abs(vy)<.8)vy=0;}if(mode==='walk'){const elapsed=Number.isFinite(walk.currentTime)?walk.currentTime:0,remaining=Number.isFinite(walk.duration)?Math.max(0,walk.duration-elapsed):2;const accelerate=elapsed<2?Math.max(.06,elapsed/2):1,decelerate=remaining<2?Math.max(.06,remaining/2):1;x+=vx*Math.min(accelerate,decelerate);if(x<=0||x>=innerWidth-208){x=Math.max(0,Math.min(innerWidth-208,x));vx*=-1;setFacing();}}}put();frameId=requestAnimationFrame(tick);}
  const stopDrag=()=>{if(!dragging)return;dragging=false;playState('idle');};
  pet.onpointerdown=event=>{if(reduced.matches)return;dragging=true;active.pause();last=[event.clientX,event.clientY];pet.setPointerCapture(event.pointerId);};
  pet.onpointermove=event=>{if(!dragging)return;x+=event.clientX-last[0];y+=event.clientY-last[1];last=[event.clientX,event.clientY];put();};
  pet.onpointerup=stopDrag;pet.onpointercancel=stopDrag;pet.onlostpointercapture=stopDrag;
  [idle,walk].forEach(video=>video.addEventListener('ended',()=>{if(video!==active||dragging||reduced.matches)return;if(mode==='idle')beginWalk();else playState('idle');}));
  addEventListener('resize',put);document.addEventListener('visibilitychange',()=>{if(document.hidden)active.pause();else if(!reduced.matches&&!dragging)active.play().catch(()=>{});put();});
  reduced.addEventListener('change',()=>{if(reduced.matches){if(frameId)cancelAnimationFrame(frameId);frameId=null;active.pause();put();}else if(!frameId){playState('idle');frameId=requestAnimationFrame(tick);}});
  walk.style.opacity='0';if(reduced.matches){put();idle.pause();}else{playState('idle');frameId=requestAnimationFrame(tick);}
})();
