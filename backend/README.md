# 🏢 Azolve - Cloud Business Management Suite

## Enterprise-grade SaaS platform for complete business operations management

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black)](https://socket.io)

---

## 🌟 Features

### Core Modules
| Module | Features |
|--------|----------|
| **🔐 Authentication** | JWT auth, role-based access, multi-tenant, password reset, refresh tokens |
| **👥 CRM** | Client management, lead pipeline, deal tracking, activity logs, conversion |
| **💰 Finance** | Invoice management, product catalog, tax calculations, payment tracking |
| **📋 Projects** | Project management, task boards, milestones, team management, file attachments |
| **👔 HRM** | Employee records, attendance (clock in/out), leave management, department management |
| **🎫 Support** | Ticket system, SLA tracking, satisfaction ratings, internal notes |
| **📹 Meetings** | Video meetings, scheduling, participant management, recordings |
| **💬 Chat** | Real-time messaging, group chats, media sharing, reactions, typing indicators |
| **📅 Calendar** | Event management, RSVP, recurring events, reminders |
| **📊 Dashboard** | Sales analytics, HR metrics, project stats, support overview, activity feed |

### Technical Features
- **Multi-tenant architecture** - Complete data isolation per company
- **Real-time communication** - Socket.IO for chat, meetings, notifications
- **Role-based access control** - 9 roles with granular permissions
- **File upload system** - Avatars, documents, recordings, product images
- **Email notifications** - Templated emails for key events
- **API rate limiting** - Protection against abuse
- **Security hardened** - Helmet, CORS, bcrypt, JWT

---

## 🏗️ Architecture

```
azolve-backend/
├── config/
│   ├── database.js          # MongoDB connection with reconnect
│   └── constants.js         # Enums, roles, statuses, limits
├── models/                  # 16 Mongoose schemas
│   ├── User.js              # Auth, JWT, role permissions
│   ├── Company.js           # Multi-tenant, plans, settings
│   ├── Client.js            # CRM clients
│   ├── Product.js           # Product catalog
│   ├── Invoice.js           # Invoicing with auto-calc
│   ├── Lead.js              # Lead pipeline
│   ├── Deal.js              # Deal pipeline
│   ├── Project.js           # Project management
│   ├── Task.js              # Task management
│   ├── Employee.js          # HR records
│   ├── Attendance.js        # Clock in/out system
│   ├── Leave.js             # Leave management
│   ├── Ticket.js            # Support tickets
│   ├── Meeting.js           # Video meetings
│   ├── Chat.js              # Chat + Messages
│   └── Event.js             # Calendar events
├── routes/                  # 18 API route files
│   ├── auth.js              # Authentication
│   ├── users.js             # User management
│   ├── companies.js         # Company settings
│   ├── clients.js           # Client CRUD
│   ├── products.js          # Product CRUD
│   ├── invoices.js          # Invoice CRUD + email
│   ├── leads.js             # Lead CRUD + convert
│   ├── deals.js             # Deal CRUD + pipeline
│   ├── projects.js          # Project CRUD + team
│   ├── tasks.js             # Task CRUD + comments
│   ├── employees.js         # Employee CRUD
│   ├── attendance.js        # Clock in/out + breaks
│   ├── leaves.js            # Leave CRUD + approve
│   ├── tickets.js           # Ticket CRUD + SLA
│   ├── meetings.js          # Meeting CRUD + join
│   ├── chats.js             # Chat + messages
│   ├── calendar.js          # Calendar CRUD + RSVP
│   └── dashboard.js         # Analytics APIs
├── middleware/
│   ├── auth.js              # JWT protect, authorize, permissions
│   ├── validate.js          # Input validation rules
│   └── upload.js            # Multer file upload config
├── utils/
│   ├── email.js             # Nodemailer + HTML templates
│   └── helpers.js           # Pagination, search, ID generators
├── uploads/                 # File storage
├── app.js                   # Express app setup
├── server.js                # HTTP + Socket.IO server
├── package.json             # Dependencies
├── .env.example             # Environment template
├── DEPLOYMENT_GUIDE.md      # Step-by-step deployment
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)

### Installation
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/azolve-backend.git
cd azolve-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and settings

# Start development server
npm run dev
```

### Environment Variables
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/azolve_db
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📡 API Overview

### Authentication
```
POST   /api/auth/register        - Register company + admin user
POST   /api/auth/login            - Login
GET    /api/auth/me               - Get current user
POST   /api/auth/refresh          - Refresh token
POST   /api/auth/forgot-password  - Send reset email
POST   /api/auth/reset-password   - Reset password
POST   /api/auth/change-password  - Change password
POST   /api/auth/logout           - Logout
```

### CRM (Clients, Leads, Deals)
```
GET/POST       /api/clients          - List/Create clients
GET/PUT/DELETE /api/clients/:id      - Get/Update/Delete client
GET/POST       /api/leads            - List/Create leads
POST           /api/leads/:id/convert - Convert lead to deal
GET/POST       /api/deals            - List/Create deals
GET            /api/deals/pipeline    - Deal pipeline view
```

### Finance (Products, Invoices)
```
GET/POST       /api/products         - List/Create products
GET/POST       /api/invoices         - List/Create invoices
GET            /api/invoices/stats   - Invoice statistics
PUT            /api/invoices/:id/status - Update payment status
POST           /api/invoices/:id/send   - Email invoice
```

### Projects & Tasks
```
GET/POST       /api/projects         - List/Create projects
GET            /api/projects/stats   - Project statistics
GET/POST       /api/tasks            - List/Create tasks
GET            /api/tasks/my         - My assigned tasks
POST           /api/tasks/:id/comments - Add comment
```

### HR (Employees, Attendance, Leaves)
```
GET/POST       /api/employees        - List/Create employees
POST           /api/attendance/clock-in  - Clock in
POST           /api/attendance/clock-out - Clock out
GET            /api/attendance/today     - Today's attendance
GET/POST       /api/leaves           - List/Apply for leave
PUT            /api/leaves/:id/approve  - Approve leave
PUT            /api/leaves/:id/reject   - Reject leave
```

### Support Tickets
```
GET/POST       /api/tickets          - List/Create tickets
PUT            /api/tickets/:id/status  - Update status
PUT            /api/tickets/:id/assign  - Assign ticket
POST           /api/tickets/:id/comments - Add comment
```

### Meetings
```
GET/POST       /api/meetings         - List/Create meetings
PUT            /api/meetings/:id/start - Start meeting
PUT            /api/meetings/:id/join  - Join meeting
PUT            /api/meetings/:id/end   - End meeting
GET            /api/meetings/upcoming  - Upcoming meetings
```

### Chat & Messaging
```
GET/POST       /api/chats            - List/Create chats
GET            /api/chats/:id/messages - Get messages
POST           /api/chats/:id/messages - Send message
POST           /api/chats/:id/messages/media - Send media
```

### Calendar
```
GET/POST       /api/calendar         - List/Create events
GET            /api/calendar/today   - Today's events
GET            /api/calendar/upcoming - Upcoming events
PUT            /api/calendar/:id/rsvp - RSVP to event
```

### Dashboard & Analytics
```
GET  /api/dashboard          - Overview stats
GET  /api/dashboard/sales    - Sales & revenue analytics
GET  /api/dashboard/projects - Projects & tasks analytics
GET  /api/dashboard/hr       - HR & attendance analytics
GET  /api/dashboard/support  - Support & tickets analytics
GET  /api/dashboard/activity - Recent activity feed
```

---

## 🔐 Roles & Permissions

| Role | Access Level |
|------|-------------|
| `super_admin` | Full system access |
| `admin` | Full company access |
| `manager` | Manage teams and modules |
| `sales` | CRM, leads, deals, invoices |
| `hr` | Employees, attendance, leaves |
| `finance` | Invoices, products, payments |
| `support` | Tickets, chat |
| `employee` | Self-service (attendance, leaves, tasks) |
| `viewer` | Read-only access |

---

## 🔌 Real-time Events (Socket.IO)

### Chat Events
- `join_chat` / `leave_chat` - Join/leave chat room
- `chat_message` - New message
- `typing` / `stop_typing` - Typing indicators

### Meeting Events
- `join_meeting` / `leave_meeting` - Join/leave meeting
- `meeting_signal` - WebRTC signaling

### System Events
- `notification` - Push notifications
- `user_online` / `user_offline` - Online status

---

## 📦 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

**Quick summary:**
1. **MongoDB Atlas** (Free) → Database
2. **Render.com** (Free) → Backend API
3. **GoDaddy cPanel** → Frontend (azolve.io)

---

## 🛡️ Security

- JWT authentication with refresh tokens
- bcrypt password hashing (12 salt rounds)
- Rate limiting (100 requests/15 min)
- Helmet security headers
- CORS protection
- Input validation & sanitization
- File upload size limits & type filtering
- Multi-tenant data isolation

---

## 📊 Database Stats

- **16 Collections** (models)
- **18 Route files** with 100+ endpoints
- **9 User roles** with granular permissions
- **5 Email templates** for notifications
- **Real-time** chat, meetings, notifications

---

## License

Proprietary - Azolve © 2024. All rights reserved.