#!/usr/bin/env python3
"""Private server operator tool: diagnose live identities and legacy accounts.

Reads the existing production environment on the VPS. Does NOT email/reset tokens,
accept a password on the command line, or touch the separate novalis-demo tenant.
The password reset action requires an interactive terminal and a complete backup.
"""
import argparse
import getpass
import hashlib
import json
import os
import sqlite3
from pathlib import Path

DIRECTION = ("achraf@novalisai.com", "saidi@novalisai.com")
CONFIG = Path("/etc/novalis-os/production.env")


def read_private_environment():
    if not CONFIG.is_file():
        raise RuntimeError("Private production environment file is absent")
    for raw in CONFIG.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        # Never echo these secret values.
        if key.startswith("NOVALIS_"):
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))
    if os.environ.get("NOVALIS_MODE") != "production" or os.environ.get("NOVALIS_ORG_ID") != "novalis":
        raise RuntimeError("This tool is strictly for the live Novalis production organisation")
    # Root is necessary only to read the private service environment. Drop its
    # privileges before opening SQLite, creating backups or modifying sessions.
    if os.geteuid() == 0:
        import pwd
        identity = pwd.getpwnam("novalis-os")
        os.setgroups([])
        os.setgid(identity.pw_gid)
        os.setuid(identity.pw_uid)


def fingerprint(db, sql, args=()):
    dig = hashlib.sha256()
    for result in db.execute(sql, args):
        dig.update(json.dumps(tuple(result), default=str, ensure_ascii=False).encode("utf-8"))
        dig.update(b"\\n")
    return dig.hexdigest()


def business_snapshot(db):
    # Both tenants are in one SQLite file. Hash ALL important business rows, not
    # just the first lead, so a credential change cannot silently alter history.
    digest = hashlib.sha256()
    # Protect every non-auth table, including all lead correspondence, document
    # metadata, billing and the separate demonstration tenant.
    excluded = {"users", "sessions", "tokens", "audit"}
    tables = [r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        if r[0] not in excluded]
    for table in tables:
        digest.update(table.encode())
        digest.update(fingerprint(db, 'SELECT * FROM "' + table + '" ORDER BY 1').encode())
    return digest.hexdigest()


def diagnose(app):
    from novalis_os.db import get_db, row, rows
    from flask import g
    with app.app_context():
        db = get_db()
        people = []
        for identity in DIRECTION:
            u = row("SELECT email,role,status,password_hash,totp_cipher FROM users WHERE org_id=? AND email=?",
                    ("novalis", identity))
            people.append({"email": identity, "exists": bool(u),
                           "role": u["role"] if u else None,
                           "status": u["status"] if u else None,
                           "password_set": bool(u and u["password_hash"]),
                           "totp_enabled": bool(u and u["totp_cipher"]),
                           "mfa_exempt": identity in app.config["MFA_EXEMPT_EMAILS"]})
        projects = rows("""SELECT p.id,p.name,p.status,p.lead_id,c.name AS client_name,
              (SELECT COUNT(*) FROM invoices i WHERE i.project_id=p.id) AS invoice_count
              FROM projects p JOIN clients c ON c.id=p.client_id
              WHERE p.org_id='novalis' ORDER BY c.name,p.name""")
        # These are informational candidates, not presumed safe to delete.
        legacy = [dict(p) for p in projects if any(
            key in (p["client_name"]+" "+p["name"]).lower() for key in ("jetnext", "gsk"))]
        payload = {
            "live_direction": people,
            "legacy_review_candidates": legacy,
            "production_project_count": len(projects),
            "demo_users_unchanged": db.execute(
                "SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0],
            "no_changes_made": True}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return payload


def reset_achraf(app):
    from novalis_os.db import get_db, transaction, row, audit, uid
    from novalis_os.cli import backup
    from novalis_os.security import hash_password
    address = "achraf@novalisai.com"
    with app.app_context():
        db = get_db()
        user = row("SELECT * FROM users WHERE org_id='novalis' AND email=?", (address,))
        if not user or user["role"] != "manager":
            raise RuntimeError("Named direction account is absent or no longer has manager role")
        new_password = getpass.getpass("New personal password, 12 characters minimum: ")
        repeat = getpass.getpass("Repeat password: ")
        if new_password != repeat:
            raise RuntimeError("The two passwords do not match")
        encoded_password = hash_password(new_password)
        del new_password, repeat
        before = business_snapshot(db)
        demo_users_before = fingerprint(db,
            "SELECT * FROM users WHERE org_id='novalis-demo' ORDER BY id")
        destination = Path("/srv/novalis-os/backups")/("before-achraf-password-reset-"+uid())
        backup(app.config["DATABASE"], app.config["FILES_DIR"], destination)
        with transaction() as conn:
            changed = conn.execute("""UPDATE users SET password_hash=?,status='active',verified_at=?
                 WHERE id=? AND org_id='novalis' AND email=? AND role='manager'""",
                (encoded_password, __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(timespec='seconds'),
                 user["id"], address)).rowcount
            if changed != 1:
                raise RuntimeError("Account state changed during reset; rollback")
            conn.execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
            conn.execute("UPDATE tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL",
                (__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(timespec='seconds'), user["id"]))
            audit("operator.owner_password_reset", user["id"], {"reset_via":"private_vps_terminal",
                  "password_or_recovery_codes_not_logged":True}, org_id="novalis")
            if business_snapshot(conn) != before or fingerprint(conn,
                    "SELECT * FROM users WHERE org_id='novalis-demo' ORDER BY id") != demo_users_before:
                raise RuntimeError("Unrelated business or demonstration data changed; rolling back")
        print("Account password reset. All other users and commercial records unchanged.")
        print("MFA unchanged. If an authenticator is still configured it must be supplied at login.")
        print("New backup validated: "+str(destination))


def main():
    p = argparse.ArgumentParser(description="Safely diagnose and reset a single Novalis owner account")
    p.add_argument("--reset-achraf", action="store_true", help="Requires interactive new password and backups")
    opts = p.parse_args()
    read_private_environment()
    from novalis_os import create_app
    app = create_app()
    if opts.reset_achraf:
        reset_achraf(app)
    else:
        diagnose(app)


if __name__ == "__main__":
    main()
