"""한국어 위키백과에서 사진(작은 크기)과 첫머리 해설을 받아 src/photos.json 으로 묶는다.
GitHub Actions(.github/workflows/photos.yml)에서 돈다. 이미 받은 항목은 다시 받지 않는다.
'?'로 시작하는 검색어는 문서 이름 대신 검색으로 찾는다."""
import base64, io, json, os, sys, time, urllib.parse
import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QFILE = os.path.join(ROOT, 'tools', 'photo_queries.json')
OUT = os.path.join(ROOT, 'src', 'photos.json')
WK = 'https://ko.wikipedia.org'
S = requests.Session()
S.headers['User-Agent'] = 'crosshistory-photo-fetch/1.0 (https://github.com/soceji/crosshistory; educational history game)'
W, H, QUAL, EXT_MAX = 240, 180, 62, 900

def get(url, **kw):
    for i in range(4):
        try:
            r = S.get(url, timeout=25, **kw)
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(2 * (i + 1)); continue
            return r
        except requests.RequestException:
            time.sleep(2 * (i + 1))
    return None

def search(term):
    r = get(f'{WK}/w/api.php', params={'action': 'query', 'list': 'search', 'srsearch': term, 'srlimit': 1, 'format': 'json'})
    try: return r.json()['query']['search'][0]['title']
    except Exception: return None

def summary(title):
    r = get(f"{WK}/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'), safe='')}")
    if not r or r.status_code != 200: return None
    j = r.json()
    return None if j.get('type') == 'disambiguation' else j

def intro(title):
    r = get(f'{WK}/w/api.php', params={'action': 'query', 'prop': 'extracts', 'exintro': 1, 'explaintext': 1, 'redirects': 1, 'titles': title, 'format': 'json'})
    try:
        pg = next(iter(r.json()['query']['pages'].values()))
        return pg.get('extract') or ''
    except Exception: return ''

def wikidata_image(qid):
    r = get('https://www.wikidata.org/w/api.php', params={'action': 'wbgetclaims', 'entity': qid, 'property': 'P18', 'format': 'json'})
    try: return r.json()['claims']['P18'][0]['mainsnak']['datavalue']['value']
    except Exception: return None

def thumb(url):
    r = get(url)
    if not r or r.status_code != 200: return None
    try:
        im = Image.open(io.BytesIO(r.content)); im = im.convert('RGB'); im.thumbnail((W, H))
        b = io.BytesIO(); im.save(b, 'JPEG', quality=QUAL, optimize=True, progressive=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    except Exception: return None

def lookup(q):
    sm = None
    if q.startswith('?'):
        t = search(q[1:]); sm = summary(t) if t else None
    else:
        sm = summary(q)
        if not sm:
            t = search(q); sm = summary(t) if t else None
    if not sm: return None
    title = sm['title']
    ext = intro(title) or sm.get('extract', '')
    ext = '\n'.join(p for p in ext.split('\n') if p.strip())
    if len(ext) > EXT_MAX: ext = ext[:EXT_MAX].rsplit('.', 1)[0] + '.'
    src = (sm.get('thumbnail') or {}).get('source'); file = None
    if src: file = urllib.parse.unquote(src.split('/')[-1]).split('px-', 1)[-1]
    elif sm.get('wikibase_item'):
        file = wikidata_image(sm['wikibase_item'])
        if file: src = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width=320"
    img = thumb(src) if src else None
    url = (sm.get('content_urls') or {}).get('desktop', {}).get('page') or f"{WK}/wiki/{urllib.parse.quote(title)}"
    return {'t': title, 'e': ext, 'i': img, 'f': file if img else None, 'u': url}

def main():
    qs = json.load(open(QFILE, encoding='utf-8'))
    old = {}
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8'))
        except Exception: old = {}
    out = {}; miss = 0
    for n, q in enumerate(qs):
        if q in old and old[q] and old[q].get('i'):
            out[q] = old[q]; continue
        try: r = lookup(q)
        except Exception as e:
            print('ERR', q, e, file=sys.stderr); r = None
        out[q] = r or old.get(q)
        if not r or not r.get('i'): miss += 1
        if n % 25 == 0: print(n, len(qs), q, 'ok' if r and r.get('i') else '-', flush=True)
        time.sleep(0.08)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('done', len(out), 'no image', miss, 'bytes', os.path.getsize(OUT))

if __name__ == '__main__':
    main()
