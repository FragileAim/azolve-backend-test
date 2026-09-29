/**
 * Notification Service — create + emit via Socket.IO
 */
const Notification = require('../models/Notification');

class NotificationService {
  setIo(io) { this.io = io; }

  async create(data) {
    const payload = { ...data, companyId: data.companyId || data.company };
    const notif = await Notification.create(payload);
    if (this.io) {
      const room = payload.userId ? `user:${payload.userId}` : `company:${payload.companyId}`;
      this.io.to(room).emit('notification:new', notif);
    }
    return notif;
  }

  async createMany(items) {
    const payloads = items.map(item => ({ ...item, companyId: item.companyId || item.company }));
    const docs = await Notification.insertMany(payloads);
    if (this.io) {
      docs.forEach(n => {
        const room = n.userId ? `user:${n.userId}` : `company:${n.companyId}`;
        this.io.to(room).emit('notification:new', n);
      });
    }
    return docs;
  }

  // Convenience helpers
  invoicePaid(companyId, userId, invoice) {
    return this.create({ company: companyId, userId, type: 'payment', icon: '💰', priority: 'normal',
      title: 'Payment received',
      message: `Invoice ${invoice.invoiceNumber} paid — ₹${invoice.totalAmount || invoice.amount}`,
      resource: 'invoice', resourceId: invoice._id,
      url: `/invoices/${invoice._id}`,
    });
  }

  invoiceOverdue(companyId, userId, invoice) {
    return this.create({ company: companyId, userId, type: 'warning', icon: '⏰', priority: 'high',
      title: 'Invoice overdue',
      message: `${invoice.invoiceNumber} is overdue. Send a reminder?`,
      resource: 'invoice', resourceId: invoice._id, url: `/invoices/${invoice._id}`,
      actions: [
        { label: 'Send reminder', url: `/invoices/${invoice._id}?action=remind`, style: 'primary' },
        { label: 'View', url: `/invoices/${invoice._id}` },
      ],
    });
  }

  newLead(companyId, userId, lead) {
    return this.create({ company: companyId, userId, type: 'lead', icon: '🎯', priority: 'normal',
      title: 'New lead', message: `${lead.name} from ${lead.company || 'unknown'}`,
      resource: 'lead', resourceId: lead._id, url: `/leads/${lead._id}`,
    });
  }

  taskAssigned(companyId, userId, task) {
    return this.create({ company: companyId, userId, type: 'task', icon: '📋', priority: 'normal',
      title: 'Task assigned to you', message: task.title,
      resource: 'task', resourceId: task._id, url: `/tasks/${task._id}`,
    });
  }

  churnRisk(companyId, userId, client, score) {
    return this.create({ company: companyId, userId, type: 'churn', icon: '⚠️', priority: 'high',
      title: 'Client at high churn risk',
      message: `${client.name} risk score: ${score}/100`,
      resource: 'client', resourceId: client._id, url: `/clients/${client._id}`,
    });
  }

  lowStock(companyId, product) {
    return this.create({ company: companyId, type: 'warning', icon: '📦', priority: 'high',
      title: 'Low stock alert',
      message: `${product.name} — only ${product.stock} left`,
      resource: 'product', resourceId: product._id, url: `/products/${product._id}`,
    });
  }

  system(companyId, message, opts = {}) {
    return this.create({ company: companyId, type: 'system', icon: '⚙️', priority: 'normal',
      title: opts.title || 'System notification', message, ...opts,
    });
  }
}

module.exports = new NotificationService();
