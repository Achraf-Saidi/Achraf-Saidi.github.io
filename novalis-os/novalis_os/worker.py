"""One worker per deployment: reminders, configured email and verified local backups."""
import os
import time
from pathlib import Path
from datetime import datetime, timezone
from . import create_app
from .cli import maintenance, backup, verify_backup
from .outbox import send_pending
from .payments import reconcile_pending


def main():
    app=create_app()
    while True:
        with app.app_context():
            try:
                maintenance()
                reconcile_pending(5)
                result=send_pending(10)
                if result['sent']:
                    print(f"Outbox: {result['sent']} message(s) transmitted.",flush=True)
                folder=os.environ.get('NOVALIS_BACKUP_DIR')
                if folder:
                    root=Path(folder)
                    root.mkdir(parents=True,exist_ok=True)
                    destination=root/datetime.now(timezone.utc).strftime('%Y-%m-%d')
                    if not destination.exists():
                        backup(app.config['DATABASE'],app.config['FILES_DIR'],destination)
                        print('Daily local backup created and verified.',flush=True)
                    else:
                        # A partial backup must never be silently accepted.
                        verify_backup(destination)
            except Exception as error:
                print(f'Worker operation failed: {type(error).__name__}. Operator intervention required.',flush=True)
        time.sleep(60)


if __name__=='__main__':
    main()
