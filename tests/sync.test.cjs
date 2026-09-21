const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../sync.js'),'utf8');
const token='a'.repeat(64);
const base='https://example.test/little-moment/?v=7';
function client(url,{saved='',blocked=false}={}) {
  const location=new URL(url), requests=[];
  const storage=new Map([['little-moment-room-v1',saved]]);
  const context={window:{MOMENT_SYNC_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'}},location,URLSearchParams,AbortSignal,
    localStorage:{getItem(key){if(blocked)throw Error('blocked');return storage.get(key)||null;},setItem(key,value){if(blocked)throw Error('blocked');storage.set(key,value);}},
    history:{replaceState(_state,_title,next){location.href=new URL(next,location).href;}},
    fetch:async (_url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>[]};}};
  vm.runInNewContext(source,context);
  return {sync:context.window.MomentSync,location,requests,storage};
}
test('opening, copying and forwarding the visible URL keeps the shared room',async()=>{
  const a=client(base+'#room='+token);
  await a.sync.read();
  const b=client(a.location.href);
  await b.sync.write([{op:'put',record:{id:'test'}}]);
  assert.equal(a.requests[0].p_token,token);
  assert.equal(b.requests[0].p_token,token);
  assert.equal(b.requests[0].p_changes.length,1);
  assert.equal(a.sync.inviteLink(),base+'#room='+token);
});
test('blocked storage still supports reload and forwarding',async()=>{
  const a=client(base+'#room='+token,{blocked:true});
  const reload=client(a.location.href,{blocked:true});
  await reload.sync.read();
  assert.equal(reload.requests[0].p_token,token);
});
test('an existing room is restored to the URL for future sharing',()=>{
  const a=client(base,{saved:token});
  assert.equal(a.location.hash,'#room='+token);
  assert.equal(a.sync.connected,true);
});
test('a malformed explicit link does not silently use another saved room',async()=>{
  const a=client(base+'#room='+token+'bb',{saved:token});
  assert.equal(a.sync.connected,false);
  await assert.rejects(a.sync.read(),/不完整或有误/);
  assert.equal(a.requests.length,0);
});
test('a plain URL cannot access private records',async()=>{
  const a=client(base);
  await assert.rejects(a.sync.write([]),/共享入口/);
  assert.equal(a.requests.length,0);
  assert.equal(a.sync.inviteLink(),'');
});
test('query room links are migrated to fragments, keeping other URL fields',()=>{
  const a=client(base+'&room='+token+'#view=map');
  assert.equal(a.location.search,'?v=7');
  assert.equal(new URLSearchParams(a.location.hash.slice(1)).get('room'),token);
  assert.equal(new URLSearchParams(a.location.hash.slice(1)).get('view'),'map');
});
test('invalid cached tokens are ignored',()=>{
  assert.equal(client(base,{saved:'bad'}).sync.connected,false);
});
