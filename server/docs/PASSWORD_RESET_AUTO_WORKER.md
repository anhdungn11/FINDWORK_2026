# Automatic password reset delivery

The `start:password-reset-email-worker` process only registers and calls
`PasswordResetWorker`. It does not run verification, invitation, or recruitment
delivery. Keep `EMAIL_WORKER_ENABLED=false`; the general email worker does not
process reset jobs in this version.

## Activation review

1. Deploy the reviewed backend build separately from the running demo. Confirm
   the intended database identity and a read-only count of all email outboxes.
   Review the sender, reset URL, encryption keyring, provider credential, and
   recipient test mailbox without printing secrets or tokens.
2. Record an exact UTC cutoff at activation time, for example
   `2026-10-30T02:00:00.000Z`. Set
   `EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE` to that timestamp in the **worker's
   private environment only**. Jobs created before the cutoff are never
   selected, inspected for keys, claimed, or cleaned by this process.
3. Set `EMAIL_PASSWORD_RESET_ENABLED=true`,
   `EMAIL_PASSWORD_RESET_AUTO_WORKER_ENABLED=true`, and
   `EMAIL_WORKER_ENABLED=false` in the worker environment. Keep invitation and
   recruitment workers stopped. The API may keep its separate existing
   configuration for queueing reset requests.
4. From this build's `server` directory, run the private launcher preflight
   after setting the exact UTC cutoff in the current shell:

   ```powershell
   $env:FINDWORK_RESET_AUTO_NOT_BEFORE = 'YYYY-MM-DDTHH:mm:ss.sssZ'
   & 'C:\nvm4w\nodejs\node.exe' scripts/launch-password-reset-auto.cjs preflight
   ```

   Review the database identity, migration count, and excluded queue counts.
   Only after separate activation approval, use the same shell and cutoff:

   ```powershell
   $env:FINDWORK_RESET_AUTO_ACTIVATE = 'YES'
   & 'C:\nvm4w\nodejs\node.exe' scripts/launch-password-reset-auto.cjs start
   ```

   The launcher reads the existing private base, Resend, and crypto environment
   files without changing them. Observe a newly requested, authorized reset in the
   outbox and confirm receipt in the intended mailbox before broad release.
   Do not use old queued jobs as the first delivery test.

The worker atomically claims queued reset rows, rechecks token, account, and
recipient eligibility, and scrubs the encrypted payload on completion.
Explicit rate limits and concurrent idempotency responses back off and retry
with the same key. A transport error, HTTP 5xx, malformed success, or expired
processing lease is quarantined as `FAILED` for manual review because the
provider may have accepted the message. The worker never blindly resends it.
The current six queued recruitment notices are in a separate table and are
outside this worker's scope.

## Rollback

Use the PID record written by the launcher and verify the command line before
stopping that exact process:

```powershell
$recordPath = Join-Path $env:TEMP 'findwork-reset-auto-worker.pid.json'
$record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$workerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)"
if (-not $workerProcess -or $workerProcess.CommandLine -notmatch 'password-reset-email-worker.main.js') { throw 'Worker PID identity mismatch' }
Stop-Process -Id $record.pid
Wait-Process -Id $record.pid -Timeout 15
Remove-Item -LiteralPath $recordPath
```

Unset `FINDWORK_RESET_AUTO_ACTIVATE` in the shell and keep
`EMAIL_PASSWORD_RESET_AUTO_WORKER_ENABLED=false` for any later launch. Leave
all outbox rows and tokens intact for review. Requests may continue to queue
while API reset delivery remains enabled; if delivery must pause completely,
disable reset request queueing in a separately reviewed API configuration
change. Do not requeue `FAILED` uncertain outcomes without provider-side
reconciliation and recipient review.
