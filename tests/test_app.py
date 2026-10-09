import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from backend.main import app

client=TestClient(app)
def auth(user):
    r=client.post('/api/login',json={'username':user,'password':'EcoRoute123!'}); assert r.status_code==200
    return {'Authorization':'Bearer '+r.json()['token']}
def test_health_and_login():
    assert client.get('/api/health').json()['status']=='ok'
    assert client.post('/api/login',json={'username':'admin','password':'bad'}).status_code==401
def test_role_guards_and_complaint_lifecycle():
    citizen=auth('citizen'); office=auth('office'); field=auth('field')
    denied=client.get('/api/workers',headers=citizen); assert denied.status_code==403
    created=client.post('/api/complaints',headers=citizen,json={'category':'Overflowing waste','description':'Waste bin is overflowing','location':'Demo road'}); assert created.status_code==200
    cid=created.json()['id']; assert client.post(f'/api/complaints/{cid}/verify',headers=office,json={'priority':'High'}).status_code==200
    workers=client.get('/api/workers',headers=office).json(); wid=next(w['id'] for w in workers if w['role']=='field')
    assert client.post(f'/api/complaints/{cid}/assign',headers=office,json={'worker_id':wid}).status_code==200
    for status in ['Accepted','On the Way','Arrived','In Progress','Resolved']:
        r=client.post(f'/api/complaints/{cid}/transition',headers=field,json={}); assert r.status_code==200 and r.json()['status']==status
    assert client.post(f'/api/complaints/{cid}/transition',headers=office,json={}).json()['status']=='Closed'
def test_citizens_only_see_own_reports():
    citizen=auth('citizen'); own_id=client.get('/api/me',headers=citizen).json()['id']; allrows=client.get('/api/complaints',headers=citizen).json()
    assert all(r['owner']==own_id for r in allrows)
def test_simulation_same_inputs_and_constraints():
    r=client.post('/api/simulate',headers=auth('admin'),json={'demand_change':30,'trucks':1,'capacity':100,'hours':4,'workers':1}).json()
    assert r['same_inputs'] is True and r['synthetic'] is True
    assert r['baseline']['collected_t']<=100 and r['optimized']['collected_t']<=100
def test_forecast_is_labeled_synthetic():
    r=client.get('/api/forecast',headers=auth('office')).json(); assert r['synthetic'] and len(r['zones'])==5
def test_rejection_duplicates_and_recommendations():
    citizen=auth('citizen'); office=auth('office')
    def report(text):
        return client.post('/api/complaints',headers=citizen,json={'category':'Missed collection','description':text,'location':'Sample lane'}).json()['id']
    first=report('Collection did not happen today'); duplicate=report('Same collection issue reported again')
    assert client.post(f'/api/complaints/{duplicate}/duplicate',headers=office,json={'original_id':first}).status_code==422
    assert client.post(f'/api/complaints/{duplicate}/duplicate',headers=office,json={'original_id':first,'reason':'Same location and event'}).json()['status']=='Duplicate'
    recommendations=client.get(f'/api/complaints/{first}/recommendations',headers=office).json()
    assert recommendations['recommendations'] and recommendations['distance'].startswith('Unavailable')
    rejected=report('Broken public bin needs inspection')
    assert client.post(f'/api/complaints/{rejected}/reject',headers=office,json={}).status_code==422
    assert client.post(f'/api/complaints/{rejected}/reject',headers=office,json={'reason':'Outside municipal service scope'}).json()['status']=='Rejected'
def test_history_and_export():
    admin=auth('admin'); citizen=auth('citizen')
    export=client.get('/api/export/complaints',headers=admin)
    assert export.status_code==200 and 'columns' in export.json() and 'rows' in export.json()
    created=client.post('/api/complaints',headers=citizen,json={'category':'Public bin damaged','description':'Bin near main gate is broken','location':'Park Street'}).json()
    cid=created['id']
    hist=client.get(f'/api/history/{cid}',headers=citizen)
    assert hist.status_code==200 and len(hist.json())>=1

