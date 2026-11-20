import sqlite3, json
db = sqlite3.connect('./prisma/dev.db')
cur = db.cursor()
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
for (t,) in tables:
    count = cur.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    print(f'{t}: {count} rows')
db.close()
