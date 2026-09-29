# Azolve - MongoDB Local Setup Guide

MongoDB is a **NoSQL database** (not SQL). It stores data as JSON documents, not tables/rows.
So there is no `.sql` file to import — instead, we use a **seed script** that inserts sample data.

---

## Step 1: Install MongoDB

### Windows
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the `.msi` installer (choose "Complete" setup)
3. Choose "Install MongoDB as a Service" (this auto-starts MongoDB on boot)
4. MongoDB installs to `C:\Program Files\MongoDB\Server\7.0\` (or similar)
5. The data directory is auto-created at `C:\data\db`

**Verify it's running:**
Open Command Prompt and type:
```
mongosh
```
You should see `test>` prompt. Type `exit` to quit.

If `mongosh` is not found, try:
```
"C:\Program Files\MongoDB\Server\7.0\bin\mongosh.exe"
```

### Mac
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb    # auto-start on boot
```

---

## Step 2: Verify MongoDB is Running

Open a terminal and run:
```bash
mongosh
```

You should see something like:
```
Current MongDB Log: ...
test>
```

If you see the `test>` prompt, MongoDB is running. Type `exit` to quit.

**If MongoDB is NOT running:**

### Windows
Open Command Prompt as Administrator:
```
net start MongoDB
```

### Mac
```bash
brew services start mongodb-community
```

### Linux
```bash
sudo systemctl start mongodb
```

---

## Step 3: Create the Database

MongoDB creates databases automatically when you first insert data.
Our app uses the database name `azolve_db` (configured in `.env`).

You do NOT need to manually create the database — the seed script will create it automatically.

However, if you want to verify, open `mongosh` and run:
```javascript
use azolve_db
db.stats()
```

---

## Step 4: Install Backend Dependencies

Open a terminal in the `backend` folder:
```bash
cd backend
npm install
```

This installs all required packages including Mongoose (the MongoDB driver).

---

## Step 5: Run the Seed Script

This will populate the database with sample data (company, users, clients, products, invoices, etc.):

```bash
npm run seed
```

You should see output like:
```
🌱 Seeding Azolve database...
✅ Company created: Azolve Technologies
✅ Admin user created: admin@azolve.com / admin123
✅ 5 team members created
✅ 10 clients created
✅ 15 products created
✅ 8 invoices created
✅ 12 leads created
✅ 6 deals created
✅ 4 projects created
✅ 20 tasks created
✅ 8 employees created
✅ Attendance records created
✅ Leave requests created
✅ 5 support tickets created
✅ 3 meetings created
✅ Sample documents created
✅ Bank account & transactions created
✅ Notifications created
✅ Audit logs created
✅ API key created
🎉 Seeding complete! You can now login with:
   Email: admin@azolve.com
   Password: admin123
```

---

## Step 6: Start the Server

```bash
npm start
```

Or for development (auto-restart on changes):
```bash
npm run dev
```

Then open: http://localhost:3000

Login with:
- **Email:** admin@azolve.com
- **Password:** admin123

---

## Step 7: Verify Data

After logging in, you should see:
- Dashboard with stats (clients, invoices, revenue)
- Client list with 10 sample clients
- Product catalog with 15 products
- Invoice list with 8 invoices
- CRM with 12 leads and 6 deals
- 4 projects with 20 tasks
- HR module with 8 employees
- Support tickets
- Calendar events and meetings

---

## Useful MongoDB Commands

Open `mongosh` and run these to inspect your data:

```javascript
use azolve_db

// Show all collections (like tables in SQL)
show collections

// Count documents in each collection
db.users.countDocuments()
db.clients.countDocuments()
db.invoices.countDocuments()
db.products.countDocuments()
db.leads.countDocuments()
db.deals.countDocuments()
db.projects.countDocuments()
db.tasks.countDocuments()
db.employees.countDocuments()

// View all users
db.users.find({}, { name: 1, email: 1, role: 1 })

// View all clients
db.clients.find({}, { name: 1, email: 1, industry: 1 })

// View invoice summary
db.invoices.find({}, { invoiceNumber: 1, status: 1, grandTotal: 1 })
```

---

## Reset / Re-seed the Database

If you want to start fresh, run:

```bash
npm run seed
```

The seed script automatically clears all existing data before inserting new data.

Or manually in `mongosh`:
```javascript
use azolve_db
db.dropDatabase()
```
Then run `npm run seed` again.

---

## Troubleshooting

### Error: "connect ECONNREFUSED"
MongoDB is not running. Start it with:
- Windows: `net start MongoDB`
- Mac: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongodb`

### Error: "MongoServerError: Authentication failed"
Our local MongoDB does NOT use authentication by default.
Make sure your `.env` has: `MONGODB_URI=mongodb://localhost:27017/azolve_db`
(no username/password in the URL)

### Error: "Cannot find module 'mongoose'"
You forgot to run `npm install`. Go to the `backend` folder and run:
```bash
npm install
```

### Port 3000 already in use
Kill the process using port 3000:
- Windows: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
- Mac/Linux: `lsof -ti:3000 | xargs kill -9`

### MongoDB shell not found (`mongosh`)
Older MongoDB versions use `mongo` instead of `mongosh`:
```bash
mongo
```
If neither works, MongoDB may not be in your PATH. Add it:
- Windows: Add `C:\Program Files\MongoDB\Server\7.0\bin` to System PATH
- Mac: Add to `~/.zshrc` or `~/.bash_profile`

---

## Data Summary

After seeding, your database will contain:

| Collection | Count | Description |
|---|---|---|
| companies | 1 | Azolve Technologies |
| users | 6 | 1 admin + 5 team members |
| clients | 10 | Sample business clients |
| products | 15 | Various products with pricing |
| invoices | 8 | Different statuses (draft, sent, paid, overdue) |
| leads | 12 | CRM leads at various stages |
| deals | 6 | Active and closed deals |
| projects | 4 | With milestones and progress |
| tasks | 20 | Across all projects |
| employees | 8 | HR records with salary info |
| attendance | ~40 | Clock in/out records |
| leaves | 5 | Various leave requests |
| tickets | 5 | Support tickets |
| meetings | 3 | Scheduled meetings |
| events | 8 | Calendar events |
| bankaccounts | 1 | Company bank account |
| banktransactions | 15 | Statement entries |
| notifications | 10 | System notifications |
| auditlogs | 15 | Activity logs |
| documents | 3 | Office suite documents |
| apikeys | 1 | Test API key |
