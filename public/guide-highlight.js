(()=>{
  const previous=window.whaleGuide;
  const pulse=element=>{if(!element)return false;element.classList.remove('whale-guide-pulse');void element.offsetWidth;element.classList.add('whale-guide-pulse');setTimeout(()=>element.classList.remove('whale-guide-pulse'),5000);return true;};
  const drawerOpen=()=>document.getElementById('rdrawer')?.classList.contains('open');
  const menu=()=>document.querySelector('.btab-menu');
  const showStep=(text)=>{let note=document.getElementById('whaleGuideNote');if(!note){note=document.createElement('div');note.id='whaleGuideNote';note.className='whale-guide-note';document.body.append(note)}note.textContent=text;clearTimeout(note._timer);note._timer=setTimeout(()=>note.remove(),8000);};
  const waitFor=(finder,callback,attempt=0)=>{const target=finder();if(target)return callback(target);if(attempt<28)setTimeout(()=>waitFor(finder,callback,attempt+1),180);};
  const inMenu=(label,finder,after)=>{
    const target=finder();
    if(drawerOpen()&&target){showStep(`次に「${label}」を押してください。`);pulse(target);return;}
    const trigger=menu();showStep('まず「メニュー」を開いてください。');pulse(trigger);
    trigger?.addEventListener('click',()=>waitFor(finder,element=>{showStep(`次に「${label}」を押してください。`);pulse(element);after?.(element)}),{once:true});
  };
  const targetByText=pattern=>[...document.querySelectorAll('#rdrawer button')].find(button=>pattern.test(button.textContent||''));
  const flows={
    'theme-button':()=>inMenu('テーマ設定',()=>targetByText(/テーマ/)),
    'restore-button':()=>inMenu('復元ポイント',()=>targetByText(/復元/)),
    'menu-button':()=>{showStep('「メニュー」を押すと、設定と編集機能を開けます。');pulse(menu());},
    'pet-toggle':()=>inMenu('鯨の設定',()=>targetByText(/鯨|記憶/))
  };
  window.whaleGuide=id=>{const key=String(id||'').toLowerCase();if(flows[key])return flows[key]();previous?.(key);};
  window.verifyWhaleGuideTargets=()=>({
    help:Boolean(document.getElementById('uxHelpButton')),
    rooms:Boolean(document.querySelector('.room-tabs')),
    date:Boolean(document.querySelector('#mobileDateInp,.date-input')),
    device:Boolean(document.querySelector('.dev.check-today,.dev')),
    save:Boolean([...document.querySelectorAll('#hactions button')].find(button=>/保存/.test(button.textContent))),
    history:Boolean(document.getElementById('btab-hist')),
    menu:Boolean(menu()),
    theme:Boolean(targetByText(/テーマ/)),
    restore:Boolean(targetByText(/復元/)),
    group:Boolean(targetByText(/グループ設定/)),
    layout:Boolean(targetByText(/レイアウト編集/)),
    allOk:Boolean(document.querySelector('.mobile-allok,[onclick*="markAllOk"]')||[...document.querySelectorAll('button')].find(button=>/全教室を正常|全て正常/.test(button.textContent||'')))
  });
})();
