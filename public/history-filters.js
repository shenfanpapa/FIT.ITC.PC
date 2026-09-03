(()=>{
  let scope='today',chosenDate='';
  const escText=value=>typeof esc==='function'?esc(value):String(value||'');
  const addRows=(out,date)=>{
    for(const [room,grps] of Object.entries(checkData?.[date]||{})) for(const [grpId,devices] of Object.entries(grps||{})) for(const [did,entry] of Object.entries(devices||{})) if(entry.status==='ng'||entry.status==='warn') out.push({date,room,grpId,did,...entry});
    for(const [room,devices] of Object.entries(freeEvalData?.[date]||{})) for(const [did,entry] of Object.entries(devices||{})) if(entry.status==='ng'||entry.status==='warn') out.push({date,room,grpId:'自由評価',did,...entry});
  };
  window.renderSidebarHist=sb=>{
    const sec=mksec(sb,'異常履歴'),todayDate=today(),date=chosenDate||selectedDate||todayDate;
    const controls=document.createElement('div');controls.className='history-filter';
    [['today','今日'],['date','日付指定'],['all','すべて']].forEach(([id,label])=>{const button=document.createElement('button');button.textContent=label;button.className=scope===id?'on':'';button.onclick=()=>{scope=id;if(id==='today')chosenDate=todayDate;renderSidebar();};controls.appendChild(button)});
    if(scope==='date'){const picker=document.createElement('input');picker.type='date';picker.value=date;picker.onchange=()=>{chosenDate=picker.value;renderSidebar();};controls.appendChild(picker)}
    sec.appendChild(controls);
    const dates=scope==='all'?[...new Set([...Object.keys(checkData||{}),...Object.keys(freeEvalData||{})])].sort().reverse():[scope==='today'?todayDate:date];
    const rows=[];dates.forEach(d=>addRows(rows,d));
    if(!rows.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='異常記録はありません';sec.appendChild(empty);return;}
    rows.forEach(row=>{const device=(rooms[row.room]||[]).find(d=>d.id===row.did),item=document.createElement('button');item.className='hist-row history-global-row';item.innerHTML=`<span class="history-date">${fmtDate(row.date)}</span><span class="history-room">${escText(row.room)}</span><span class="history-status ${row.status}">${row.status==='ng'?'✗':'△'}</span><span class="history-device">${escText(device?.label||row.did)}</span>${row.note?`<span class="history-note">${escText(row.note)}</span>`:''}`;item.onclick=()=>jumpToDevice(row.room,row.did);sec.appendChild(item)});
  };
})();
