import urllib.request
import json

payload = {
    "totalBoxes": 1500,
    "totalJiffies": 3000,
    "excellent": 2,
    "good": 3,
    "bad": 1,
    "aisles": 10
}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:5000/api/simulate', data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("BODY:", e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
