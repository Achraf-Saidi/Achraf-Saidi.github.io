#!/usr/bin/env python3
"""Build the Hostinger public release in isolation; never rewrite GitHub output."""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse


def https_url(value,root=False):
    if value is None:
        return None
    url=urlparse(value)
    if url.scheme!='https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('A public HTTPS URL without credentials, query or fragment is required')
    if root and url.path not in {'','/'}:
        raise ValueError('API origin must not include a path')
    return value.rstrip('/')


def build(output,site_url,api_origin=None,portal_url=None):
    site_url=https_url(site_url)
    api_origin=https_url(api_origin,root=True)
    portal_url=https_url(portal_url)
    source=Path(__file__).resolve().parents[2]/'novalisai'
    output=Path(output).resolve()
    if output.exists():
        raise ValueError('Choose a new output directory; an existing release is never overwritten')
    with tempfile.TemporaryDirectory(prefix='novalis-public-build-') as directory:
        checkout=Path(directory)/'website'
        shutil.copytree(source,checkout,ignore=shutil.ignore_patterns('__pycache__','node_modules','.git'))
        if urlparse(site_url).hostname in {'www.novalisai.com','novalisai.com'}:
            content_path=checkout/'content.json'
            content=json.loads(content_path.read_text())
            hosting={'fr': 'Cette vitrine est hébergée sur Hostinger.', 'en': 'This website is hosted on Hostinger.', 'nl': 'Deze website wordt gehost door Hostinger.', 'de': 'Diese Website wird auf Hostinger gehostet.'}
            for language,text in hosting.items():
                original=content[language]['legal_text'][1]
                separator=original.find('. ')
                if separator < 0:
                    raise RuntimeError('Unexpected hosting notice structure')
                content[language]['legal_text'][1]=text+original[separator+1:]
            content_path.write_text(json.dumps(content,ensure_ascii=False,indent=2))
        subprocess.run([sys.executable,str(checkout/'build.py'),'--site-url',site_url],check=True)
        output.mkdir(parents=True)
        for name in ['index.html','sitemap.xml']:
            shutil.copy2(checkout/name,output/name)
        for language in ['fr','en','nl','de']:
            for file in (checkout/language).rglob('*.html'):
                destination=output/file.relative_to(checkout)
                destination.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(file,destination)
        assets=output/'assets'
        assets.mkdir()
        for asset in (checkout/'assets').iterdir():
            if asset.is_file() and asset.suffix in {'.css','.js','.webp','.png','.woff2','.svg','.txt'}:
                shutil.copy2(asset,assets/asset.name)
        (output/'runtime-config.json').write_text(json.dumps({'api_origin':api_origin,'portal_url':portal_url},indent=2)+'\n')
        (output/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+site_url+'/sitemap.xml\n')
    if any(p.suffix in {'.py','.sqlite3','.env'} for p in output.rglob('*') if p.is_file()):
        raise RuntimeError('Source or runtime data entered the public release')
    return output


def main():
    parser=argparse.ArgumentParser(description='Prepare the public Novalis AI Hostinger release')
    parser.add_argument('--output',required=True)
    parser.add_argument('--site-url',default='https://www.novalisai.com')
    parser.add_argument('--api-origin')
    parser.add_argument('--portal-url')
    args=parser.parse_args()
    output=build(args.output,args.site_url,args.api_origin,args.portal_url)
    print('Public release prepared:',output)


if __name__=='__main__':
    main()
