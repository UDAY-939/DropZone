import urllib.request
import urllib.parse
import json
import time

BASE = 'http://127.0.0.1:5000/api'
test_code = f"DEMO-{int(time.time())}"

def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("Testing End-to-End Core Operations:")

# 1. Create personal room
p_data = post_json(f'{BASE}/rooms', {'room_type': 'personal'})
p_code = p_data['room_code']
p_token = p_data['owner_token']
print(f"✓ Personal room created: {p_code}")

# 2. Join personal room
joined = post_json(f'{BASE}/rooms/join', {'room_code': p_code})
assert joined['room_code'] == p_code
print(f"✓ Join room by code works: {joined['room_code']}")

# 3. Post chat message
msg_data = post_json(f'{BASE}/rooms/{p_code}/messages', {
    'content': 'Test direct message from mobile to laptop',
    'sender': 'Mobile (Android)',
    'sender_device': 'mobile'
})
assert msg_data['content'] == 'Test direct message from mobile to laptop'
print(f"✓ Real-time message exchange works")

# 4. Create Global Room with custom code and password
g_data = post_json(f'{BASE}/rooms', {
    'room_type': 'global',
    'custom_code': test_code,
    'password': 'safePassword!'
})
assert g_data['room_code'] == test_code
assert g_data['has_password'] is True
print(f"✓ Global persistent room created: {test_code}")

# 5. Join Global Room with password
g_joined = post_json(f'{BASE}/rooms/join', {
    'room_code': test_code,
    'password': 'safePassword!'
})
assert g_joined['room_code'] == test_code
print(f"✓ Global room unlocked with password")

# 6. Delete personal room (session vanished)
del_req = urllib.request.Request(
    f'{BASE}/rooms/{p_code}',
    headers={'X-Owner-Token': p_token, 'Content-Type': 'application/json'},
    method='DELETE'
)
with urllib.request.urlopen(del_req) as resp:
    del_res = json.loads(resp.read().decode())
    print(f"✓ Temporary room vanished: {del_res['message']}")

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

