"""Check that the deployed public assets match the revision tested by CI."""
import hashlib
import os
import time
from pathlib import Path
from urllib.request import Request, urlopen

base = os.environ['SITE_URL'].rstrip('/') + '/'
files = ['index.html', 'app.js', 'engine.js', 'content.js', 'storage.js', 'style.css']
for attempt in range(12):
    try:
        for name in files:
            request = Request(base + name + '?check=' + os.getenv('GITHUB_SHA', 'local'), headers={'Cache-Control': 'no-cache'})
            with urlopen(request, timeout=20) as response:
                remote = response.read()
                assert response.status == 200
            expected = Path('public', name).read_bytes()
            assert hashlib.sha256(remote).digest() == hashlib.sha256(expected).digest(), f'Stale or different content: {name}'
        print(f'LIVE VERIFIED: {base} — all {len(files)} assets match tested source')
        break
    except Exception as exc:
        if attempt == 11:
            raise
        print(f'Waiting for Pages/CDN ({attempt + 1}/12): {exc}')
        time.sleep(5)
