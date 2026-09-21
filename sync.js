window.MomentSync=(()=>{
  const config=window.MOMENT_SYNC_CONFIG||{};
  const configured=!!(config.url&&config.key);
  const tokenKey='little-moment-room-v1';
  let token='';
  const hash=new URLSearchParams(location.hash.slice(1));
  try {token=hash.get('room')||localStorage.getItem(tokenKey)||'';}catch{token=hash.get('room')||'';}
  if(!/^[a-f0-9]{64}$/.test(token))token='';
  if(token){try{localStorage.setItem(tokenKey,token);}catch{}if(hash.has('room'))history.replaceState(null,'',location.pathname+location.search);}
  let status=configured?(token?'正在同步…':'请用你们的专属链接打开地图'):'双人同步正在准备，暂时还不能保存记录';
  async function request(changes=[]) {
    if(!configured)throw Error('还需要连接云端数据库，才能保存和同步记录。');
    if(!token)throw Error('请使用带有共享入口的专属链接打开。');
    const headers={'Content-Type':'application/json',apikey:config.key};
    if(config.key.startsWith('eyJ'))headers.Authorization='Bearer '+config.key;
    let result;
    try {result=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/rpc/moment_sync',{method:'POST',headers,body:JSON.stringify({p_token:token,p_changes:changes}),signal:AbortSignal.timeout(15000)});}catch{status='连接中断，尚未保存，请保留输入后重试';throw Error(status);}
    const payload=await result.json().catch(()=>({}));
    if(!result.ok){status=payload.message?.includes('conflict')?'对方刚刚更新了这条记录，请刷新后再编辑':payload.message?.includes('access')?'共享入口不正确，请重新打开专属链接':'同步暂时不可用，输入仍然保留，请重试';throw Error(status);}
    if(!Array.isArray(payload))throw Error('同步返回格式异常，请稍后重试');
    status='已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    return payload;
  }
  function inviteLink(){return token?`${location.origin}${location.pathname}?v=5#room=${token}`:'';}
  return {configured,get connected(){return configured&&!!token;},get status(){return status;},read:()=>request(),write:request,inviteLink};
})();
