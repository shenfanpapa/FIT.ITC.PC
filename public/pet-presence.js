(()=>{
  let mobileTimer;
  addEventListener('whale:say',event=>{
    const {text,duration=6500}=event.detail||{};
    if(!text)return;
    const reply=document.querySelector('.whalePetReply');if(reply)reply.textContent=text;
    const bubble=document.getElementById('whaleMobileBubble');
    if(bubble){bubble.textContent=text;bubble.classList.add('show');clearTimeout(mobileTimer);mobileTimer=setTimeout(()=>bubble.classList.remove('show'),duration);}
  });
})();
