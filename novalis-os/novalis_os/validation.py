import re
from datetime import date, datetime, timezone
from flask import request, abort


def data():
    value = request.get_json(silent=True)
    if not isinstance(value, dict):
        abort(400, 'Un objet JSON est requis.')
    return value


def text(d, key, maximum=200, minimum=1, default=None):
    value = d.get(key, default)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        abort(400, f'Champ invalide : {key}.')
    return value.strip()


def integer(d, key, minimum=0, maximum=100000000, default=None):
    value = d.get(key, default)
    if type(value) is not int or not minimum <= value <= maximum:
        abort(400, f'Nombre invalide : {key}.')
    return value


def choice(d, key, options, default=None):
    value = d.get(key, default)
    if value not in options:
        abort(400, f'Choix invalide : {key}.')
    return value


def email(d, key='email'):
    value = text(d, key, 254)
    if not value.isascii() or not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}", value):
        abort(400, 'Adresse e-mail invalide.')
    return value.lower()


def day(d, key):
    value = text(d, key, 10)
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError()
    except ValueError:
        abort(400, f'Date invalide : {key}.')
    return value


def instant(d, key):
    value = text(d, key, 40)
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if not dt.tzinfo:
            raise ValueError()
        return dt.astimezone(timezone.utc).isoformat(timespec='seconds')
    except ValueError:
        abort(400, f'Date et fuseau horaire requis : {key}.')
