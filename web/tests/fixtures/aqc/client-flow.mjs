/* global fetch, console, process */
// The AQC client flow exactly as docs/esti/AQC-CLIENT-SPEC.md describes it: config, login, session, projects, lease, settings, rows.
// Run: AQC_API=http://localhost:3000 node tests/fixtures/aqc/client-flow.mjs (needs a bound online project in the demo studio).
const API=(process.env.AQC_API ?? "http://localhost:3000")+"/api/aqc/v1";
const post=async(p,b,h={})=>{const r=await fetch(API+p,{method:"POST",headers:{"content-type":"application/json",...h},body:JSON.stringify(b??{})});return{status:r.status,j:await r.json()}};
const out=(k,v)=>console.log(k.padEnd(28),JSON.stringify(v).slice(0,230));
const cfg=await (await fetch(API+"/config")).json(); out("config contract",cfg.contract);
const login=await post("/auth/login",{email:"aditi.rao@aorms.in",password:"DemoAORMS2026!"}); out("login",{status:login.status,hasTokens:!!login.j.accessToken});
const H={authorization:"Bearer "+login.j.accessToken};
const sess=await post("/session",{clientLabel:"AQC client-flow test"},H); out("session",{status:sess.status,conn:sess.j.entitlement?.connected,studio:sess.j.studio?.name});
const H2={...H,"x-aqc-session":sess.j.sessionId};
const get=async(p)=>{const r=await fetch(API+p,{headers:H2});return{status:r.status,j:await r.json()}};
const list=await get("/projects"); const lake=list.j.projects.find(p=>p.aqc && p.title.includes("Lakeview")); out("projects",{n:list.j.projects.length,lake:lake?.aqc});
const id=lake.aqc.id;
out("lease",(await post(`/projects/${id}/lease`,{},H2)).j);
const put=await fetch(API+`/projects/${id}/settings`,{method:"PUT",headers:{"content-type":"application/json",...H2},body:JSON.stringify({settings:{levels:[{id:"Lvl0",name:"Plinth"}],estimate_markups:{electrical_pct:8,plumbing_pct:6,escalation_pct:5,consulting_fee_pct:3}}})});
out("PUT settings",{status:put.status,j:await put.json()});
const rows=await get(`/projects/${id}/rows?since=0`); out("rows since 0",{status:rows.status,n:rows.j.rows?.length,settingsKeys:Object.keys(rows.j.settings??{})});
const bad=await fetch(API+`/projects/${id}/settings`,{method:"PUT",headers:{"content-type":"application/json",...H2},body:JSON.stringify({nope:1})}); out("PUT bad body",bad.status);
// viewer cannot write settings
const vl=await post("/auth/login",{email:"demo@aorms.in",password:"DemoAORMS2026!"}); const vs=await post("/session",{},{authorization:"Bearer "+vl.j.accessToken});
const vp=await fetch(API+`/projects/${id}/settings`,{method:"PUT",headers:{"content-type":"application/json",authorization:"Bearer "+vl.j.accessToken,"x-aqc-session":vs.j.sessionId},body:JSON.stringify({settings:{a:1}})}); out("viewer PUT settings",vp.status);
