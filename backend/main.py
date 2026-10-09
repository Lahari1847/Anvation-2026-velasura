from datetime import datetime, timezone
from pathlib import Path
import hashlib, hmac, json, math, os, secrets, sqlite3
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT=Path(__file__).resolve().parents[1]
DB=Path(os.getenv('ECOROUTE_DB',ROOT/'data/ecoroute.db'))
ROLES={'admin','office','field','driver','citizen'}
def conn():
    DB.parent.mkdir(parents=True,exist_ok=True); c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; c.execute('PRAGMA foreign_keys=ON'); return c
def pw_hash(p,s=None):
    s=s or secrets.token_hex(16); return s+'$'+hashlib.pbkdf2_hmac('sha256',p.encode(),bytes.fromhex(s),240000).hex()
def verify(p,v):
    s,h=v.split('$',1); return hmac.compare_digest(pw_hash(p,s).split('$',1)[1],h)
def initialize():
    c=conn(); c.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,password TEXT NOT NULL,active INTEGER DEFAULT 1,zone_id INTEGER);
    CREATE TABLE IF NOT EXISTS zones(id INTEGER PRIMARY KEY,name TEXT,lat REAL,lon REAL,demand REAL,collected REAL,recovery REAL);
    CREATE TABLE IF NOT EXISTS vehicles(id INTEGER PRIMARY KEY,name TEXT,capacity REAL,status TEXT);
    CREATE TABLE IF NOT EXISTS complaints(id INTEGER PRIMARY KEY,public_id TEXT UNIQUE,owner INTEGER REFERENCES users(id),category TEXT,description TEXT,location TEXT,lat REAL,lon REAL,status TEXT,priority TEXT,assigned_to INTEGER REFERENCES users(id),duplicate_of INTEGER REFERENCES complaints(id),created TEXT);
    CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,complaint_id INTEGER,actor INTEGER,action TEXT,note TEXT,created TEXT);
    CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,user_id INTEGER,message TEXT,read INTEGER DEFAULT 0,created TEXT);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor INTEGER,action TEXT,detail TEXT,created TEXT);''')
    if not c.execute('select count(*) from zones').fetchone()[0]:
        for z in [('Central',12.9716,77.5946,420,370,0.36),('North',13.0358,77.5970,510,410,0.31),('East',12.9850,77.6500,460,395,0.42),('South',12.9000,77.5800,380,350,0.39),('West',12.9800,77.5300,330,290,0.34)]: c.execute('insert into zones(name,lat,lon,demand,collected,recovery) values(?,?,?,?,?,?)',z)
        for x in [('Truck 01',1000,'available'),('Truck 02',800,'available'),('Truck 03',700,'maintenance')]: c.execute('insert into vehicles(name,capacity,status) values(?,?,?)',x)
    demos=[('admin','Asha Admin','admin'),('office','Ravi Office','office'),('field','Meera Field','field'),('driver','Arun Driver','driver'),('citizen','Civic Citizen','citizen')]
    for u,n,r in demos:
        if not c.execute('select id from users where username=?',(u,)).fetchone(): c.execute('insert into users(username,name,role,password,zone_id) values(?,?,?,?,1)',(u,n,r,pw_hash('EcoRoute123!')))
    c.commit(); c.close()
initialize()
app=FastAPI(title='EcoRoute AI',version='1.0.0',description='Local municipal resource planning demo. Synthetic operational data are explicitly labeled.')
app.add_middleware(CORSMiddleware,allow_origin_regex=r".*",allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
class Login(BaseModel): username:str; password:str
class ComplaintIn(BaseModel): category:str; description:str=Field(min_length=5,max_length=2000); location:str; lat:float=12.9716; lon:float=77.5946
class Action(BaseModel): note:str=''; priority:str='Normal'; worker_id:Optional[int]=None; original_id:Optional[int]=None; reason:str=''
class Scenario(BaseModel): demand_change:float=0; trucks:int=2; capacity:float=850; hours:float=8; workers:int=8; fuel_price:float=100
def current(authorization:Optional[str]=Header(None)):
    if not authorization or not authorization.startswith('Bearer '): raise HTTPException(401,'Login required')
    try: uid=int(authorization[7:])
    except: raise HTTPException(401,'Invalid session')
    c=conn(); u=c.execute('select * from users where id=? and active=1',(uid,)).fetchone(); c.close()
    if not u: raise HTTPException(401,'Session expired')
    return dict(u)
def require(*roles):
    def dep(u=Depends(current)):
        if u['role'] not in roles: raise HTTPException(403,'Role not authorized')
        return u
    return dep
def rows(sql,args=()):
    c=conn(); out=[dict(x) for x in c.execute(sql,args).fetchall()]; c.close(); return out
@app.get('/api/health')
def health(): return {'status':'ok','database':str(DB),'data_label':'synthetic demo data'}
@app.post('/api/login')
def login(x:Login):
    c=conn(); u=c.execute('select * from users where username=? and active=1',(x.username,)).fetchone(); c.close()
    if not u or not verify(x.password,u['password']): raise HTTPException(401,'Incorrect username or password')
    return {'token':str(u['id']),'user':{'id':u['id'],'name':u['name'],'username':u['username'],'role':u['role']}}
@app.get('/api/me')
def me(u=Depends(current)): return {k:u[k] for k in ('id','username','name','role')}
@app.get('/api/dashboard')
def dashboard(u=Depends(current)):
    c=conn(); n=c.execute('select count(*) from complaints').fetchone()[0]; pending=c.execute("select count(*) from complaints where status in ('Pending Verification','Verified','Assigned','Accepted','On the Way','Arrived','In Progress')").fetchone()[0]
    zones=[dict(x) for x in c.execute('select * from zones').fetchall()]; trucks=[dict(x) for x in c.execute('select * from vehicles').fetchall()]; users=c.execute('select count(*) from users where active=1 and role in (\'field\',\'driver\')').fetchone()[0]
    c.close(); total=sum(z['demand'] for z in zones); collected=sum(z['collected'] for z in zones)
    return {'total_demand':round(total,1),'collected':round(collected,1),'pending':pending,'complaints':n,'workers':users,'trucks_available':sum(x['status']=='available' for x in trucks),'recovery_rate':round(sum(z['collected']*z['recovery'] for z in zones)/max(collected,1)*100,1),'zones':zones,'vehicles':trucks,'synthetic':True}
@app.get('/api/complaints')
def complaints(u=Depends(current)):
    if u['role']=='citizen': return rows('select c.*,h.action as last_action from complaints c left join history h on h.id=(select max(id) from history where complaint_id=c.id) where owner=? order by id desc',(u['id'],))
    if u['role']=='field': return rows('select * from complaints where assigned_to=? order by id desc',(u['id'],))
    return rows('select * from complaints order by id desc')
@app.post('/api/complaints')
def submit(x:ComplaintIn,u=Depends(require('citizen'))):
    c=conn(); pid='ER-'+datetime.now(timezone.utc).strftime('%y%m%d')+'-'+secrets.token_hex(3).upper(); now=datetime.now(timezone.utc).isoformat()
    cur=c.execute('insert into complaints(public_id,owner,category,description,location,lat,lon,status,priority,created) values(?,?,?,?,?,?,?,\'Pending Verification\',\'Normal\',?)',(pid,u['id'],x.category,x.description,x.location,x.lat,x.lon,now)); cid=cur.lastrowid
    c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],'Submitted','Complaint filed by citizen',now))
    for r in c.execute("select id from users where role in ('office','admin') and active=1").fetchall(): c.execute('insert into notifications(user_id,message,created) values(?,?,?)',(r['id'],f'New complaint {pid} requires verification',now))
    c.commit(); c.close(); return {'id':cid,'public_id':pid,'status':'Pending Verification'}
@app.post('/api/complaints/{cid}/verify')
def verify_complaint(cid:int,x:Action,u=Depends(require('office','admin'))):
    c=conn(); q=c.execute('select * from complaints where id=?',(cid,)).fetchone()
    if not q: c.close(); raise HTTPException(404,'Complaint not found')
    if q['status']!='Pending Verification': c.close(); raise HTTPException(409,'Only pending complaints can be verified')
    now=datetime.now(timezone.utc).isoformat(); c.execute('update complaints set status=?,priority=? where id=?',('Verified',x.priority,cid)); c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],'Verified',x.note,now)); c.commit(); c.close(); return {'status':'Verified'}
@app.post('/api/complaints/{cid}/reject')
def reject_complaint(cid:int,x:Action,u=Depends(require('office','admin'))):
    if not x.reason.strip(): raise HTTPException(422,'Rejection reason is required')
    c=conn(); q=c.execute('select * from complaints where id=?',(cid,)).fetchone()
    if not q: c.close(); raise HTTPException(404,'Complaint not found')
    if q['status']!='Pending Verification': c.close(); raise HTTPException(409,'Only pending complaints can be rejected')
    now=datetime.now(timezone.utc).isoformat(); c.execute("update complaints set status='Rejected' where id=?",(cid,)); c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],'Rejected',x.reason,now))
    if q['owner']: c.execute('insert into notifications(user_id,message,created) values(?,?,?)',(q['owner'],f"Complaint {q['public_id']} rejected: {x.reason}",now))
    c.commit(); c.close(); return {'status':'Rejected'}
@app.post('/api/complaints/{cid}/duplicate')
def link_duplicate(cid:int,x:Action,u=Depends(require('office','admin'))):
    if not x.reason.strip(): raise HTTPException(422,'Duplicate rationale is required')
    c=conn(); q=c.execute('select * from complaints where id=?',(cid,)).fetchone(); original=c.execute('select * from complaints where id=?',(x.original_id,)).fetchone() if x.original_id else None
    if not q or not original: c.close(); raise HTTPException(404,'Complaint or original complaint not found')
    if cid==original['id'] or original['status']=='Rejected': c.close(); raise HTTPException(422,'Choose a different valid original complaint')
    now=datetime.now(timezone.utc).isoformat(); c.execute("update complaints set status='Duplicate',duplicate_of=? where id=?",(original['id'],cid)); c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],'Linked as duplicate',f"Linked to {original['public_id']}: {x.reason}",now)); c.commit(); c.close(); return {'status':'Duplicate','duplicate_of':original['public_id']}
@app.get('/api/complaints/{cid}/recommendations')
def recommendations(cid:int,u=Depends(require('office','admin'))):
    if not rows('select id from complaints where id=?',(cid,)): raise HTTPException(404,'Complaint not found')
    ws=rows("select id,name from users where role='field' and active=1")
    loads={r['assigned_to']:r['n'] for r in rows("select assigned_to,count(*) n from complaints where status in ('Assigned','Accepted','On the Way','Arrived','In Progress') group by assigned_to")}
    ranked=sorted(ws,key=lambda w:(loads.get(w['id'],0),w['id']))
    return {'recommendations':[{'worker_id':w['id'],'name':w['name'],'open_tasks':loads.get(w['id'],0),'available':loads.get(w['id'],0)<4,'reason':f"Active field worker; {loads.get(w['id'],0)} open task(s). GPS and skill data are unavailable."} for w in ranked],'distance':'Unavailable: no worker coordinates'}
@app.post('/api/complaints/{cid}/assign')
def assign(cid:int,x:Action,u=Depends(require('office','admin'))):
    c=conn(); q=c.execute('select * from complaints where id=?',(cid,)).fetchone(); w=c.execute("select * from users where id=? and role='field' and active=1",(x.worker_id,)).fetchone()
    if not q or not w: c.close(); raise HTTPException(404,'Complaint or eligible field worker not found')
    if q['status']!='Verified': c.close(); raise HTTPException(409,'Verify complaint before assignment')
    now=datetime.now(timezone.utc).isoformat(); c.execute("update complaints set status='Assigned',assigned_to=? where id=?",(w['id'],cid)); c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],'Assigned',f"Assigned to {w['name']}. {x.note}",now)); c.execute('insert into notifications(user_id,message,created) values(?,?,?)',(w['id'],f"Complaint {q['public_id']} assigned to you",now)); c.commit(); c.close(); return {'status':'Assigned','worker':w['name']}
@app.post('/api/complaints/{cid}/transition')
def transition(cid:int,x:Action,u=Depends(current)):
    transitions={'field':{'Assigned':'Accepted','Accepted':'On the Way','On the Way':'Arrived','Arrived':'In Progress','In Progress':'Resolved'},'office':{'Resolved':'Closed','Closed':'Reopened'},'admin':{'Resolved':'Closed','Closed':'Reopened'}}
    c=conn(); q=c.execute('select * from complaints where id=?',(cid,)).fetchone()
    if not q: c.close(); raise HTTPException(404,'Complaint not found')
    if u['role']=='field' and q['assigned_to']!=u['id']: c.close(); raise HTTPException(403,'Not your assigned task')
    allowed=transitions.get(u['role'],{}); new=allowed.get(q['status'])
    if not new: c.close(); raise HTTPException(409,'Transition not allowed for this role/status')
    if new=='Reopened' and not x.reason.strip(): c.close(); raise HTTPException(422,'Reopen reason is required')
    now=datetime.now(timezone.utc).isoformat(); c.execute('update complaints set status=? where id=?',(new,cid)); c.execute('insert into history(complaint_id,actor,action,note,created) values(?,?,?,?,?)',(cid,u['id'],new,x.reason or x.note,now));
    if q['owner']: c.execute('insert into notifications(user_id,message,created) values(?,?,?)',(q['owner'],f'Complaint {q["public_id"]}: {new}',now))
    c.commit(); c.close(); return {'status':new}
@app.get('/api/workers')
def workers(u=Depends(require('admin','office'))): return rows("select id,name,role,active,zone_id from users where role in ('field','driver','office') order by name")
@app.get('/api/notifications')
def notifications(u=Depends(current)): return rows('select * from notifications where user_id=? order by id desc limit 50',(u['id'],))
def simulate(s:Scenario, optimized:bool):
    zs=rows('select * from zones'); demand=sum(z['demand'] for z in zs)*(1+s.demand_change/100); cap=max(0,s.trucks)*s.capacity; hours_capacity=max(0,s.trucks)*max(0,s.hours)*180
    if optimized: collected=min(demand,cap,hours_capacity,max(0,s.workers)*110)
    else: collected=min(demand,s.trucks*min(s.capacity*0.72, s.hours*95))
    ratio=collected/max(demand,1); distance=(sum(math.hypot(z['lat']-12.97,z['lon']-77.59)*111 for z in zs)+15)* (1.18 if optimized else 1.55) * min(1,max(.45,ratio))
    fuel=distance*0.32; co2=fuel*2.68; time=distance/22+len(zs)*.35
    return {'demand_t':round(demand,1),'collected_t':round(collected,1),'uncollected_t':round(max(0,demand-collected),1),'trucks_used':min(s.trucks,math.ceil(collected/max(s.capacity,1))),'distance_km':round(distance,1),'fuel_l':round(fuel,1),'co2_kg':round(co2,1),'collection_hours':round(time,1),'capacity_utilization_pct':round(min(100,collected/max(s.trucks*s.capacity,1)*100),1),'overflow_zones':sum(z['demand']>z['collected']*1.2 for z in zs),'recovered_t':round(collected*.36,1),'method':'Deterministic synthetic estimate; direct-distance proxy and 0.32 L/km fuel assumption'}
@app.post('/api/simulate')
def simulation(s:Scenario,u=Depends(require('admin','office'))):
    return {'baseline':simulate(s,False),'optimized':simulate(s,True),'same_inputs':True,'constraints':{'truck_capacity_t':s.trucks*s.capacity,'shift_hours':s.hours,'worker_limit':s.workers},'synthetic':True}
@app.get('/api/forecast')
def forecast(u=Depends(require('admin','office'))):
    zs=rows('select * from zones'); return {'model':'Seasonal-naive demo baseline + deterministic uplift estimate','synthetic':True,'zones':[{'zone':z['name'],'baseline_t':round(z['demand'],1),'forecast_t':round(z['demand']*1.08,1),'high_demand':z['demand']>400} for z in zs]}
@app.get('/api/history/{cid}')
def history(cid:int,u=Depends(current)):
    if u['role']=='citizen':
        owner=rows('select owner from complaints where id=?',(cid,))
        if not owner or owner[0]['owner']!=u['id']: raise HTTPException(404,'Complaint not found')
    return rows('select h.*,u.name actor_name from history h left join users u on u.id=h.actor where complaint_id=? order by h.id',(cid,))
@app.get('/api/export/complaints')
def export(u=Depends(require('admin','office'))):
    return {'columns':['public_id','category','status','priority','created'],'rows':rows('select public_id,category,status,priority,created from complaints')}
