"""Mollie HTTPS transport; secrets never enter URLs, browser responses or error logs."""
import json
import re
import socket
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode, urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from flask import current_app


class ProviderError(Exception):
    def __init__(self, ambiguous=False):
        super().__init__('Le prestataire de paiement est momentanément indisponible.')
        self.ambiguous=ambiguous


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def cents(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d{1,9}\.\d{2}',value):
        raise ValueError('Invalid monetary amount')
    try:
        return int(Decimal(value)*100)
    except InvalidOperation as error:
        raise ValueError('Invalid monetary amount') from error


def amount(value):
    return {'currency':'EUR','value':f'{value//100}.{value%100:02d}'}


def safe_checkout(value):
    u=urlparse(value or '')
    # Only Mollie's hosted checkout; no user-supplied redirects or arbitrary URLs.
    if u.scheme!='https' or u.hostname not in {'www.mollie.com','checkout.mollie.com','mollie.com'} or u.username or u.password or u.port not in {None,443}:
        raise ProviderError()
    return value


def configured(mode=None):
    mode=mode or current_app.config['PAYMENTS_MODE']
    key=current_app.config.get('MOLLIE_'+mode.upper()+'_KEY','')
    return mode in {'test','live'} and key.startswith(mode+'_') and len(key)>12 and (mode!='live' or current_app.config['PAYMENTS_LIVE_ENABLED'])


class Mollie:
    def __init__(self,mode):
        if not configured(mode):
            raise ProviderError()
        self.mode=mode

    def request(self,method,path,payload=None,idempotency=None):
        if not path.startswith('/v2/') or '..' in path:
            raise ValueError('Invalid provider path')
        headers={'Authorization':'Bearer '+current_app.config['MOLLIE_'+self.mode.upper()+'_KEY'], 'Accept':'application/json','User-Agent':'NovalisOS/2'}
        if idempotency:headers['Idempotency-Key']=idempotency
        raw=None
        if payload is not None:
            headers['Content-Type']='application/json';raw=json.dumps(payload).encode()
        try:
            req=Request('https://api.mollie.com'+path,data=raw,headers=headers,method=method)
            with build_opener(NoRedirect()).open(req,timeout=12) as response:
                result=json.loads(response.read(1048576))
            if not isinstance(result,dict):raise ValueError()
            return result
        except HTTPError as error:
            # No raw provider body: it may contain credentials, PII or account details.
            raise ProviderError(ambiguous=method=='POST' and error.code>=500) from None
        except (URLError,socket.timeout,TimeoutError,OSError,ValueError):
            raise ProviderError(ambiguous=method=='POST') from None

    def methods(self,total):
        return self.request('GET','/v2/methods?'+urlencode({'amount[currency]':'EUR','amount[value]':amount(total)['value'],'sequenceType':'oneoff'})).get('_embedded',{}).get('methods',[])

    def create(self,payload,key):return self.request('POST','/v2/payments',payload,key)
    def get(self,identifier):
        if not re.fullmatch(r'tr_[A-Za-z0-9]{3,64}',identifier or ''):raise ProviderError()
        return self.request('GET','/v2/payments/'+identifier)
    def find(self,attempt_id):
        # Bounded recovery for a create timeout/crash; never create another charge blindly.
        next_path='/v2/payments?limit=100'
        for _ in range(5):
            bundle=self.request('GET',next_path)
            for item in bundle.get('_embedded',{}).get('payments',[]):
                if isinstance(item.get('metadata'),dict) and item['metadata'].get('novalis_attempt')==attempt_id:return item
            link=bundle.get('_links',{}).get('next',{}).get('href')
            if not link:return None
            u=urlparse(link)
            if u.scheme!='https' or u.hostname!='api.mollie.com' or u.username or u.password or u.path!='/v2/payments':raise ProviderError()
            next_path=u.path+('?'+u.query if u.query else '')
        return None
    def refund(self,payment_id,payload,key):return self.request('POST','/v2/payments/'+payment_id+'/refunds',payload,key)
    def refunds(self,payment_id):return self.request('GET','/v2/payments/'+payment_id+'/refunds?limit=100').get('_embedded',{}).get('refunds',[])


def provider(mode):
    factory=current_app.config.get('PAYMENT_PROVIDER_FACTORY')
    return factory(mode) if factory else Mollie(mode)
