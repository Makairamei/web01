const db = require('./database');
setTimeout(() => {
    try {
        const rows = db.all("SELECT id, device_id, device_name, last_seen, ip_address FROM devices ORDER BY id DESC LIMIT 10");
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
