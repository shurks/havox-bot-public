[0;1;32m●[0m pm2-root.service - PM2 process manager
     Loaded: loaded (]8;;file://vps/etc/systemd/system/pm2-root.service/etc/systemd/system/pm2-root.service]8;;; [0;1;32menabled[0m; preset: [0;1;32menabled[0m)
    Drop-In: /etc/systemd/system/pm2-root.service.d
             └─]8;;file://vps/etc/systemd/system/pm2-root.service.d/override.confoverride.conf]8;;
     Active: [0;1;32mactive (running)[0m since Thu 2025-10-09 19:12:39 UTC; 6min ago
       Docs: ]8;;https://pm2.keymetrics.io/https://pm2.keymetrics.io/]8;;
    Process: 5657 ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect (code=exited, status=0/SUCCESS)
   Main PID: 4939 (PM2 v6.0.13: Go)
      Tasks: 0 (limit: 4655)
     Memory: 20.0K (high: 1.4G max: 2.0G available: 367.2M peak: 18.5M)
        CPU: 175ms
     CGroup: /system.slice/pm2-root.service
             ‣ 4939 "PM2 v6.0.13: God Daemon (/root/.pm2)"

Oct 09 19:12:39 vps systemd[1]: Starting pm2-root.service - PM2 process manager...
Oct 09 19:12:39 vps pm2[5657]: [PM2] Resurrecting
Oct 09 19:12:39 vps pm2[5657]: [PM2] Restoring processes located in /root/.pm2/dump.pm2
Oct 09 19:12:39 vps pm2[5657]: ┌────┬───────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
Oct 09 19:12:39 vps pm2[5657]: │ id │ name      │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
Oct 09 19:12:39 vps pm2[5657]: └────┴───────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
Oct 09 19:12:39 vps systemd[1]: Started pm2-root.service - PM2 process manager.
