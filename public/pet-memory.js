(()=>{
  const key='whale_memory_id';
  let memoryId=localStorage.getItem(key);
  if(!memoryId){memoryId=(crypto.randomUUID?.()||`whale_${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'_');localStorage.setItem(key,memoryId)}
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(resource,options)=>{
    const url=typeof resource==='string'?resource:resource?.url;
    if(url==='/api/pet/chat'&&options?.body){
      try{const body=JSON.parse(options.body);options={...options,body:JSON.stringify({...body,memoryId})}}catch(_){}
    }
    return nativeFetch(resource,options);
  };
  window.clearWhaleMemory=async()=>{
    const response=await nativeFetch('/api/pet/memory/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memoryId})});
    if(!response.ok)throw new Error('記憶を消去できませんでした。');
    return true;
  };
  const addClearButton=(container)=>{
    if(!container||container.querySelector('.whaleMemoryClear'))return;
    const button=document.createElement('button');button.type='button';button.className='rdrawer-btn whaleMemoryClear';button.innerHTML='<span class="rdrawer-btn-icon">記</span>鯨の記憶を消す';
    button.onclick=async()=>{if(!confirm('鯨の長期記憶を消しますか？'))return;button.disabled=true;try{await window.clearWhaleMemory();alert('鯨の長期記憶を消しました。')}catch(error){alert(error.message)}finally{button.disabled=false}};
    container.append(button);
  };
  const attach=()=>addClearButton(document.querySelector('#rdrawer .rdrawer-body'));
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
})();
