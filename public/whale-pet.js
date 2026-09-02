(()=>{
  if(matchMedia('(max-width:768px)').matches)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pet=document.createElement('div'),video=document.createElement('video'),bubble=document.createElement('div');
  const idle='/assets/whale-pet/whale-idle.webm',walk='/assets/whale-pet/whale-walk.webm';
  pet.id='whalePet';bubble.id='whalePetBubble';
  video.src=idle;video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.preload='metadata';
  video.disablePictureInPicture=true;video.setAttribute('disablepictureinpicture','');video.setAttribute('controlslist','nodownload noremoteplayback nopictureinpicture');
  pet.append(video);document.body.append(pet,bubble);

  let x=40,y=40,vx=0,vy=0,dragging=false,last,next=performance.now()+5000,walking=false,frameId=null;
  const floor=()=>{const tabs=document.getElementById('bottomTabs');return tabs?tabs.getBoundingClientRect().top-208:innerHeight-208};
  const setWalking=active=>{
    if(active===walking||reduced.matches)return;
    walking=active;video.src=active?walk:idle;video.play().catch(()=>{});
  };
  function put(){
    x=Math.max(0,Math.min(innerWidth-208,x));y=Math.max(0,Math.min(floor(),y));
    pet.style.transform=`translate3d(${x}px,${y}px,0)`;
    bubble.style.left=(x>innerWidth-330?x-20:x+104)+'px';bubble.style.top=Math.max(8,y-54)+'px';
  }
  function tick(t){
    if(reduced.matches){put();video.pause();frameId=null;return;}
    if(!dragging){
      vy+=.35;x+=vx;y+=vy;const f=floor();
      if(x<=0||x>=innerWidth-208)vx*=-.45;
      if(y<=0)vy=Math.abs(vy)*.35;
      if(y>=f){y=f;vy*=-.18;if(Math.abs(vy)<.8)vy=0;}
      vx*=.90;
      if(t>next&&Math.abs(vx)<1&&Math.abs(vy)<1){vx=(Math.random()<.5?-1:1)*(2+Math.random()*2);next=t+5000+Math.random()*5000;}
    }
    setWalking(Math.abs(vx)>1||Math.abs(vy)>1||dragging);put();frameId=requestAnimationFrame(tick);
  }
  const stopDrag=()=>{dragging=false;setWalking(Math.abs(vx)>1||Math.abs(vy)>1);};
  pet.onpointerdown=e=>{if(reduced.matches)return;dragging=true;last=[e.clientX,e.clientY,performance.now()];pet.setPointerCapture(e.pointerId);setWalking(true);};
  pet.onpointermove=e=>{if(!dragging)return;const now=performance.now(),dx=e.clientX-last[0],dy=e.clientY-last[1],elapsed=Math.max(1,now-last[2]);x+=dx;y+=dy;vx=Math.max(-14,Math.min(14,dx/elapsed*10));vy=Math.max(-14,Math.min(14,dy/elapsed*10));last=[e.clientX,e.clientY,now];put();};
  pet.onpointerup=stopDrag;pet.onpointercancel=stopDrag;pet.onlostpointercapture=stopDrag;
  addEventListener('resize',put);document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced.matches)video.play().catch(()=>{});put();});
  reduced.addEventListener('change',()=>{if(reduced.matches){if(frameId)cancelAnimationFrame(frameId);frameId=null;video.pause();setWalking(false);put();}else if(!frameId){video.play().catch(()=>{});frameId=requestAnimationFrame(tick);}});
  if(reduced.matches){put();video.pause();}else frameId=requestAnimationFrame(tick);
})();
