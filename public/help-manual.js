(()=>{
  const topics=[
    ['rooms','教室・日付を選ぶ','画面上部の教室タブで対象教室を選びます。日付を変更すると、その日の担当グループと記録を確認できます。','教室を選ぶ → 日付を選ぶ → 画面の強調表示を確認します。','room-tabs'],
    ['inspection','点検を記録する','強調表示された設備を押し、正常・注意・異常を選択します。注意や異常には状況をメモできます。','設備を押す → 結果を選ぶ → 必要ならメモを残します。','check-device'],
    ['bulk','全教室を一括記録する','「全教室を正常にする」は、当日の各教室で未記録の設備だけを正常として記録します。既存の注意・異常は変更しません。','確認画面で対象台数を確認 → 記録する → 必要なら元に戻すを押します。','all-ok'],
    ['history','履歴を確認する','履歴では当日・日付指定・すべての全教室異常履歴を切り替えて確認できます。','履歴を開く → 表示範囲を選ぶ → 行を押して該当設備へ移動します。','history-tab'],
    ['save','保存と共有','点検内容は操作時に保存されます。上部の保存ボタンでは現在の状態を明示的に保存できます。','保存を押す → 同期表示を確認します。','save-button'],
    ['theme','テーマ設定','メニューから配色テーマを選べます。画面の見やすさに合わせて変更してください。','メニューを開く → テーマを選ぶ → 配色を選択します。','theme-button'],
    ['layout','レイアウト編集','メニューの編集機能では設備の位置や表示を調整できます。通常の点検中は変更しないでください。','メニューを開く → レイアウト編集 → 保存します。','menu-button'],
    ['groups','グループ設定','グループには点検対象の設備を登録します。日ごとの担当はこのグループをもとに表示されます。','メニューを開く → グループ設定 → 対象設備を編集します。','menu-button'],
    ['restore','復元ポイント','変更前に復元ポイントを保存しておけば、必要なときに設定を戻せます。','メニューを開く → 復元ポイントを保存／復元します。','restore-button'],
    ['whale','鯨に質問する','鯨には操作方法、業務手順、保存済みの点検結果を日本語で質問できます。','鯨を押す → 質問を入力 → 送信します。','help-button']
  ];
  const byId=Object.fromEntries(topics.map(topic=>[topic[0],topic]));
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const renderList=card=>{const visible=matchMedia('(max-width:768px)').matches?topics.filter(topic=>!['layout','groups'].includes(topic[0])):topics;card.innerHTML=`<div class="manual-head"><div><div class="manual-kicker">操作ガイド</div><h2>FIT.ITC.PC 使用手冊</h2><p>知りたい機能を選んでください。</p></div><button class="ux-help-close" aria-label="閉じる">×</button></div><div class="manual-topic-list">${visible.map(topic=>`<button type="button" data-topic="${topic[0]}"><strong>${esc(topic[1])}</strong><span>詳細を見る</span></button>`).join('')}</div>`;};
  const renderDetail=(card,topic)=>{card.innerHTML=`<div class="manual-head"><div><div class="manual-kicker">${esc(topic[1])}</div><h2>${esc(topic[1])}</h2><p>${esc(topic[2])}</p></div><button class="ux-help-close" aria-label="閉じる">×</button></div><div class="manual-detail"><h3>操作手順</h3><p>${esc(topic[3])}</p><h3>注意</h3><p>記録済みの内容を変更するときは、画面表示とメモを確認してから操作してください。</p></div><div class="manual-actions"><button type="button" class="manual-back">一覧に戻る</button><button type="button" class="manual-guide">ここを案内する</button></div>`;card.querySelector('.manual-back').onclick=()=>renderList(card);card.querySelector('.manual-guide').onclick=()=>{document.getElementById('uxHelp')?.classList.remove('open');window.whaleGuide?.(topic[4]);};};
  const enhance=()=>{const dialog=document.getElementById('uxHelp');if(!dialog||dialog.dataset.manualReady)return;dialog.dataset.manualReady='1';const card=dialog.querySelector('.ux-help-card');renderList(card);const close=()=>dialog.classList.remove('open');card.querySelector('.ux-help-close').onclick=close;card.addEventListener('click',event=>{const button=event.target.closest('[data-topic]');if(button)renderDetail(card,byId[button.dataset.topic]);if(event.target.closest('.ux-help-close'))close()});};
  const oldGuide=window.whaleGuide;
  const targets={
    'all-ok':()=>document.querySelector('.mobile-allok,[onclick*="markAllOk"]')||[...document.querySelectorAll('button')].find(button=>/全教室を正常|全て正常/.test(button.textContent||'')),
    'help-button':()=>document.getElementById('uxHelpButton'),
    'room-tabs':()=>document.querySelector('.room-tabs'),
    'date-picker':()=>document.querySelector('#mobileDateInp,.date-input'),
    'check-device':()=>document.querySelector('.dev.check-today,.dev'),
    'save-button':()=>[...document.querySelectorAll('#hactions button')].find(button=>/保存/.test(button.textContent)),
    'history-tab':()=>document.getElementById('btab-hist'),
    'menu-button':()=>document.querySelector('.btab-menu'),
    'theme-button':()=>[...document.querySelectorAll('#rdrawer button')].find(button=>/テーマ/.test(button.textContent)),
    'restore-button':()=>[...document.querySelectorAll('#rdrawer button')].find(button=>/復元/.test(button.textContent))
  };
  window.whaleGuide=id=>{enhance();oldGuide?.(String(id||'').toLowerCase());};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
