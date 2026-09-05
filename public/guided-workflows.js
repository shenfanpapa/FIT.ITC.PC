(()=>{
  const baseGuide=window.whaleGuide;
  let cleanup=()=>{};
  const pulse=element=>{if(!element)return;element.classList.remove('whale-guide-pulse');void element.offsetWidth;element.classList.add('whale-guide-pulse');setTimeout(()=>element.classList.remove('whale-guide-pulse'),3400)};
  const buttonByText=text=>[...document.querySelectorAll('button,.grp-add')].find(element=>text.test(element.textContent||''));
  const panel=()=>{let element=document.getElementById('whaleWorkflow');if(element)return element;element=document.createElement('aside');element.id='whaleWorkflow';element.className='whale-workflow';document.body.append(element);return element;};
  const step=(number,text,target,next)=>{cleanup();const box=panel();box.innerHTML=`<span>${number}</span><p>${text}</p><button type="button" aria-label="案内を閉じる">×</button>`;box.querySelector('button').onclick=stop;pulse(target);if(next&&target){const handler=()=>setTimeout(next,260);target.addEventListener('click',handler,{once:true});cleanup=()=>target.removeEventListener('click',handler);}};
  const stop=()=>{cleanup();document.getElementById('whaleWorkflow')?.remove();cleanup=()=>{}};
  const waitFor=(finder,next,tries=0)=>{const target=finder();if(target)return next(target);if(tries<30)setTimeout(()=>waitFor(finder,next,tries+1),180);else stop();};
  const groupWorkflow=()=>{
    stop();const menu=document.querySelector('.btab-menu');const group=()=>buttonByText(/グループ設定/);
    if(group())return groupStep(group());
    step('1 / 3','まず「メニュー」を開きます。',menu,()=>waitFor(group,groupStep));
  };
  const groupStep=target=>step('2 / 3','「グループ設定」を押します。',target,()=>waitFor(()=>document.querySelector('.grp-add,.sidebar'),groupPage));
  const groupPage=target=>{const add=document.querySelector('.grp-add');if(add)step('3 / 3','新しい列は「列グループを追加」から作成します。作成後、グループを選んで設備をクリックまたはドラッグしてください。',add,()=>waitFor(()=>document.getElementById('gName'),nameStep));else step('3 / 3','左側でグループを選択してから、設備をクリックまたはドラッグして追加します。',target);};
  const nameStep=target=>step('入力','グループ名を入力し、カラーを選んで作成します。',target);
  const layoutWorkflow=()=>{stop();const menu=document.querySelector('.btab-menu'),edit=()=>buttonByText(/レイアウト編集/);if(edit())return layoutStep(edit());step('1 / 2','まず「メニュー」を開きます。',menu,()=>waitFor(edit,layoutStep));};
  const layoutStep=target=>step('2 / 2','「レイアウト編集」を押した後、設備を選択して位置や表示を調整します。',target);
  window.whaleGuide=id=>{const key=String(id||'').toLowerCase();if(key==='group-settings')return groupWorkflow();if(key==='layout-edit')return layoutWorkflow();stop();baseGuide?.(key);};
})();
