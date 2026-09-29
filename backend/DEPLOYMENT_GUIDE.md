# 🚀 Azolve Cloud - Complete Deployment Guide

## Architecture Overview

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   GoDaddy cPanel │     │   Render.com     │     │  MongoDB Atlas   │
│   (Frontend)     │────▶│   (Backend API)  │────▶│  (Database)      │
│   azolve.io       │     │   Free Tier      │     │  Free 512MB      │
│   HTML/CSS/JS    │     │   Node.js API    │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Step 1: Create MongoDB Atlas Account (5 minutes)

### 1.1 Sign Up
1. Go to **https://www.mongodb.com/atlas/database**
2. Click **"Try Free"**
3. Sign up with Google or Email
4. Choose **FREE** tier (M0 Sandbox)

### 1.2 Create Cluster
1. Select **Shared** (Free)
2. Cloud Provider: **AWS**
3. Region: Choose closest to your users (e.g., Mumbai for India)
4. Cluster Name: `azolve-cluster`
5. Click **"Create Cluster"** (takes 1-3 minutes)

### 1.3 Setup Database Access
1. Go to **Database Access** → **Add New Database User**
2. Authentication: **Password**
3. Username: `azolve_admin`
4. Password: Click **Auto Generate Secure Password** → **COPY THIS PASSWORD!**
5. Database User Privileges: **Atlas Admin**
6. Click **"Add User"**

### 1.4 Setup Network Access
1. Go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is needed for Render.com to connect
3. Click **"Confirm"**

### 1.5 Get Connection String
1. Go to **Database** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js** / Version: **5.5 or later**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://azolve_admin:<password>@azolve-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the password you copied earlier
6. Add database name before `?`: 
   ```
   mongodb+srv://azolve_admin:YOUR_PASSWORD@azolve-cluster.xxxxx.mongodb.net/azolve_db?retryWrites=true&w=majority
   ```

**📌 Save this connection string - you'll need it for Render.com!**

---

## Step 2: Deploy Backend on Render.com (10 minutes)

### 2.1 Push Code to GitHub
1. Create a **new repository** on GitHub: `azolve-backend`
2. Upload the `azolve-backend/` folder to GitHub:

```bash
cd azolve-backend
git init
git add .
git commit -m "Initial Azolve backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/azolve-backend.git
git push -u origin main
```

**Or use GitHub's web UI:**
1. Go to github.com → New Repository → `azolve-backend`
2. Upload all files from the `azolve-backend` folder

### 2.2 Sign Up on Render.com
1. Go to **https://render.com**
2. Sign up with **GitHub** (recommended for easy deployment)

### 2.3 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your `azolve-backend` GitHub repository
3. Configure:
   - **Name:** `azolve-api`
   - **Region:** Oregon (or closest to users)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** **Free** ✅

### 2.4 Set Environment Variables
Click **"Advanced"** → **"Add Environment Variable"** and add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | `mongodb+srv://architashah28_db_user:Abhishek100.@azolvedb.15jbmpy.mongodb.net/azolve_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | `azolve_jwt_secret_2024_xK9mP2nQ7rT4wY6z` (change this!) |
| `JWT_EXPIRE` | `7d` |
| `JWT_REFRESH_EXPIRE` | `30d` |
| `FRONTEND_URL` | `https://azolve.io` |
| `SMTP_HOST` | `smtp.gmail.com` (or your email provider) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-app-password` |
| `FROM_EMAIL` | `noreply@azolve.io` |
| `FROM_NAME` | `Azolve` |

### 2.5 Deploy
1. Click **"Create Web Service"**
2. Wait for build & deployment (3-5 minutes)
3. Your API will be live at: `https://azolve-api.onrender.com`

### 2.6 Verify Deployment
Open in browser: `https://azolve-api.onrender.com/api/auth/me`
- You should see: `{"success": false, "message": "Not authorized..."}`
- This means the API is running! ✅

**⚠️ Note:** Free tier on Render spins down after 15 min of inactivity. First request after sleep takes ~30 seconds.

---

## Step 3: Setup Email (Gmail App Password)

### For Gmail:
1. Go to **https://myaccount.google.com/apppasswords**
2. You need **2-Factor Authentication** enabled first
3. App: Select **"Mail"**
4. Device: Select **"Other"** → Type `Azolve`
5. Click **"Generate"**
6. Copy the 16-character password
7. Use this as `SMTP_PASS` in Render environment variables

### For Custom Domain Email:
If you have email@azolve.io, use your domain's SMTP settings instead.

---

## Step 4: Update Frontend & Deploy to GoDaddy (10 minutes)

### 4.1 Update API URL in Frontend
1. Open `js/api-config.js`
2. Update `BASE_URL` to your Render.com URL:
   ```javascript
   BASE_URL: 'https://azolve-api.onrender.com',
   ```

### 4.2 Add api-config.js to HTML Pages
Add this script tag to ALL HTML pages (before other JS files):
```html
<script src="js/api-config.js"></script>
```

### 4.3 Upload to GoDaddy cPanel
1. Login to GoDaddy → **My Products** → **Web Hosting** → **Manage**
2. Open **cPanel** → **File Manager**
3. Navigate to `public_html/`
4. Delete existing files (if any) or create subdirectory
5. Upload all files from `deploy-package/` folder:
   - All `.html` files go in root (`public_html/`)
   - `js/` folder with all JavaScript files
   - `css/` folder with all CSS files
   - `assets/` folder with images
   - `apps/` folder with sub-modules
6. Ensure `index.html` is the main entry point

### 4.4 Setup Domain (if not already done)
1. In GoDaddy → **DNS Management** for `azolve.io`
2. Ensure `A Record` points to your hosting IP
3. `CNAME` for `www` points to `azolve.io`

---

## Step 5: Test Everything

### 5.1 Test Registration
1. Go to `https://azolve.io/login.html`
2. Click **"Sign Up"**
3. Fill in: Company Name, Name, Email, Password
4. Should redirect to dashboard

### 5.2 Test Login
1. Go to `https://azolve.io/login.html`
2. Enter email and password
3. Should redirect to dashboard with real data

### 5.3 Test API Endpoints
Using browser or Postman:
```
POST https://azolve-api.onrender.com/api/auth/register
Body: {
  "companyName": "Test Company",
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "Test@12345"
}
```

### 5.4 Test Socket.IO
1. Open dashboard
2. Check browser console for: `🔌 Socket connected`
3. Open chat module - real-time messaging should work

---

## 📋 Quick Reference

### API Endpoints Summary
| Module | Base URL | Methods |
|--------|----------|---------|
| Auth | `/api/auth` | register, login, logout, me, refresh, forgot-password, reset-password |
| Users | `/api/users` | CRUD + avatar |
| Company | `/api/companies` | get/update company info |
| Clients | `/api/clients` | Full CRUD |
| Products | `/api/products` | CRUD + categories |
| Invoices | `/api/invoices` | CRUD + stats, status, send email |
| Leads | `/api/leads` | CRUD + stats, activity, convert |
| Deals | `/api/deals` | CRUD + stats, pipeline |
| Projects | `/api/projects` | CRUD + stats, attachments, team |
| Tasks | `/api/tasks` | CRUD + comments, checklist, attachments |
| Employees | `/api/employees` | CRUD + stats, departments |
| Attendance | `/api/attendance` | clock-in/out, breaks, stats |
| Leaves | `/api/leaves` | CRUD + approve/reject, balance |
| Tickets | `/api/tickets` | CRUD + comments, assign, satisfaction |
| Meetings | `/api/meetings` | CRUD + join/leave, start/end, recording |
| Chats | `/api/chats` | CRUD + messages, media, reactions |
| Calendar | `/api/calendar` | CRUD + RSVP, recurring |
| Dashboard | `/api/dashboard` | overview, sales, projects, hr, support, activity |

### Free Tier Limits
| Service | Limit |
|---------|-------|
| MongoDB Atlas | 512 MB storage, shared RAM |
| Render.com | 750 hours/month, sleeps after 15 min inactivity |
| GoDaddy Hosting | As per your Deluxe plan |

### Scaling Later (When Needed)
- **MongoDB Atlas:** M10 ($57/month) for 10GB + dedicated resources
- **Render.com:** Starter ($7/month) for always-on + more RAM
- **Both scale smoothly** without code changes

---

## 🔒 Security Checklist
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use Gmail App Password (not your main password)
- [ ] Enable HTTPS on your domain (GoDaddy usually provides this)
- [ ] Test CORS is working (only your domain can access API)
- [ ] Never commit `.env` file to GitHub
- [ ] Use the `.env.example` as a template

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check MongoDB Atlas connection string is correct
- Check IP whitelist includes 0.0.0.0/0
- Check username and password are correct

### "CORS error in browser"
- Check `FRONTEND_URL` in Render env matches your domain exactly
- Include `https://` in the URL

### "API returns 401 Unauthorized"
- Token expired - login again
- Check `Authorization: Bearer <token>` header

### "Render service sleeping"
- Free tier sleeps after 15 min - first request takes ~30 seconds
- Consider upgrading to Starter ($7/month) for always-on

### "Socket.IO not connecting"
- Check browser console for errors
- Ensure Socket.IO CDN script loads before api-config.js
- Check CORS settings allow WebSocket connections

---

## 📞 Support
For any issues, check:
1. Render.com dashboard → Logs
2. MongoDB Atlas → Monitoring
3. Browser Console → Network tab