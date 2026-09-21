const app=document.querySelector('#app');
const progress=document.querySelector('#progress');
const state={step:0,date:'',time:'',food:'',other:'',note:'',district:'',venue:'',id:Moment.id()};
const foods=[['🍕','披萨'],['🍣','寿司'],['🍲','火锅'],['🥩','烧肉'],['🥟','早茶'],['🍜','拉面'],['🥘','麻辣烫'],['🦞','小龙虾'],['🍢','烧烤'],['🍰','甜品'],['🥗','其他']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localDate(new Date());
const on=(id,fn)=>{const el=document.getElementById(id);if(el)el.onclick=fn;};
function go(step){state.step=step;render();window.scrollTo({top:0,behavior:'instant'});const h=app.querySelector('h1');h?.setAttribute('tabindex','-1');h?.focus({preventScroll:true});}
function back(){return `<button class="back" id="back">← 返回</button>`;}
function hero(){return '<div class="hero-wrap"><img class="hero" src="envelope.png" alt="一封有粉色爱心封蜡和小虎邮票的像素信封" width="250" height="240"></div>';}
function render(){
 progress.hidden=false;
 progress.innerHTML=Array.from({length:7},(_,i)=>`<span class="${i<=state.step?'done':''}"></span>`).join('');
 progress.setAttribute('aria-label',`第 ${state.step+1} 步，共 7 步`);
 let html='';
 if(state.step===0)html=`<section class="page intro"><p class="eyebrow">A LITTLE SOMETHING</p><h1>想约你吃顿好吃的，<br>也想<span class="pink">见见你。</span></h1><p class="note">给你准备了一份小小的邀请。</p>${hero()}<button class="primary" id="open">轻触打开 &nbsp; →</button></section>`;
 if(state.step===1)html=`<section class="page intro"><p class="eyebrow">JUST YOU & ME</p>${hero()}<h1>要不要一起<br><span class="pink">吃顿好吃的？</span></h1><p class="note">换个有点特别的方式，<br>约你出来见个面。</p><div class="actions"><button class="primary" id="yes">好呀 ♥</button><button class="primary secondary" id="think">我看看时间</button></div><p class="smallnote" id="thinking"></p>${back()}</section>`;
 if(state.step===2)html=`<section class="page"><p class="eyebrow">A LITTLE HAPPY MOMENT</p><div class="celebrate" aria-hidden="true">🥰</div><h1>好耶，<br>那就<span class="pink">说好啦。</span></h1><p class="note">本来想直接发消息问你的，<br>后来觉得，这样好像更有意思一点。<br><br>一起挑个时间吧。</p><button class="primary purple" id="plan">好啦，来定个时间 →</button>${back()}</section>`;
 if(state.step===3)html=`<section class="page"><p class="stepmark">01 / 约一个好日子</p><h1>所以……<br>你什么时候<span class="pink">有空？</span></h1><p class="note">挑一个你方便的时间。</p><form id="when" class="fields"><label for="date">哪一天见面</label><input id="date" name="date" type="date" required min="${today()}" value="${esc(state.date)}"><label for="time">几点钟见</label><input id="time" name="time" type="time" required value="${esc(state.time)}"><div class="pill-row"><button class="pill" type="button" id="tomorrow">明天傍晚</button><button class="pill" type="button" id="weekend">周末下午</button></div><p class="error" id="date-error" role="alert"></p><div style="text-align:center"><button class="primary" type="submit">就这个时间 ♥</button></div></form>${back()}</section>`;
 if(state.step===4)html=`<section class="page"><p class="stepmark">02 / 一起吃点什么</p><h1>我们吃点<span class="pink">什么？</span></h1><p class="note">挑一个想吃的，我们一起去。</p><div class="grid" role="radiogroup" aria-label="选择餐食">${foods.map(([emoji,name])=>`<button class="choice" role="radio" aria-checked="${state.food===name}" data-food="${name}"><span class="emoji" aria-hidden="true">${emoji}</span>${name}</button>`).join('')}</div><div class="fields" style="margin-top:12px"><div id="other-wrap" ${state.food==='其他'?'':'hidden'}><label for="other">想吃什么</label><input id="other" maxlength="40" value="${esc(state.other)}" placeholder="把你想吃的告诉我"></div><label for="note">顺便对我说句话？（可选）</label><textarea id="note" maxlength="160" placeholder="比如：吃完可以一起散个步。">${esc(state.note)}</textarea></div><p class="error" id="food-error" role="alert"></p><button class="primary" id="confirm">就这样，说好啦 ♥</button><br>${back()}</section>`;
 if(state.step===5)html=`<section class="page"><p class="stepmark">03 / 在杭州见个面</p><h1>这次去<span class="pink">哪里？</span></h1><p class="note">先挑个区，再慢慢选一家想吃的店。</p><div class="district-grid" role="radiogroup" aria-label="选择杭州区域">${Moment.districts.map((d,i)=>`<button class="district-choice" role="radio" aria-checked="${state.district===d}" data-district="${d}"><span>${String(i+1).padStart(2,'0')}</span>${d}</button>`).join('')}</div><div class="fields"><label for="venue">店名 / 具体地点（可选）</label><input id="venue" maxlength="80" value="${esc(state.venue)}" placeholder="还没想好，就留给我们一起选"></div><p class="error" id="place-error" role="alert"></p><button class="primary" id="finish">收好这次约定 →</button><br>${back()}</section>`;
 if(state.step===6)html=`<section class="page"><p class="eyebrow">IT'S A DATE</p><h1>约好啦，<br>到时候<span class="pink">见。</span></h1><p class="note">一起吃点好吃的，聊点有意思的。</p><article class="ticket"><div class="ticket-title">OUR LITTLE PLAN</div><span class="ticket-pair" aria-label="小兔子和小老虎"><img src="rabbit.png" alt="小兔子" width="34" height="38"><img src="tiger.png" alt="小老虎" width="34" height="38"></span><dl><dt>日期</dt><dd>${esc(prettyDate())}</dd><dt>时间</dt><dd>${esc(state.time)}</dd><dt>想吃</dt><dd>${esc(chosenFood())}</dd><dt>地点</dt><dd>${esc(state.district)} · ${esc(state.venue||'店铺一起定')}</dd>${state.note?`<dt>你的话</dt><dd>${esc(state.note)}</dd>`:''}</dl></article><button class="primary" id="make-poster">生成约会分享图 ↓</button><div class="final-actions"><button class="pill" id="copy">复制约定</button><button class="pill" id="save-plan">加入约好的清单</button></div><p id="reply" class="reply" tabindex="0"></p><p class="smallnote">把图片发给我，见面的事就这样说好。<br>吃过以后，再去美食地图记一笔。</p><button class="back" id="open-map">打开我们的美食地图 →</button><br><button class="back" id="edit">再改一下约定</button><button class="back" id="new-plan">再约下一顿</button></section>`;
 app.innerHTML=html;
 on('open',()=>{startMusic();go(1);});on('yes',()=>go(2));on('plan',()=>go(3));on('back',()=>{capture();go(Math.max(0,state.step-1));});on('edit',()=>go(3));
 on('think',()=>{document.querySelector('#thinking').textContent='不着急，看看哪天方便，我们再一起定。';document.querySelector('#think').textContent='慢慢选，不着急';});
 on('tomorrow',()=>{const d=new Date();d.setDate(d.getDate()+1);document.querySelector('#date').value=localDate(d);document.querySelector('#time').value='18:00';});
 on('weekend',()=>{const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7||7));document.querySelector('#date').value=localDate(d);document.querySelector('#time').value='15:00';});
 const when=document.querySelector('#when');if(when)when.onsubmit=e=>{e.preventDefault();capture();const error=validateDate();if(error){document.querySelector('#date-error').textContent=error;return;}go(4);};
 document.querySelectorAll('[data-food]').forEach(b=>{b.onclick=()=>{capture();state.food=b.dataset.food;document.querySelectorAll('[data-food]').forEach(c=>c.setAttribute('aria-checked',String(c===b)));document.querySelector('#other-wrap').hidden=state.food!=='其他';};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const all=[...document.querySelectorAll('[data-food]')];const i=all.indexOf(b);const delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;const target=all[(i+delta+all.length)%all.length];target.focus();target.click();};});
 on('confirm',()=>{capture();if(!state.food||(state.food==='其他'&&!state.other.trim())){document.querySelector('#food-error').textContent='先挑一个想吃的，再把约定收好呀。';return;}if(validateDate()){go(3);document.querySelector('#date-error').textContent=validateDate();return;}go(5);});
 document.querySelectorAll('[data-district]').forEach(b=>{b.onclick=()=>{state.district=b.dataset.district;document.querySelectorAll('[data-district]').forEach(c=>c.setAttribute('aria-checked',String(c===b)));};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const all=[...document.querySelectorAll('[data-district]')],i=all.indexOf(b),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;const target=all[(i+delta+all.length)%all.length];target.focus();target.click();};});
 on('finish',()=>{capture();if(!state.district){document.querySelector('#place-error').textContent='先挑一个想去的区吧。';return;}if(validateDate()){go(3);document.querySelector('#date-error').textContent=validateDate();return;}go(6);});
 const plan=()=>({id:state.id,date:state.date,time:state.time,district:state.district,venue:state.venue,food:chosenFood(),note:state.note,status:'planned'});
 on('make-poster',()=>Moment.poster(plan()));on('save-plan',async()=>{const button=document.querySelector('#save-plan');button.disabled=true;try{if(await Moment.savePlan(plan()))button.textContent='已加入约好的清单';}finally{button.disabled=false;}});
 on('open-map',()=>Moment.showDiary(render));
 on('new-plan',()=>{Object.assign(state,{id:Moment.id(),date:'',time:'',food:'',other:'',note:'',district:'',venue:''});go(3);});
 on('copy',async()=>{const text=replyText();try{await navigator.clipboard.writeText(text);toast('复制好了，去聊天里发给我吧 ♥');document.querySelector('#copy').textContent='已复制，等你发给我 ♥';}catch{const el=document.querySelector('#reply');el.textContent=text;el.classList.add('visible');toast('长按下方文字复制，再发给我');}});
}
function capture(){for(const key of ['date','time','other','note','venue']){const el=document.getElementById(key);if(el)state[key]=el.value.trim();}}
function validateDate(){if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date)||!/^\d{2}:\d{2}$/.test(state.time))return '选好日期和时间，我们再继续。';const d=new Date(`${state.date}T${state.time}`);if(!Number.isFinite(d.getTime())||d<=new Date())return '这个时间已经过去啦，选一个之后的时间吧。';return '';}
function prettyDate(){const d=new Date(`${state.date}T12:00:00`);return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 · 周${'日一二三四五六'[d.getDay()]}`;}
function chosenFood(){return state.food==='其他'?state.other:state.food;}
function replyText(){return `好呀，一起去吃饭！\n我们约好：${prettyDate()} ${state.time}\n一起吃：${chosenFood()}\n地点：杭州 · ${state.district}${state.venue?' · '+state.venue:'（店铺一起定）'}${state.note?`\n想对你说：${state.note}`:''}\n那就到时候见！`;}
let toastTimer;function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
const music=new Audio('bgm.m4a');music.loop=true;music.preload='none';music.volume=.45;
let musicMutedByUser=false;
let tapAudioContext;
function chime(){
 try{
  tapAudioContext??=new(window.AudioContext||window.webkitAudioContext)();
  tapAudioContext.resume().catch(()=>{});
  [523.25,659.25,783.99].forEach((frequency,i)=>{
   const tone=tapAudioContext.createOscillator(),gain=tapAudioContext.createGain(),t=tapAudioContext.currentTime+i*.045;
   tone.type='sine';tone.frequency.value=frequency;
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.018,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+.2);
   tone.connect(gain);gain.connect(tapAudioContext.destination);tone.start(t);tone.stop(t+.23);
  });
 }catch{/* Keep every button functional when Web Audio is unavailable. */}
}
document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(button&&!button.disabled)chime();},true);
function musicUI(){const b=document.querySelector('#sound');b.setAttribute('aria-pressed',String(!music.paused));b.setAttribute('aria-label',music.paused?'播放《关于爱的定义》':'暂停《关于爱的定义》');b.title='方大同 · 关于爱的定义';}
async function startMusic(){if(musicMutedByUser)return;try{await music.play();}catch{toast('点右上角音符，就可以播放音乐');}musicUI();}
music.addEventListener('play',musicUI);music.addEventListener('pause',musicUI);
music.addEventListener('error',()=>{musicUI();toast('音乐暂时没加载好，稍后点音符重试');});
document.querySelector('#sound').onclick=()=>{if(music.paused){musicMutedByUser=false;startMusic();}else{musicMutedByUser=true;music.pause();}};
musicUI();
render();
document.querySelector('#journal-nav').onclick=()=>{capture();Moment.showDiary(render);};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_date_invitation',description:'Read current invitation choices. Does not send or save a reply.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({...state,foodOptions:foods.map(x=>x[1]),reply:state.step===6?replyText():null})})).catch(()=>{});}catch{}}
