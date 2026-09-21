/* Shared meal history is stored in the private Supabase map, not in site source. */
window.Moment = (() => {
  const districts = ['上城区','拱墅区','西湖区','滨江区','萧山区','余杭区','临平区','钱塘区','富阳区','临安区'];
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateNow = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const id = () => crypto.randomUUID();
  let records = [], storageError = '', activeDistrict = '', activeTab = 'visited', onExit = null, posterURL = null, refreshing=false, syncEpoch=0, writesInFlight=0;
  const isDate = d => typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10)===d;
  function valid(r) {
    return r && typeof r==='object' && ['id','date','time','district','venue','food','note','status','updatedAt'].every(k=>typeof r[k]==='string')
      && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(r.id) && isDate(r.date) && (r.time==='' || /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))
      && districts.includes(r.district) && r.venue.length<=80 && r.food.trim().length>0 && r.food.length<=60 && r.note.length<=160
      && ['planned','visited'].includes(r.status) && (r.status!=='visited' || (r.date<=dateNow() && r.venue.trim().length>0)) && Number.isFinite(Date.parse(r.updatedAt));
  }
  const clean = r => ({...Object.fromEntries(['id','date','time','district','venue','food','note','status','updatedAt'].map(k=>[k,r[k]])),_version:Number.isSafeInteger(r._version)?r._version:0});
  function adopt(next){if(!Array.isArray(next)||!next.every(valid))throw Error('云端记录格式不正确，请稍后重试');records=next.map(clean);storageError='';}
  async function refresh(){if(refreshing||writesInFlight||!MomentSync.connected)return;refreshing=true;const epoch=syncEpoch;try{const next=await MomentSync.read();if(epoch===syncEpoch&&!writesInFlight)adopt(next);}catch(error){if(epoch===syncEpoch)storageError=error.message;}finally{refreshing=false;if(document.querySelector('.diary-page')&&!document.querySelector('#moment-dialog')&&!document.querySelector('.backup[open]'))showDiary(onExit);}}
  async function write(changes){syncEpoch++;writesInFlight++;try{adopt(await MomentSync.write(changes));}finally{writesInFlight--;}}
  function notify(message) { window.toast ? window.toast(message) : null; }
  async function commit(next) {
    if(next.length>1000)throw Error('最多保存 1000 条记录，请先导出备份。');
    const changes=next.filter(r=>JSON.stringify(r)!==JSON.stringify(records.find(x=>x.id===r.id))).map(r=>({op:'put',record:r,expected:records.find(x=>x.id===r.id)?._version||0}));
    await write(changes);
  }
  async function put(record) {
    const r=clean({...record,id:record.id||id(),updatedAt:new Date().toISOString()});
    if(!valid(r))throw Error('请检查日期、地点和餐食，已去过的记录不能是未来日期。');
    await write([{op:'put',record:r,expected:record._version??records.find(x=>x.id===r.id)?._version??0}]);return r;
  }
  function stats(list=records) {
    const visited=list.filter(r=>r.status==='visited');
    const counts=new Map(); visited.forEach(r=>counts.set(r.food,(counts.get(r.food)||0)+1));
    return {visits:visited.length,districts:new Set(visited.map(r=>r.district)).size,
      venues:new Set(visited.map(r=>r.district+'|'+r.venue.trim().toLocaleLowerCase())).size,
      ranking:[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),visited};
  }
  function districtOptions(selected='') { return '<option value="">选一个区</option>'+districts.map(d=>`<option ${selected===d?'selected':''}>${d}</option>`).join(''); }
  function modal(html,label) {
    document.querySelector('#moment-dialog')?.remove();
    const el=document.createElement('dialog'); el.id='moment-dialog';el.className='moment-dialog';el.setAttribute('aria-label',label);
    el.innerHTML=`<button type="button" class="dialog-close" aria-label="关闭">×</button>${html}`;
    document.body.append(el);el.querySelector('.dialog-close').onclick=()=>el.close();
    el.addEventListener('close',()=>el.remove(),{once:true});el.showModal();return el;
  }
  function openEditor(record={}, visited=true) {
    const editing=!!record.id;
    const status=visited?'visited':'planned';
    const d=modal(`<p class="eyebrow">${visited?'ONE MORE MEMORY':'OUR LITTLE PLAN'}</p><h2>${visited?'记下这顿好吃的':'修改这次约定'}</h2>
      <p class="smallnote">${visited?'去过之后再记一笔，地图会慢慢亮起来。':'约定先收好，吃过以后再点亮地图。'}</p>
      <form class="fields diary-form"><label for="log-date">${visited?'用餐日期':'见面日期'}</label><input id="log-date" type="date" required ${visited?`max="${dateNow()}"`:''} value="${escape(record.date || dateNow())}">
      <label for="log-district">杭州 · 哪个区</label><select id="log-district" required>${districtOptions(record.district)}</select>
      <label for="log-venue">店名 / 具体地点${visited?'':'（可选）'}</label><input id="log-venue" maxlength="80" ${visited?'required':''} value="${escape(record.venue)}" placeholder="比如：湖边的那家面馆">
      <label for="log-food">吃了什么</label><input id="log-food" required maxlength="60" value="${escape(record.food)}" placeholder="比如：片儿川、火锅、甜品">
      <label for="log-note">留一句小记（可选）</label><textarea id="log-note" maxlength="160" placeholder="这次的口味怎么样？">${escape(record.note)}</textarea>
      <p class="error" role="alert" id="log-error"></p><button class="primary" type="submit">${visited?'保存这次打卡':'保存约定'} →</button></form>`, '用餐记录');
    d.querySelector('form').onsubmit=async e=>{
      e.preventDefault(); const get=k=>d.querySelector('#log-'+k).value.trim();
      const submit=d.querySelector('[type=submit]');submit.disabled=true;
      try {await put({id:record.id||id(),_version:record._version,date:get('date'),time:record.time||'',district:get('district'),venue:get('venue'),food:get('food'),note:get('note'),status});
        d.close();activeTab=status;activeDistrict='';showDiary(onExit);notify(editing?'记录已更新':'这顿好吃的，记住啦');
      }catch(error){d.querySelector('#log-error').textContent=error.message||'保存失败，请稍后再试。';}finally{submit.disabled=false;}
    };
  }
  function deleteRecord(record) {
    const d=modal(`<h2>删除这条记录？</h2><p class="note">${escape(record.date)} · ${escape(record.venue||record.district)}</p><p class="smallnote">这条记录会从你们两人的地图和统计中移除。</p><div class="actions"><button class="pill" id="keep-record">保留</button><button class="pill" id="delete-record">确认删除</button></div>`,'确认删除记录');
    d.querySelector('#keep-record').onclick=()=>d.close();
    d.querySelector('#delete-record').onclick=async()=>{const b=d.querySelector('#delete-record');b.disabled=true;try{await write([{op:'delete',id:record.id,expected:record._version}]);d.close();showDiary(onExit);notify('记录已删除');}catch(error){notify(error.message||'删除失败，记录仍保留');}finally{b.disabled=false;}};
  }
  function mapHTML() {
    const visited=stats().visited;
    return `<div class="food-map"><div class="map-heading"><span>HANGZHOU</span><span>每一顿，都算数</span></div>
      <svg viewBox="0 0 600 405" role="img" aria-label="杭州十区美食足迹，粉色表示有用餐记录的区域"><title>杭州美食足迹</title>${(window.HANGZHOU_DISTRICTS||[]).map(d=>{
        const count=visited.filter(r=>r.district===d.name).length;
        return `<path d="${d.path}" class="map-district ${count?'lit':''} ${activeDistrict===d.name?'selected':''}"><title>${d.name} · ${count} 次打卡</title></path>`;
      }).join('')}<text x="45" y="385" class="map-caption">把杭州，一口一口收集起来。</text><image href="tiger.png" x="498" y="312" width="55" height="55"/></svg>
      <div class="map-legend"><span><i></i>还没去过</span><span><i class="lit"></i>已经点亮</span></div>
      <p class="map-credit">区域足迹示意，不标注店铺坐标 · <a href="https://geo.datav.aliyun.com/areas_v3/bound/330100_full.json" target="_blank" rel="noopener">区域轮廓来源</a></p></div>`;
  }
  function showDiary(exit) {
    onExit=exit||onExit;
    document.querySelector('#progress').hidden=true;
    const summary=stats();
    const list=records.filter(r=>r.status===activeTab&&(!activeDistrict||r.district===activeDistrict)).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
    document.querySelector('#app').innerHTML=`<section class="page diary-page"><div class="diary-top"><button class="back" id="diary-back">← 回到邀请</button><span class="eyebrow">OUR FOOD JOURNAL</span></div>
      <h1>我们的<span class="pink">美食地图</span></h1><p class="note">见面吃饭，把日常变成小收藏。</p>
      <p class="sync-status" role="status">${escape(storageError||MomentSync.status)}</p><div class="sync-controls"><button class="pill" id="refresh-map">刷新记录</button><button class="pill" id="copy-map-link">复制两人的共享入口</button></div>
      ${!MomentSync.configured?'<p class="setup-note">双人同步还差云端连接。地图和分享图可以先看，接好后就能共同记录。</p>':''}
      <div class="stats"><div><strong>${summary.visits}</strong><span>次一起吃饭</span></div><div><strong>${summary.districts}<small> / 10</small></strong><span>个区被点亮</span></div><div><strong>${summary.venues}</strong><span>家店被收藏</span></div></div>
      ${mapHTML()}
      <div class="district-filters" aria-label="按区域筛选"><button class="pill ${!activeDistrict?'selected':''}" data-filter="" aria-pressed="${!activeDistrict}">全部区域</button>${districts.map(d=>`<button class="pill ${activeDistrict===d?'selected':''}" data-filter="${d}" aria-pressed="${activeDistrict===d}">${d}${summary.visited.some(r=>r.district===d)?' ·':''}</button>`).join('')}</div>
      <div class="diary-actions"><button class="primary" id="add-meal">＋ 记一顿好吃的</button><button class="pill" id="map-poster">生成美食回忆卡</button></div>
      ${summary.ranking.length?`<section class="taste"><div class="section-caption">常吃的口味 <span>按已打卡次数</span></div>${summary.ranking.slice(0,3).map(([name,count],i)=>`<div class="taste-row"><span>${String(i+1).padStart(2,'0')}</span><b>${escape(name)}</b><em>${count} 次</em></div>`).join('')}</section>`:''}
      <div class="journal-tabs" aria-label="记录状态"><button id="visited-tab" aria-pressed="${activeTab==='visited'}">吃过的 ${summary.visits}</button><button id="planned-tab" aria-pressed="${activeTab==='planned'}">约好的 ${records.filter(r=>r.status==='planned').length}</button></div>
      ${activeDistrict?`<p class="smallnote">正在看：${activeDistrict} · ${list.length} 条记录</p>`:''}
      <div class="meal-list">${list.length?list.map(r=>`<article class="meal-card"><p class="meal-date">${escape(r.date.replaceAll('-','.'))} <span>${escape(r.district)}</span></p><h2>${escape(r.venue||'店铺待定')}</h2><p class="meal-food">${escape(r.food)}</p>${r.note?`<p class="meal-note">${escape(r.note)}</p>`:''}<div class="meal-controls">${r.status==='planned'?`<button class="pill" data-finish="${r.id}">吃过啦，去打卡</button>`:''}<button class="back" data-edit="${r.id}">编辑</button><button class="back" data-card="${r.id}">出图</button><button class="back" data-delete="${r.id}">删除</button></div></article>`).join(''):`<div class="empty-journal"><img src="tiger.png" alt="安静等待打卡的小老虎" width="76" height="76"><h2>${activeTab==='visited'?'下一顿，就是故事的开始。':'还没有收好的约定。'}</h2><p class="smallnote">${activeTab==='visited'?'吃过以后记一笔，地点和口味都会留在这里。':'在邀请最后一页，可以把计划加入这里。'}</p></div>`}</div>
      <details class="backup"><summary>保存与备份</summary><p class="smallnote">两个人使用同一份专属链接，记录保存在云端，打开页面时自动同步。共享入口能查看和修改记录，请只发给对方。备份导入会合并已有记录，不会清空地图。</p><div class="actions"><button class="pill" id="export-records">导出备份</button><button class="pill" id="import-records">导入备份</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div></details>
      <p class="smallnote storage-note">两人份的小日常 · 慢慢收集</p></section>`;
    const bind=(id,fn)=>document.getElementById(id).onclick=fn;
    bind('diary-back',()=>{document.querySelector('#progress').hidden=false;onExit?.();});
    bind('add-meal',()=>openEditor());bind('map-poster',()=>poster(null));
    bind('refresh-map',()=>refresh());bind('copy-map-link',async()=>{const link=MomentSync.inviteLink();if(!link){notify('请先连接云端并打开专属共享入口');return;}try{await navigator.clipboard.writeText(link);notify('共享入口已复制，只发给对方就好');}catch{const d=modal('<h2>两人的共享入口</h2><p class="smallnote">长按下方链接复制，只发给对方。</p><textarea id="share-link" readonly aria-label="共享链接"></textarea>','复制共享入口');d.querySelector('textarea').value=link;}});
    bind('visited-tab',()=>{activeTab='visited';showDiary(onExit);});bind('planned-tab',()=>{activeTab='planned';showDiary(onExit);});
    document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{activeDistrict=b.dataset.filter;showDiary(onExit);});
    for(const action of ['edit','delete','card','finish'])document.querySelectorAll(`[data-${action}]`).forEach(b=>b.onclick=()=>{
      const r=records.find(r=>r.id===b.dataset[action]);if(!r)return;
      if(action==='delete')deleteRecord(r);else if(action==='card')poster(r);else if(action==='finish')openEditor({...r,date:dateNow()},true);else openEditor(r,r.status==='visited');
    });
    bind('export-records',()=>{try{const content=JSON.stringify({version:1,exportedAt:new Date().toISOString(),records},null,2);download(new Blob([content],{type:'application/json'}),`美食地图备份-${dateNow()}.json`);}catch{notify('备份读取失败，请重试');}});
    bind('import-records',()=>document.querySelector('#backup-file').click());
    document.querySelector('#backup-file').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      try {if(file.size>2*1024*1024)throw Error('备份文件超过 2 MB，请检查文件。');
        const payload=JSON.parse(await file.text());
        if(payload.version!==1||!Array.isArray(payload.records)||payload.records.length>1000||!payload.records.every(valid))throw Error('备份格式不正确，没有更改现有记录。');
        const merged=new Map(records.map(r=>[r.id,r]));
        for(const r of payload.records){const old=merged.get(r.id);if(!old||Date.parse(r.updatedAt)>Date.parse(old.updatedAt))merged.set(r.id,clean(r));}
        await commit([...merged.values()]);showDiary(onExit);notify('备份已合并，相同记录不会重复添加');
      }catch(error){notify(error.message||'导入失败，没有更改现有记录');}finally{e.target.value='';}
    };
  }
  async function savePlan(plan) {
    const existing=records.find(r=>r.id===plan.id);
    if(existing?.status==='visited'){notify('这次约定已经打卡，可到美食地图编辑记录');return;}
    try {await put({...plan,status:'planned'});notify('约定已收好，吃过以后来打卡');return true;}catch(error){notify(error.message||'保存失败，请稍后再试');return false;}
  }
  function download(blob,name) {const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  async function loadImage(src) { const img=new Image();img.src=src;await img.decode();return img; }
  function wrap(ctx,text,width) {
    const lines=[];let line='';for(const char of String(text)){if(char==='\n'){lines.push(line);line='';continue;}if(ctx.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}lines.push(line);return lines;
  }
  async function drawPoster(record) {
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1080;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('此浏览器无法生成图片，请换浏览器打开。');
    const summary=stats();
    const note=record?.note||'把好吃的记住，把见面的日子也记住。';
    ctx.font='28px "Microsoft YaHei", "PingFang SC", sans-serif';
    const noteLines=wrap(ctx,note,840);
    const rows=record?[['日期',`${record.date.replaceAll('-','.')} ${record.time||''}`.trim()],['地点',`${record.district}${record.venue?' · '+record.venue:' · 店铺一起定'}`],['餐食',record.food]]:[];
    ctx.font='34px "Microsoft YaHei", "PingFang SC", sans-serif';
    const rowLayouts=rows.map(([label,value])=>({label,lines:wrap(ctx,value,700)}));
    const rowsHeight=rowLayouts.reduce((h,r)=>h+r.lines.length*48+32,0);
    canvas.height=Math.max(1500,1000+(record?rowsHeight:300)+noteLines.length*43+190);
    const W=canvas.width,H=canvas.height;
    const rounded=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
    const text=(t,x,y,size=30,color='#534653',font='sans-serif')=>{ctx.fillStyle=color;ctx.font=`${size}px ${font==='serif'?'Georgia, serif':'"Microsoft YaHei", "PingFang SC", sans-serif'}`;ctx.fillText(t,x,y);};
    rounded(0,0,W,H,0,'#fff8ef');
    const glow=ctx.createRadialGradient(950,100,20,950,100,720);glow.addColorStop(0,'#ebdff4');glow.addColorStop(1,'#fff8ef00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,800);
    rounded(46,46,W-92,H-92,36,'#fffdf9');
    text('a little moment',90,121,34,'#ad7794','serif');text(record?(record.status==='visited'?'FOOD MEMORY':'DATE PLAYLIST'):'OUR FOOD JOURNAL',90,185,20,'#a58a9f');
    text('杭州 · 两人份的小日常',90,251,34,'#665469');
    // A record sleeve, tonal grooves and a small personal mascot.
    rounded(220,320,640,530,35,'#f3e8ef');
    const disc=ctx.createRadialGradient(540,580,0,540,580,205);disc.addColorStop(0,'#d4bedf');disc.addColorStop(.38,'#ad8fb7');disc.addColorStop(1,'#736079');
    ctx.fillStyle=disc;ctx.beginPath();ctx.arc(540,580,205,0,Math.PI*2);ctx.fill();
    for(let r=112;r<202;r+=13){ctx.strokeStyle='#e9d5ec38';ctx.lineWidth=2;ctx.beginPath();ctx.arc(540,580,r,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#f8e4df';ctx.beginPath();ctx.arc(540,580,93,0,Math.PI*2);ctx.fill();
    text('小小约定',478,574,26,'#b46b8c');text('SIDE A',501,612,19,'#b58e9e');
    ctx.fillStyle='#fff8ef';ctx.beginPath();ctx.arc(540,535,9,0,Math.PI*2);ctx.fill();
    text('GOOD FOOD, GOOD COMPANY.',282,812,20,'#a4819a');
    const title=record?(record.status==='visited'?'这顿饭，值得记住。':'下一站，一起吃饭。'):'把杭州，一口一口收藏。';
    text(title,90,945,48,'#594653');
    let y=1025;
    if(record){for(const row of rowLayouts){text(row.label,90,y,25,'#ab8b9d');for(const line of row.lines){text(line,225,y,34);y+=48;}y+=32;}}
    else {
      [['一起吃饭',summary.visits+' 次'],['点亮区域',summary.districts+' / 10'],['收藏店铺',summary.venues+' 家']].forEach(([label,value],i)=>{const x=90+i*305;text(value,x,y,53,'#cd6c96');text(label,x,y+52,25,'#9b8092');});
      y+=125;const favorite=summary.ranking[0];text(favorite?'常吃的口味':'下一顿，等我们一起发现',90,y,27,'#a58a9f');y+=48;
      if(favorite){ctx.font='32px "Microsoft YaHei", "PingFang SC", sans-serif';for(const line of wrap(ctx,favorite[0],840)){text(line,90,y,32);y+=43;}}
    }
    ctx.strokeStyle='#e6cdda';ctx.setLineDash([6,10]);ctx.beginPath();ctx.moveTo(90,y);ctx.lineTo(990,y);ctx.stroke();ctx.setLineDash([]);y+=65;
    noteLines.forEach(line=>{text(line,90,y,28,'#997e8e');y+=43;});
    text('a little moment, just for you.',90,H-103,26,'#b08b9f','serif');
    try {const tiger=await loadImage('tiger.png');ctx.drawImage(tiger,886,H-187,104,104);}catch {/* The card still works if the mascot asset is unavailable. */}
    return canvas;
  }
  async function poster(record) {
    const d=modal('<p class="eyebrow">KEEP THIS MOMENT</p><h2>把这一刻存下来</h2><p class="smallnote" id="poster-status" role="status">正在生成分享图片…</p><div id="poster-result"></div>','分享图片');
    try {
      const canvas=await drawPoster(record);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),'image/png'));
      if(!d.isConnected)return;
      if(posterURL)URL.revokeObjectURL(posterURL);posterURL=URL.createObjectURL(blob);
      d.querySelector('#poster-status').textContent='长按图片保存，或点击下方下载。';
      d.querySelector('#poster-result').innerHTML=`<img class="poster-preview" src="${posterURL}" alt="奶油粉紫色唱片风格的${record?'约会':'美食回忆'}分享卡"><a class="primary download-image" href="${posterURL}" download="小小约定-${record?.date||dateNow()}.png">保存 PNG 图片 ↓</a>`;
    }catch(error){if(d.isConnected)d.querySelector('#poster-status').textContent=error.message||'生成失败，请重试。';}
  }
  setInterval(()=>{if(document.visibilityState==='visible'&&!document.querySelector('#moment-dialog'))refresh();},20000);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  refresh();
  return {districts,districtOptions,showDiary,savePlan,poster,stats,id};
})();
