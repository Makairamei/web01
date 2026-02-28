const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

(async () => {
    try {
        const SQL = await initSqlJs();
        const DB_PATH = path.join(__dirname, 'premium.db');

        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            const db = new SQL.Database(fileBuffer);

            const hash = bcrypt.hashSync('admin123', 12);

            // check if admin exists
            const stmt = db.prepare("SELECT * FROM admins WHERE username = 'admin'");
            if (stmt.step()) {
                console.log('Admin user found. Resetting password...');
                db.run("UPDATE admins SET password_hash = ? WHERE username = 'admin'", [hash]);
            } else {
                console.log('Admin user not found. Creating...');
                db.run("INSERT INTO admins (username, password_hash) VALUES (?, ?)", ['admin', hash]);
            }
            stmt.free();

            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
            console.log('Password reset to: admin123');
        } else {
            console.log('Database not found at', DB_PATH);
        }
    } catch (e) {
        console.error(e);
    }
})();
