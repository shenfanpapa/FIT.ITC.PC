(()=>{
  if(matchMedia('(max-width:768px)').matches)return;
  const pet=document.getElementById('whalePet');if(!pet)return;
  let pass='';
  const password=document.createElement('section'),input=document.createElement('section'),bubble=document.getElementById('whalePetBubble');
  password.className='whalePetDialog';input.className='whalePetDialog';password.hidden=input.hidden=true;
  password.innerHTML='<div class="whaleDialogBar"><span class="whaleDialogHandle" title="拖动对话框" aria-label="拖动对话框">⠿</span><strong>鯨に話しかける</strong><button type="button" aria-label="关闭">×</button></div><div class="whaleDialogRow"><input type="password" placeholder="合言葉" aria-label="合言葉"><button class="whaleConfirm">確認</button></div>';
  input.innerHTML='<div class="whaleDialogBar"><span class="whaleDialogHandle" title="拖动对话框" aria-label="拖动对话框">⠿</span><strong>鯨</strong><button type="button" aria-label="关闭">×</button></div><div class="whalePetReply" aria-live="polite">今日は何を確認しますか？</div><div class="whaleDialogRow"><input placeholder="質問を入力" aria-label="質問を入力"><button class="whaleSend">送信</button></div>';
  document.body.append(password,input);
  // Password lives only in this page's memory. A refresh requires it again, closing the panel does not.
  const close=form=>{form.hidden=true;};
  const makeDraggable=form=>{
    const handle=form.querySelector('.whaleDialogHandle');let start;
    handle.addEventListener('pointerdown',event=>{const rect=form.getBoundingClientRect();start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};form.style.setProperty('left',rect.left+'px','important');form.style.setProperty('top',rect.top+'px','important');form.style.setProperty('right','auto','important');form.style.setProperty('bottom','auto','important');handle.setPointerCapture(event.pointerId);event.preventDefault();});
    handle.addEventListener('pointermove',event=>{if(!start)return;const width=form.offsetWidth,height=form.offsetHeight;const left=Math.max(8,Math.min(innerWidth-width-8,start.left+event.clientX-start.x));const top=Math.max(8,Math.min(innerHeight-height-8,start.top+event.clientY-start.y));form.style.setProperty('left',left+'px','important');form.style.setProperty('top',top+'px','important');});
    const stop=()=>{start=null;};handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
  };
  [password,input].forEach(form=>{form.querySelector('button[type=button]').onclick=()=>close(form);makeDraggable(form);});
  pet.addEventListener('click',()=>{const dialog=pass?input:password;dialog.hidden=!dialog.hidden;if(!dialog.hidden)dialog.querySelector('input').focus();});
  password.querySelector('.whaleConfirm').onclick=()=>{const value=password.querySelector('input').value.trim();if(!value)return;pass=value;password.querySelector('input').value='';close(password);input.querySelector('.whalePetReply').textContent='今日は何を確認しますか？';window.whalePetSay?.('今日は何を確認しますか？');input.hidden=false;input.querySelector('input').focus();};
  password.querySelector('input').addEventListener('keydown',event=>{if(event.key==='Enter')password.querySelector('.whaleConfirm').click();});
  const sendMessage=async()=>{const field=input.querySelector('input'),send=input.querySelector('.whaleSend'),reply=input.querySelector('.whalePetReply'),message=field.value.trim();if(!message)return;send.disabled=true;send.textContent='考えています…';reply.textContent='考えています…';try{const response=await fetch('/api/pet/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,password:pass})});const text=await response.text();let data={};try{data=JSON.parse(text);}catch(_error){}if(!response.ok)throw new Error(data.message||`HTTP ${response.status}`);reply.textContent=data.answer||data.message||'返事を受け取れませんでした。';window.whalePetSay?.(reply.textContent,8000);}catch(error){reply.textContent=error.message||'接続できませんでした。もう一度お試しください。';window.whalePetSay?.(reply.textContent,6000);}finally{send.disabled=false;send.textContent='送信';}};
  input.querySelector('.whaleSend').onclick=sendMessage;input.querySelector('input').addEventListener('keydown',event=>{if(event.key==='Enter')sendMessage();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){close(password);close(input);}});
})();
