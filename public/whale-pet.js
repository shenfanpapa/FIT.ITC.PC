(function(){
  'use strict';
  if (window.matchMedia('(max-width: 768px)').matches) return;
  var pet=document.createElement('div');
  pet.id='whalePet';
  pet.setAttribute('aria-hidden','true');
  var video=document.createElement('video');
  video.muted=true; video.loop=true; video.playsInline=true; video.preload='auto';
  pet.appendChild(video); document.body.appendChild(pet);

  var clips={idle:'/assets/whale-pet/whale-idle.webm',walk:'/assets/whale-pet/whale-walk.webm'};
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var start=performance.now(), animationId=0, current='';
  function setClip(name){
    if(current===name) return;
    current=name; video.src=clips[name];
    var play=video.play(); if(play&&play.catch) play.catch(function(){});
  }
  function bounds(){
    var size=112, inset=14, top=66, bottom=88;
    return {size:size,left:inset,top:top,right:Math.max(inset,window.innerWidth-size-inset),bottom:Math.max(top,window.innerHeight-size-bottom)};
  }
  function placeStatic(){
    pet.classList.add('is-resting'); setClip('idle');
  }
  function tick(now){
    if(reduced.matches){placeStatic(); return;}
    var b=bounds(), horizontal=b.right-b.left, vertical=b.bottom-b.top;
    var perimeter=Math.max(1,(horizontal+vertical)*2), travel=((now-start)*0.045)%perimeter;
    var x=b.left,y=b.top,flip=1;
    if(travel<horizontal){x=b.left+travel; y=b.top; flip=1;}
    else if((travel-=horizontal)<vertical){x=b.right; y=b.top+travel; flip=1;}
    else if((travel-=vertical)<horizontal){x=b.right-travel; y=b.bottom; flip=-1;}
    else {travel-=horizontal; x=b.left; y=b.bottom-travel; flip=-1;}
    var resting=((now-start)%60000)>51000;
    pet.classList.toggle('is-resting',resting); setClip(resting?'idle':'walk');
    pet.style.transform='translate3d('+Math.round(x)+'px,'+Math.round(y)+'px,0) scaleX('+flip+')';
    animationId=requestAnimationFrame(tick);
  }
  reduced.addEventListener('change',function(){cancelAnimationFrame(animationId); start=performance.now(); if(reduced.matches) placeStatic(); else animationId=requestAnimationFrame(tick);});
  document.addEventListener('visibilitychange',function(){if(document.hidden) cancelAnimationFrame(animationId); else if(!reduced.matches){start=performance.now(); animationId=requestAnimationFrame(tick);}});
  setClip('idle'); if(reduced.matches) placeStatic(); else animationId=requestAnimationFrame(tick);
})();