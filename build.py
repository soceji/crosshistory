# src/ 의 파일들을 하나의 index.html 로 묶는다 (GitHub Pages 배포용)
import re
src=open('src/index.html',encoding='utf-8').read()
def inl(m):
    js=open('src/'+m.group(1),encoding='utf-8').read().replace('</script','<\\/script')
    return '<script>\n'+js+'\n</script>'
out=re.sub(r'<script src="([^"]+)"></script>',inl,src)
out='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'+out+'\n</body>\n</html>\n'
open('index.html','w',encoding='utf-8').write(out)
print('index.html', len(out.encode()), 'bytes')
import os, shutil
if os.path.exists('src/photos.json'):
    shutil.copy('src/photos.json','photos.json'); print('photos.json', os.path.getsize('photos.json'), 'bytes')
