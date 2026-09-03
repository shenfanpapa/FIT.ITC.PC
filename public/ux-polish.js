(function(){
'use strict';
const S={ready:false,key:''};
function mode(){try{return curMode||'check'}catch(e){return'check'}}
function day(){try{return selectedDate||today()}catch(e){return''}}
function progress(){try{const g=getTodayGrp();if(!g||!g.deviceIds)return null;const total=g.deviceIds.length,done=g.deviceIds.filter(id=>getCheckStatus(day(),id)).length;return{name:g.name||'本日のグループ',total,done,pct:total?Math.round(done/total*100):0}}catch(e){return null}}
function copy(m,p){if(m==='hist')return['過去の記録','日付を選ぶと、その日の点検結果を確認できます',3];if(m==='edit')return['レイアウト編集','設備を選択して、位置や表示を調整します',2];if(m==='group')return['グループ設定','グループを選び、対象設備を登録します',2];if(p&&p.total&&p.done>=p.total)return['本日の点検','点検完了です。記録は自動保存されています',3];return['本日の点検',p?p.name+'を点検してください':'教室を選び、光っている設備を点検してください',p&&p.done?2:1]}
function build(){const top=document.querySelector('.topbar');if(!top||document.getElementById('uxGuide'))return;top.insertAdjacentHTML('afterend','<section class="ux-guide" id="uxGuide" aria-label="操作ガイド"><div class="ux-guide-main"><div class="ux-eyebrow" id="uxEyebrow">本日の点検</div><div class="ux-guide-title" id="uxGuideTitle">読み込み中…</div></div><div class="ux-steps"><div class="ux-step" data-step="1"><span class="ux-step-no">1</span><span>教室を選ぶ</span></div><span class="ux-step-arrow">›</span><div class="ux-step" data-step="2"><span class="ux-step-no">2</span><span>設備を押す</span></div><span class="ux-step-arrow">›</span><div class="ux-step" data-step="3"><span class="ux-step-no">3</span><span>結果を選ぶ</span></div></div><div class="ux-progress"><div class="ux-progress-copy"><div class="ux-progress-value" id="uxProgressValue">—</div><div class="ux-progress-label">点検済み</div></div><div class="ux-progress-track"><span class="ux-progress-fill" id="uxProgressFill"></span></div></div></section>');const b=document.createElement('button');b.id='uxHelpButton';b.className='ux-help-button';b.type='button';b.textContent='?';b.title='使い方を見る';top.appendChild(b);document.body.insertAdjacentHTML('beforeend','<div class="ux-help-backdrop" id="uxHelp" role="dialog" aria-modal="true"><div class="ux-help-card"><div class="ux-help-head"><div class="ux-help-icon">✓</div><div class="ux-help-copy"><h2>点検のしかた</h2><p>迷ったときは、この3つだけ覚えれば大丈夫です。</p></div><button class="ux-help-close" aria-label="閉じる">×</button></div><div class="ux-help-list"><div class="ux-help-item"><span class="ux-help-num">1</span><div><strong>教室を選ぶ</strong><p>画面上部の教室名を押します。選択中は明るい色になります。</p></div></div><div class="ux-help-item"><span class="ux-help-num">2</span><div><strong>光っている設備を押す</strong><p>本日の担当設備が強調表示されます。</p></div></div><div class="ux-help-item"><span class="ux-help-num">3</span><div><strong>結果を選ぶ</strong><p>正常・要注意・異常を選びます。迷ったら要注意にしてメモを残してください。</p></div></div></div><div class="ux-help-tip">💡 操作のたびに自動保存されます。未完了なら翌日も同じ点検対象から続けられます。</div><button class="ux-help-action">わかりました</button></div></div>');const bg=document.getElementById('uxHelp'),close=()=>bg.classList.remove('open');b.onclick=()=>bg.classList.add('open');bg.querySelector('.ux-help-close').onclick=close;bg.querySelector('.ux-help-action').onclick=close;bg.onclick=e=>{if(e.target===bg)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
function labels(){document.querySelectorAll('.rtab').forEach(x=>{x.setAttribute('aria-label',x.textContent.trim()+'教室を開く');x.setAttribute('aria-pressed',x.classList.contains('on'))});const a=document.getElementById('btab-check'),h=document.getElementById('btab-hist'),m=document.querySelector('.btab-menu');if(a)a.title='今日の設備を点検する';if(h)h.title='過去の点検結果を見る';if(m)m.title='設定、異常履歴、編集など'}
function update(){if(!document.body.classList.contains('ui-ready'))return;const p=progress(),c=copy(mode(),p),k=[mode(),day(),p&&p.done,p&&p.total].join('|');if(k===S.key)return;S.key=k;document.getElementById('uxEyebrow').textContent=c[0];document.getElementById('uxGuideTitle').textContent=c[1];document.querySelectorAll('.ux-step').forEach(x=>x.classList.toggle('is-current',+x.dataset.step===c[2]));document.getElementById('uxProgressValue').textContent=p?p.done+' / '+p.total:'—';document.getElementById('uxProgressFill').style.width=p?p.pct+'%':'0%';labels()}
function init(){if(S.ready)return;S.ready=true;build();labels();document.addEventListener('click',()=>setTimeout(()=>{S.key='';update()},40),true);setInterval(update,1000);update()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
/* v1.6.1: global lexical data is not exposed on window. */
(()=>{window.renderSidebarHist=function(sb){const date=selectedDate||today(),sec=mksec(sb,`${fmtDate(date)} · 全教室の異常履歴`),rows=[];Object.entries(checkData?.[date]||{}).forEach(([room,grps])=>{Object.entries(grps||{}).forEach(([grpId,devices])=>{Object.entries(devices||{}).forEach(([did,v])=>{if(v.status==='ng'||v.status==='warn')rows.push({room,grpId,did,...v})})})});Object.entries(freeEvalData?.[date]||{}).forEach(([room,devices])=>{Object.entries(devices||{}).forEach(([did,v])=>{if(v.status==='ng'||v.status==='warn')rows.push({room,grpId:'自由評価',did,...v})})});if(!rows.length){sec.innerHTML='<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px 0">この日の異常記録はありません</div>';return}rows.forEach(r=>{const dev=(rooms?.[r.room]||[]).find(d=>d.id===r.did),item=document.createElement('button');item.className='hist-row';item.style.cssText='width:100%;text-align:left;display:flex;gap:7px;align-items:center;padding:9px 10px;cursor:pointer';item.innerHTML=`<span style="color:${r.status==='ng'?'var(--err)':'var(--warn)'}">${r.status==='ng'?'✗':'△'}</span><span style="font-size:10px;color:var(--acc2)">${r.room}</span><span style="flex:1">${esc(dev?.label||r.did)}</span><span style="font-size:10px;color:var(--t3)">${esc(r.note||'')}</span>`;item.onclick=()=>jumpToDevice(r.room,r.did);sec.appendChild(item)})};})();
/* v1.6: pet controls, safe AI guidance, mobile save and selected-date global history. */
(()=>{
 const pulse=el=>{if(!el)return;el.classList.remove('whale-guide-pulse');void el.offsetWidth;el.classList.add('whale-guide-pulse');setTimeout(()=>el.classList.remove('whale-guide-pulse'),3400)};
 const findTarget=id=>({
  'help-button':document.getElementById('uxHelpButton'), 'room-tabs':document.querySelector('.room-tabs'), 'date-picker':document.querySelector('#mobileDateInp,.date-input'), 'check-device':document.querySelector('.dev.check-today,.dev'),
  'save-button':[...document.querySelectorAll('#hactions button')].find(b=>/保存/.test(b.textContent)), 'history-tab':document.getElementById('btab-hist'),
  'menu-button':document.querySelector('.btab-menu'), 'theme-button':[...document.querySelectorAll('#rdrawer button')].find(b=>/テーマ/.test(b.textContent)),
  'restore-button':[...document.querySelectorAll('#rdrawer button')].find(b=>/復元/.test(b.textContent)), 'pet-toggle':document.getElementById('whaleMenuToggle')
 })[id];
 window.whaleGuide=id=>{if(!id||id==='none')return;if(id==='theme-button'&&!document.getElementById('rdrawer')?.classList.contains('open')){const menu=findTarget('menu-button');pulse(menu);menu?.addEventListener('click',()=>setTimeout(()=>pulse(findTarget('theme-button')),280),{once:true});return}pulse(findTarget(id));};
 function petMenu(){const body=document.querySelector('#rdrawer .rdrawer-body');if(!body||document.getElementById('whaleMenuToggle'))return;const b=document.createElement('button');b.id='whaleMenuToggle';b.className='rdrawer-btn';b.onclick=()=>{const visible=window.setWhaleMobileVisible?.();b.innerHTML=`<span class="rdrawer-btn-icon">🐳</span>${visible?'鯨を隠す':'鯨を表示'}`};body.appendChild(b);const sync=e=>b.innerHTML=`<span class="rdrawer-btn-icon">🐳</span>${e.detail?'鯨を隠す':'鯨を表示'}`;addEventListener('whalevisibility',sync);sync({detail:localStorage.getItem('whale_mobile_visible')!=='false'});}
 const originalOpen=window.openRightDrawer;window.openRightDrawer=function(){originalOpen?.();petMenu()};
 const originalHactions=window.renderHactions;window.renderHactions=function(){originalHactions?.();const save=[...document.querySelectorAll('#hactions button')].find(b=>/記録を保存/.test(b.textContent));if(save){save.classList.remove('hbtn-g');save.classList.add('hbtn-a');save.textContent='保存';save.title='現在の点検内容を保存'}};
 function init(){petMenu();if(typeof window.renderAll==='function')setTimeout(()=>window.renderAll(),80)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
/* v1.5.2: turn the mobile sidebar toggle into a real drawer. */
(function(){
 function setupMobileSidebar(){
  const wrap=document.querySelector('.sidebar-wrap'),arrow=document.getElementById('toggleArrow');
  if(!wrap||document.getElementById('uxSidebarBackdrop'))return;
  const bg=document.createElement('div');bg.id='uxSidebarBackdrop';bg.className='ux-sidebar-backdrop';document.body.appendChild(bg);
  const close=()=>{wrap.classList.remove('ux-open');bg.classList.remove('open');if(arrow)arrow.textContent='▶'};
  window.toggleSidebar=function(){
   if(window.innerWidth>768){const sb=document.getElementById('sidebar');sb.classList.toggle('collapsed');if(arrow)arrow.textContent=sb.classList.contains('collapsed')?'▶':'◀';return;}
   const open=!wrap.classList.contains('ux-open');
   if(open&&typeof renderSidebar==='function')renderSidebar();
   wrap.classList.toggle('ux-open',open);bg.classList.toggle('open',open);if(arrow)arrow.textContent=open?'◀':'▶';
  };
  bg.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupMobileSidebar,{once:true});else setupMobileSidebar();
})();
/* v1.5.4: bind the visible arrow directly; inline handlers kept calling the old toggle. */
(function(){
 function bindWorkingSidebarButton(){
  const button=document.getElementById('sidebarToggle'),wrap=document.querySelector('.sidebar-wrap'),arrow=document.getElementById('toggleArrow');
  if(!button||!wrap)return;
  let bg=document.getElementById('uxSidebarBackdrop');
  if(!bg){bg=document.createElement('div');bg.id='uxSidebarBackdrop';bg.className='ux-sidebar-backdrop';document.body.appendChild(bg);}
  const close=function(){wrap.classList.remove('ux-open');bg.classList.remove('open');if(arrow)arrow.textContent='▶';};
  button.removeAttribute('onclick');
  button.onclick=function(event){
   event.preventDefault();event.stopPropagation();
   if(window.innerWidth>768){const sb=document.getElementById('sidebar');sb.classList.toggle('collapsed');if(arrow)arrow.textContent=sb.classList.contains('collapsed')?'▶':'◀';return;}
   const open=!wrap.classList.contains('ux-open');
   if(open&&typeof renderSidebar==='function')renderSidebar();
   wrap.classList.toggle('ux-open',open);bg.classList.toggle('open',open);if(arrow)arrow.textContent=open?'◀':'▶';
  };
  bg.onclick=close;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(bindWorkingSidebarButton,0)},{once:true});else setTimeout(bindWorkingSidebarButton,0);
})();
/* Final global-history override, after all UI adapters. */
(()=>{window.renderSidebarHist=function(sb){const date=selectedDate||today(),sec=mksec(sb,`${fmtDate(date)} · 全教室の異常履歴`),rows=[];for(const [room,grps] of Object.entries(checkData?.[date]||{}))for(const [grpId,devices] of Object.entries(grps||{}))for(const [did,v] of Object.entries(devices||{}))if(v.status==='ng'||v.status==='warn')rows.push({room,grpId,did,...v});for(const [room,devices] of Object.entries(freeEvalData?.[date]||{}))for(const [did,v] of Object.entries(devices||{}))if(v.status==='ng'||v.status==='warn')rows.push({room,grpId:'自由評価',did,...v});if(!rows.length){sec.innerHTML='<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px 0">この日の異常記録はありません</div>';return}for(const r of rows){const dev=(rooms[r.room]||[]).find(d=>d.id===r.did),item=document.createElement('button');item.className='hist-row';item.style.cssText='width:100%;text-align:left;display:flex;gap:7px;align-items:center;padding:9px 10px;cursor:pointer';item.innerHTML=`<span style="color:${r.status==='ng'?'var(--err)':'var(--warn)'}">${r.status==='ng'?'✗':'△'}</span><span style="font-size:10px;color:var(--acc2)">${r.room}</span><span style="flex:1">${esc(dev?.label||r.did)}</span><span style="font-size:10px;color:var(--t3)">${esc(r.note||'')}</span>`;item.onclick=()=>jumpToDevice(r.room,r.did);sec.appendChild(item)}};})();
