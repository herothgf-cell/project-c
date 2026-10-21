"""Real UI regression. Run npm run dev in another terminal, then python tests/browser_smoke.py.
Dependencies: pip install playwright; python -m playwright install chromium.
BASE_URL may point to a local build, Pages path, or a staging host.
"""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('BASE_URL', 'http://127.0.0.1:4173/')
OUT = Path('test-results'); OUT.mkdir(exist_ok=True)
checks = []
OFFLINE = os.getenv('OFFLINE_RENDER') == '1'

def open_game(page, reload=False, mode='normal'):
    if not OFFLINE:
        if reload: page.reload()
        else: page.goto(BASE)
        return
    # No network / policy changes: render our own files as an in-memory document.
    # Storage is a harness stand-in here; real HTTP-origin storage is checked by CI.
    html = Path('public/index.html').read_text()
    html = re.sub(r'<link rel="stylesheet"[^>]*>', '<style>' + Path('public/style.css').read_text() + '</style>', html)
    html = re.sub(r'<script type="module"[^>]*></script>', '', html)
    page.set_content(html)
    page.evaluate("""(mode) => {
      window.__offlineSave ??= {};
      if (mode === 'corrupt') window.__offlineSave['oblivion-architect:progress:v1'] = '{broken';
      if (mode === 'blocked') Object.defineProperty(window, 'localStorage', {configurable:true, get(){throw Error('blocked');}});
      else Object.defineProperty(window, 'localStorage', {configurable:true, value:{
        getItem(key){return window.__offlineSave[key] ?? null;},
        setItem(key,value){window.__offlineSave[key]=String(value);}
      }});
    }""", mode)
    source = '\n'.join(Path('public/' + f).read_text() for f in ['content.js','engine.js','storage.js','app.js'])
    source = re.sub(r'^import .*?;\n', '', source, flags=re.M)
    source = re.sub(r'^export ', '', source, flags=re.M)
    page.add_script_tag(content='(() => {\n' + source + '\n})();')

def click(page, action):
    page.locator(f'[data-action="{action}"]').first.click()

def forget(page, card):
    page.locator(f'[data-card="{card}"]').click()
    click(page, 'forget')

def solve(page, index):
    if index == 0:
        forget(page, 'A-02'); click(page, 'execute')
    elif index == 1:
        forget(page, 'A-13'); click(page, 'execute')
        forget(page, 'A-12'); click(page, 'execute')
    else:
        forget(page, 'A-22')
        page.locator('[data-robot="B"]').first.click()
        forget(page, 'B-22'); click(page, 'execute')
    expect(page.locator('[data-status="success"]')).to_be_visible()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.getenv('CHROMIUM_PATH') or None, args=['--no-sandbox'])
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = ctx.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    open_game(page)
    expect(page.get_by_role('heading', name='망각 설계자', exact=True)).to_be_visible()
    click(page, 'start'); expect(page.locator('[data-stage="P01"]')).to_be_visible()
    page.screenshot(path=str(OUT / 'desktop-p01.png'), full_page=True)
    # Wrong send, Undo from failure, then restart.
    click(page, 'execute'); expect(page.locator('[data-status="failure"]')).to_be_visible()
    click(page, 'undo'); expect(page.locator('[data-status="failure"]')).to_have_count(0)
    click(page, 'restart'); checks.append('failure / undo / restart')
    page.locator('[data-card="A-02"]').click(); page.keyboard.press('Delete')
    expect(page.locator('[data-card="A-02"]')).to_be_disabled()
    page.keyboard.press('KeyZ'); expect(page.locator('[data-card="A-02"]')).to_be_enabled()
    page.keyboard.press('KeyE'); expect(page.locator('[data-status="failure"]')).to_be_visible()
    page.keyboard.press('KeyZ'); page.keyboard.press('KeyR')
    checks.append('keyboard Delete / Z / E / R')
    solve(page, 0); click(page, 'next')
    # Room-level save resumes the unlocked room, not transient actions.
    open_game(page, reload=True); click(page, 'continue'); expect(page.locator('[data-stage="P02"]')).to_be_visible()
    # Both memories removed before execution: wait, no skip.
    forget(page, 'A-13'); forget(page, 'A-12'); click(page, 'execute')
    expect(page.locator('[data-testid="delivery-count"]')).to_have_text('0 / 2')
    click(page, 'restart'); solve(page, 1)
    page.screenshot(path=str(OUT / 'desktop-p02-success.png'), full_page=True)
    click(page, 'next'); solve(page, 2); click(page, 'next')
    click(page, 'report-public'); expect(page.locator('[data-ending="public"]')).to_be_visible()
    click(page, 'rechoose'); click(page, 'report-internal')
    expect(page.locator('[data-ending="internal"]')).to_be_visible()
    open_game(page, reload=True); click(page, 'continue'); expect(page.locator('[data-ending="internal"]')).to_be_visible()
    checks.append('desktop: P01/P02/P03, both endings, reload')
    click(page, 'home'); click(page, 'help'); expect(page.locator('dialog[open]')).to_be_visible()
    page.keyboard.press('Escape'); expect(page.locator('dialog[open]')).to_have_count(0)
    # New campaign must ask before removing completion data.
    click(page, 'start'); expect(page.locator('dialog[open]')).to_be_visible(); click(page, 'cancel-dialog')
    checks.append('help dialog / new-game cancel')
    assert not errors, errors
    # A clean touch-width session must be playable all the way through too.
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
    m = mobile.new_page(); m.on('pageerror', lambda e: errors.append(str(e))); open_game(m); click(m, 'start')
    assert m.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile overflow'
    m.screenshot(path=str(OUT / 'mobile-p01.png'), full_page=True)
    for index in range(3): solve(m, index); click(m, 'next')
    click(m, 'report-public'); expect(m.locator('[data-ending="public"]')).to_be_visible()
    assert m.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'ending overflow'
    checks.append('390px touch session: all rooms / ending / no horizontal overflow')
    # Corrupt and inaccessible browser storage may not crash start-up.
    corrupt = browser.new_context()
    corrupt.add_init_script("localStorage.setItem('oblivion-architect:progress:v1', '{broken')")
    c = corrupt.new_page(); open_game(c, mode='corrupt'); click(c, 'start'); expect(c.locator('[data-stage="P01"]')).to_be_visible()
    blocked = browser.new_context()
    blocked.add_init_script("Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});")
    b = blocked.new_page(); open_game(b, mode='blocked'); click(b, 'start'); expect(b.locator('[data-stage="P01"]')).to_be_visible()
    checks.append('corrupt / inaccessible storage fallbacks')
    for width in [360, 768, 1280]:
        page.set_viewport_size({'width':width, 'height':900})
        click(page, 'home')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'home overflow at {width}'
    checks.append('360 / 768 / 1280px responsive start screens')
    assert not errors, errors
    browser.close()
OUT.joinpath('browser-report.json').write_text(json.dumps({'mode': 'offline DOM with storage stand-in' if OFFLINE else 'HTTP origin', 'checks': checks, 'page_errors': errors}, ensure_ascii=False, indent=2))
print(json.dumps({'passed': checks, 'page_errors': errors}, ensure_ascii=False, indent=2))
