window.MomentSync=(()=>{
  const config=window.MOMENT_SYNC_CONFIG||{};
  const configured=!!(config.url&&config.key);
  const tokenKey='little-moment-room-v1';
  const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  const hash=new URLSearchParams(location.hash.slice(1));
  const query=new URLSearchParams(location.search);
  const supplied=hash.has('room')?hash.get('room'):query.get('room');
  let token='', invalidLink=supplied!==null&&!validToken(supplied);
  if(supplied!==null){token=validToken(supplied)?supplied:'';}
  else {try {const saved=localStorage.getItem(tokenKey);if(validToken(saved))token=saved;}catch{}}
  // Keep the capability in the fragment so copied links work on another phone,
  // including browsers that block local storage. Fragments are not sent to hosts.
  if(token){
    try{localStorage.setItem(tokenKey,token);}catch{}
    hash.set('room',token);query.delete('room');
    const search=query.toString();
    try{history.replaceState(null,'',location.pathname+(search?'?'+search:'')+'#'+hash.toString());}catch{}
  }
  const entryError=invalidLink?'专属链接不完整或有误，请重新复制完整链接打开。':'请使用带有共享入口的专属链接打开。';
  let status=configured?(token?'正在同步…':entryError):'双人同步正在准备，暂时还不能保存记录';
  async function request(changes=[]) {
    if(!configured)throw Error('还需要连接云端数据库，才能保存和同步记录。');
    if(!token)throw Error(entryError);
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
  function inviteLink(){return token?`${location.origin}${location.pathname}?v=7#room=${token}`:'';}
  return {configured,get connected(){return configured&&!!token;},get status(){return status;},read:()=>request(),write:request,inviteLink};
})();
