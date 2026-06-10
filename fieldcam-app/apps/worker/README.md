# fieldcam.app Worker

Background job processor using arq (async Redis queue).

The worker shares the same codebase as the API (`apps/api`) and is started with:

```bash
cd apps/api
arq app.worker.WorkerSettings
```

## Jobs

- `process_media` — validate uploaded media, extract dimensions/EXIF, generate thumbnails
- `generate_report` — render HTML template to PDF, upload to storage
- `send_email` — send transactional emails (invites, magic links, notifications)
- `cleanup_expired_shares` — remove expired share links
