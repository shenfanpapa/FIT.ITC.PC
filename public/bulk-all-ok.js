(()=>{
  let pending=[],lastBatch=[];
  const date=()=>selectedDate||today();
  const groupForRoom=(room,day)=>{
    const roomGroups=groups?.[room]||[];
    if(!roomGroups.length||new Date(day+'T00:00:00').getDay()===0)return null;
    const assigned=inspectionState?.[room]?.assignments?.[day];
    if(assigned){const match=roomGroups.find(group=>group.id===assigned);if(match)return match;}
    const recorded=Object.keys(checkData?.[day]?.[room]||{});
    const recordedGroup=roomGroups.find(group=>recorded.includes(group.id));
    if(recordedGroup)return recordedGroup;
    const index=getCalendarGrpIdx(day,room);
    return index>=0?roomGroups[index]:null;
  };
  const collect=()=>{
    const day=date(),items=[];
    Object.keys(rooms||{}).forEach(room=>{
      const group=groupForRoom(room,day);if(!group)return;
      group.deviceIds.forEach(deviceId=>{if(!checkData?.[day]?.[room]?.[group.id]?.[deviceId])items.push({room,groupId:group.id,deviceId});});
    });
    return items;
  };
  const ensureModal=()=>{
    let modal=document.getElementById('bulkAllOkModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='bulkAllOkModal';modal.className='bulk-ok-modal';
    modal.innerHTML='<section class="bulk-ok-card" role="dialog" aria-modal="true" aria-labelledby="bulkAllOkTitle"><div class="bulk-ok-kicker">一括記録</div><h2 id="bulkAllOkTitle">全教室を正常にしますか？</h2><p class="bulk-ok-copy"></p><p class="bulk-ok-note">すでに記録済みの正常・注意・異常は変更しません。</p><div class="bulk-ok-actions"><button type="button" class="bulk-ok-cancel">キャンセル</button><button type="button" class="bulk-ok-confirm">記録する</button></div></section>';
    document.body.append(modal);modal.querySelector('.bulk-ok-cancel').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};modal.querySelector('.bulk-ok-confirm').onclick=apply;return modal;
  };
  const showConfirm=()=>{
    pending=collect();
    if(!pending.length){window.toast?.('未記録の設備はありません');return;}
    const roomCount=new Set(pending.map(item=>item.room)).size,modal=ensureModal();
    modal.querySelector('.bulk-ok-copy').textContent=`${roomCount}教室・${pending.length}台の未記録設備を「正常」として記録します。`;
    modal.classList.add('open');
  };
  const showUndo=()=>{
    document.getElementById('bulkOkUndo')?.remove();
    const bar=document.createElement('div');bar.id='bulkOkUndo';bar.className='bulk-ok-undo';bar.innerHTML=`<span>${lastBatch.length}台を正常に記録しました</span><button type="button">元に戻す</button>`;
    bar.querySelector('button').onclick=undo;document.body.append(bar);setTimeout(()=>bar.remove(),12000);
  };
  const apply=()=>{
    const modal=ensureModal();modal.classList.remove('open');if(!pending.length)return;
    const day=date(),token=`bulk_${Date.now()}_${Math.random().toString(36).slice(2)}`;lastBatch=[];
    pending.forEach(item=>{
      checkData[day]||={};checkData[day][item.room]||={};checkData[day][item.room][item.groupId]||={};
      if(checkData[day][item.room][item.groupId][item.deviceId])return;
      checkData[day][item.room][item.groupId][item.deviceId]={status:'ok',note:'',resolved:false,bulkToken:token};
      lastBatch.push({...item,day,token});
    });
    saveAll();renderAll();showUndo();
  };
  const undo=()=>{
    let count=0;
    lastBatch.forEach(item=>{const entry=checkData?.[item.day]?.[item.room]?.[item.groupId]?.[item.deviceId];if(entry?.bulkToken===item.token){delete checkData[item.day][item.room][item.groupId][item.deviceId];count++;}});
    saveAll();renderAll();document.getElementById('bulkOkUndo')?.remove();toast(`${count}台の記録を元に戻しました`);lastBatch=[];
  };
  window.markAllOk=showConfirm;
  const rename=()=>document.querySelectorAll('button').forEach(button=>{if(button.textContent.trim()==='✓ 全て正常')button.textContent='✓ 全教室を正常にする'});
  new MutationObserver(rename).observe(document.body,{childList:true,subtree:true});rename();
})();
