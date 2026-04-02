@echo off
echo ==========================================
echo  AUTO DEPLOY UPDATES TO VPS (CS Premium)
echo ==========================================
echo.
echo Uploading server.js, database.js and public assets...
scp server.js database.js root@159.223.82.116:~/cs-premium/
scp -r public/* root@159.223.82.116:~/cs-premium/public/
echo.
echo Restarting Server...
ssh root@159.223.82.116 "cd ~/cs-premium && npm install && pm2 restart cs-premium"
echo.
echo ==========================================
echo  DEPLOY SUCCESS!
echo  Please check if Admin Panel is accessible.
echo ==========================================
pause
