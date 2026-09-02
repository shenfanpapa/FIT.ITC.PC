(()=>{
  if(matchMedia('(max-width:768px)').matches)return;
  const pet=document.getElementById('whalePet');if(!pet)return;
  let pass=localStorage.getItem('fit_pet_verified')||'';
  const password=document.createElement('form'),input=document.createElement('form'),bubble=document.getElementById('whalePetBubble');
  password.id='whalePassword';input.id='whaleInput';password.hidden=input.hidden=true;
  password.innerHTML='<span class="whaleDialogHandle" title="拖动对话框" aria-label="拖动对话框">⠿</span><input type="password" placeholder="合言葉" required><button>確認</button><button type="button" aria-label="关闭">×</button>';
  input.innerHTML='<span class="whaleDialogHandle" title="拖动对话框" aria-label="拖动对话框">⠿</span><input placeholder="質問を入力" required><button>送信</button><button type="button" aria-label="关闭">×</button>';
  document.body.append(password,input);
  const close=form=>form.hidden=true;
  const makeDraggable=form=>{
    const handle=form.querySelector('.whaleDialogHandle');let start;
    handle.addEventListener('pointerdown',event=>{const rect=form.getBoundingClientRect();start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};form.style.left=rect.left+'px';form.style.top=rect.top+'px';form.style.right='auto';form.style.bottom='auto';handle.setPointerCapture(event.pointerId);event.preventDefault();});
    handle.addEventListener('pointermove',event=>{if(!start)return;const width=form.offsetWidth,height=form.offsetHeight;const left=Math.max(8,Math.min(innerWidth-width-8,start.left+event.clientX-start.x));const top=Math.max(8,Math.min(innerHeight-height-8,start.top+event.clientY-start.y));form.style.left=left+'px';form.style.top=top+'px';});
    const stop=()=>{start=null;};handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
  };
  [password,input].forEach(form=>{form.querySelector('button[type=button]').onclick=()=>close(form);makeDraggable(form);});
  pet.addEventListener('click',()=>{const form=pass?input:password;form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input').focus();});
  password.onsubmit=event=>{event.preventDefault();pass=password.querySelector('input').value;localStorage.setItem('fit_pet_verified',pass);close(password);bubble.textContent='今日は何を確認しますか？';bubble.classList.add('show');};
  input.onsubmit=async event=>{event.preventDefault();const field=input.querySelector('input'),send=input.querySelector('button'),message=field.value.trim();if(!message)return;send.disabled=true;send.textContent='考え中…';try{const response=await fetch('/api/pet/chat',{method:'POST',headers:{'Content-Type':'application/json','x-pet-password':pass},body:JSON.stringify({message})});const data=await response.json();bubble.textContent=data.answer||data.message||'返事を受け取れませんでした。';bubble.classList.add('show');if(response.status===401){pass='';localStorage.removeItem('fit_pet_verified');}}catch(_error){bubble.textContent='接続できませんでした。もう一度お試しください。';bubble.classList.add('show');}finally{send.disabled=false;send.textContent='送信';close(input);}};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){close(password);close(input);}});
})();
