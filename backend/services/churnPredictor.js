/**
 * Predictive Churn Service
 * ML-lite scoring engine — analyzes client behavior to predict churn risk
 *
 * Factors (weighted):
 *  - Days since last invoice (30%)
 *  - Days since last contact (20%)
 *  - Payment delay trend (20%)
 *  - Invoice frequency drop (15%)
 *  - Support ticket trend (10%)
 *  - Engagement score (5%)
 */
const mongoose = require('mongoose');

class ChurnPredictor {
  /**
   * Calculate churn risk for a single client
   * Returns score 0-100 (higher = more likely to churn)
   */
  async calculateChurnScore(client, companyId) {
    const Invoice = require('../models/Invoice');
    const Ticket = require('../models/Ticket');
    const now = new Date();

    // Get last 12 months of data
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [allInvoices, recentInvoices, oldInvoices, recentTickets, oldTickets] = await Promise.all([
      Invoice.find({ company: companyId, clientId: client._id, createdAt: { $gte: oneYearAgo } }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ company: companyId, clientId: client._id, createdAt: { $gte: threeMonthsAgo } }).lean(),
      Invoice.find({ company: companyId, clientId: client._id, createdAt: { $gte: sixMonthsAgo, $lt: threeMonthsAgo } }).lean(),
      Ticket.find({ company: companyId, clientId: client._id, createdAt: { $gte: threeMonthsAgo } }).lean().catch(() => []),
      Ticket.find({ company: companyId, clientId: client._id, createdAt: { $gte: sixMonthsAgo, $lt: threeMonthsAgo } }).lean().catch(() => []),
    ]);

    const factors = {};
    let score = 0;
    const reasons = [];

    // Factor 1: Days since last invoice (weight: 30)
    if (allInvoices.length === 0) {
      factors.daysSinceLastInvoice = { value: 999, score: 30, weight: 30 };
      score += 30;
      reasons.push('No invoices ever issued');
    } else {
      const daysSince = Math.floor((now - new Date(allInvoices[0].createdAt)) / (24 * 60 * 60 * 1000));
      factors.daysSinceLastInvoice = { value: daysSince };
      if (daysSince > 90) {
        factors.daysSinceLastInvoice.score = 30;
        score += 30;
        reasons.push(`No invoice in ${daysSince} days`);
      } else if (daysSince > 60) {
        factors.daysSinceLastInvoice.score = 20;
        score += 20;
        reasons.push(`Last invoice ${daysSince} days ago`);
      } else if (daysSince > 30) {
        factors.daysSinceLastInvoice.score = 10;
        score += 10;
      } else {
        factors.daysSinceLastInvoice.score = 0;
      }
      factors.daysSinceLastInvoice.weight = 30;
    }

    // Factor 2: Invoice frequency drop (weight: 15)
    const recentCount = recentInvoices.length;
    const oldCount = oldInvoices.length;
    if (oldCount > 0) {
      const dropPercent = ((oldCount - recentCount) / oldCount) * 100;
      factors.invoiceDropPercent = { value: Math.round(dropPercent), weight: 15 };
      if (dropPercent > 70) {
        factors.invoiceDropPercent.score = 15;
        score += 15;
        reasons.push(`${Math.round(dropPercent)}% drop in invoice frequency`);
      } else if (dropPercent > 40) {
        factors.invoiceDropPercent.score = 10;
        score += 10;
        reasons.push(`Declining invoice frequency`);
      } else if (dropPercent > 20) {
        factors.invoiceDropPercent.score = 5;
        score += 5;
      } else {
        factors.invoiceDropPercent.score = 0;
      }
    } else {
      factors.invoiceDropPercent = { value: 0, score: 0, weight: 15 };
    }

    // Factor 3: Payment delay (weight: 20)
    const paidInvoices = allInvoices.filter(i => i.status === 'paid' && i.paidDate && i.dueDate);
    if (paidInvoices.length > 0) {
      const avgDelay = paidInvoices.reduce((sum, i) => {
        const delay = (new Date(i.paidDate) - new Date(i.dueDate)) / (24 * 60 * 60 * 1000);
        return sum + Math.max(0, delay);
      }, 0) / paidInvoices.length;

      factors.avgPaymentDelay = { value: Math.round(avgDelay), weight: 20 };
      if (avgDelay > 30) {
        factors.avgPaymentDelay.score = 20;
        score += 20;
        reasons.push(`Avg payment delay: ${Math.round(avgDelay)} days`);
      } else if (avgDelay > 15) {
        factors.avgPaymentDelay.score = 12;
        score += 12;
        reasons.push(`Slow payments (avg ${Math.round(avgDelay)} days late)`);
      } else if (avgDelay > 7) {
        factors.avgPaymentDelay.score = 6;
        score += 6;
      } else {
        factors.avgPaymentDelay.score = 0;
      }
    } else {
      factors.avgPaymentDelay = { value: 0, score: 0, weight: 20 };
    }

    // Factor 4: Outstanding overdue invoices (weight: 20)
    const overdue = allInvoices.filter(i => i.status !== 'paid' && i.dueDate && new Date(i.dueDate) < now);
    factors.overdueInvoices = { value: overdue.length, weight: 20 };
    if (overdue.length >= 3) {
      factors.overdueInvoices.score = 20;
      score += 20;
      reasons.push(`${overdue.length} overdue invoices`);
    } else if (overdue.length === 2) {
      factors.overdueInvoices.score = 12;
      score += 12;
      reasons.push('2 overdue invoices');
    } else if (overdue.length === 1) {
      factors.overdueInvoices.score = 6;
      score += 6;
    } else {
      factors.overdueInvoices.score = 0;
    }

    // Factor 5: Support ticket trend (weight: 10)
    if (recentTickets.length > oldTickets.length * 2 && recentTickets.length >= 3) {
      factors.supportTickets = { value: recentTickets.length, score: 10, weight: 10 };
      score += 10;
      reasons.push(`Support tickets increased (${recentTickets.length} recent vs ${oldTickets.length} prior)`);
    } else if (recentTickets.length === 0 && oldTickets.length > 0) {
      // Silent customer — might be disengaged
      factors.supportTickets = { value: 0, score: 5, weight: 10 };
      score += 5;
      reasons.push('Silent — no recent support contact');
    } else {
      factors.supportTickets = { value: recentTickets.length, score: 0, weight: 10 };
    }

    // Factor 6: Engagement (weight: 5) — last contact / activity
    const daysSinceContact = client.lastContactedAt
      ? Math.floor((now - new Date(client.lastContactedAt)) / (24 * 60 * 60 * 1000))
      : 999;
    factors.daysSinceContact = { value: daysSinceContact, weight: 5 };
    if (daysSinceContact > 60) {
      factors.daysSinceContact.score = 5;
      score += 5;
      reasons.push(`No contact in ${daysSinceContact > 365 ? '1+ year' : `${daysSinceContact} days`}`);
    } else {
      factors.daysSinceContact.score = 0;
    }

    // Cap at 100
    score = Math.min(100, Math.round(score));

    // Determine risk tier
    let tier, color, label;
    if (score >= 70) {
      tier = 'critical';
      color = '#ef4444';
      label = 'High Risk';
    } else if (score >= 50) {
      tier = 'high';
      color = '#f97316';
      label = 'Medium-High Risk';
    } else if (score >= 30) {
      tier = 'medium';
      color = '#eab308';
      label = 'Medium Risk';
    } else if (score >= 15) {
      tier = 'low';
      color = '#84cc16';
      label = 'Low Risk';
    } else {
      tier = 'healthy';
      color = '#22c55e';
      label = 'Healthy';
    }

    // Generate recommended actions
    const recommendations = this.getRecommendations(score, factors, reasons);

    return {
      clientId: client._id,
      clientName: client.name,
      score,
      tier,
      label,
      color,
      reasons,
      factors,
      recommendations,
      lastInvoiceDate: allInvoices[0]?.createdAt || null,
      totalInvoices: allInvoices.length,
      totalRevenue: allInvoices.reduce((s, i) => s + (i.total || 0), 0),
      calculatedAt: new Date(),
    };
  }

  /**
   * Get recommended actions based on risk factors
   */
  getRecommendations(score, factors, reasons) {
    const recs = [];

    if (factors.daysSinceLastInvoice?.value > 60) {
      recs.push({ priority: 'high', action: 'Schedule a check-in call this week', icon: '📞' });
    }
    if (factors.overdueInvoices?.value > 0) {
      recs.push({ priority: 'high', action: `Follow up on ${factors.overdueInvoices.value} overdue invoice${factors.overdueInvoices.value > 1 ? 's' : ''}`, icon: '💰' });
    }
    if (factors.avgPaymentDelay?.value > 15) {
      recs.push({ priority: 'medium', action: 'Discuss payment terms — offer early-payment discount', icon: '🤝' });
    }
    if (factors.invoiceDropPercent?.value > 40) {
      recs.push({ priority: 'high', action: 'Investigate why orders are dropping — propose new solutions', icon: '🔍' });
    }
    if (factors.supportTickets?.score > 5) {
      recs.push({ priority: 'high', action: 'Review recent support tickets — escalate unresolved issues', icon: '🎫' });
    }
    if (factors.daysSinceContact?.value > 60) {
      recs.push({ priority: 'medium', action: 'Send a personalized re-engagement email', icon: '📧' });
    }
    if (score < 15) {
      recs.push({ priority: 'low', action: 'Healthy client — maintain regular touchpoints', icon: '✅' });
    }
    return recs;
  }

  /**
   * Calculate churn for ALL clients in a company
   */
  async calculateAllClients(companyId) {
    const Client = require('../models/Client');
    const clients = await Client.find({ companyId }).lean();

    const results = await Promise.all(
      clients.map(c => this.calculateChurnScore(c, companyId))
    );

    // Sort by risk score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Stats
    const stats = {
      total: results.length,
      critical: results.filter(r => r.tier === 'critical').length,
      high: results.filter(r => r.tier === 'high').length,
      medium: results.filter(r => r.tier === 'medium').length,
      low: results.filter(r => r.tier === 'low').length,
      healthy: results.filter(r => r.tier === 'healthy').length,
      revenueAtRisk: results
        .filter(r => r.score >= 50)
        .reduce((s, r) => s + r.totalRevenue, 0),
    };

    return { results, stats };
  }
}

module.exports = new ChurnPredictor();
