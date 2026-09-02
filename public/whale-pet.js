(()=>{
  if(matchMedia('(max-width:768px)').matches)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pet=document.createElement('div'),video=document.createElement('video'),bubble=document.createElement('div');
  const idle='/assets/whale-pet/whale-idle.webm',walk='/assets/whale-pet/whale-walk.webm';
  pet.id='whalePet';bubble.id='whalePetBubble';
  video.src=idle;video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.preload='metadata';
  video.disablePictureInPicture=true;video.setAttribute('disablepictureinpicture','');video.setAttribute('controlslist','nodownload noremoteplayback nopictureinpicture');
  pet.append(video);document.body.append(pet,bubble);

  let x=40,y=40,vx=0,dragging=false,last,mode='idle',frameId=null;
  const floor=()=>{const tabs=document.getElementById('bottomTabs');return tabs?tabs.getBoundingClientRect().top-208:innerHeight-208};
  const playState=nextMode=>{
    if(reduced.matches)return;
    mode=nextMode;video.src=mode==='idle'?idle:walk;video.loop=false;video.play().catch(()=>{});
  };
  const beginWalk=()=>{
    const room=Math.max(0,innerWidth-208);
    vx=x<36?1.25:x>room-36?-1.25:(Math.random()<.5?-1.25:1.25);
    playState('walk');
  };
  function put(){
    x=Math.max(0,Math.min(innerWidth-208,x));y=Math.max(0,Math.min(floor(),y));
    pet.style.transform=`translate3d(${x}px,${y}px,0)`;
    bubble.style.left=(x>innerWidth-330?x-20:x+104)+'px';bubble.style.top=Math.max(8,y-54)+'px';
  }
  function tick(t){
    if(reduced.matches){put();video.pause();frameId=null;return;}
    if(!dragging&&mode==='walk'){
      x+=vx;
      if(x<=0||x>=innerWidth-208){x=Math.max(0,Math.min(innerWidth-208,x));vx*=-1;}
    }
    put();frameId=requestAnimationFrame(tick);
  }
  const stopDrag=()=>{if(!dragging)return;dragging=false;playState('idle');};
  pet.onpointerdown=e=>{if(reduced.matches)return;dragging=true;video.pause();last=[e.clientX,e.clientY];pet.setPointerCapture(e.pointerId);};
  pet.onpointermove=e=>{if(!dragging)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];x+=dx;y+=dy;last=[e.clientX,e.clientY];put();};
  pet.onpointerup=stopDrag;pet.onpointercancel=stopDrag;pet.onlostpointercapture=stopDrag;
  video.addEventListener('ended',()=>{if(!dragging&&!reduced.matches){if(mode==='idle')beginWalk();else playState('idle');}});
  addEventListener('resize',put);document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced.matches&&!dragging)video.play().catch(()=>{});put();});
  reduced.addEventListener('change',()=>{if(reduced.matches){if(frameId)cancelAnimationFrame(frameId);frameId=null;video.pause();put();}else if(!frameId){playState('idle');frameId=requestAnimationFrame(tick);}});
  if(reduced.matches){put();video.pause();}else{playState('idle');frameId=requestAnimationFrame(tick);}
})();
