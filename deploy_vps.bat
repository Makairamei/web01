@echo off
echo ==========================================
echo  AUTO DEPLOY - CS Premium ke VPS Baru
echo  Target: root@8.211.243.255
echo ==========================================
echo.
echo [1/4] Upload server.js dan database.js...
scp server.js database.js root@8.211.243.255:~/web/
echo.
echo [2/4] Upload public assets...
scp -r public/* root@8.211.243.255:~/web/public/
echo.
echo [3/4] Upload dashboard assets...
scp -r dashboard/* root@8.211.243.255:~/web/dashboard/
echo.
echo [4/4] Install dependencies + restart server...
ssh root@8.211.243.255 "cd ~/web && npm install && pm2 restart admin-panel || pm2 start server.js --name admin-panel"
echo.
echo ==========================================
echo  DEPLOY SELESAI!
echo  Akses: http://8.211.243.255:3000
echo ==========================================
pause
