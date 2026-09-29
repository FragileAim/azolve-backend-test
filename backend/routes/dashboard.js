const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Ticket = require('../models/Ticket');
const Meeting = require('../models/Meeting');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

// GET /api/dashboard - Main dashboard overview
router.get('/', protect, async (req, res) => {
  try {
    const c = req.companyId;

    const [
      totalClients,
      totalProducts,
      totalLeads,
      totalDeals,
      totalProjects,
      totalTasks,
      totalEmployees,
      totalTickets,
    ] = await Promise.all([
      Client.countDocuments({ company: c, status: 'active' }),
      Product.countDocuments({ company: c, isActive: true }),
      Lead.countDocuments({ company: c }),
      Deal.countDocuments({ company: c }),
      Project.countDocuments({ company: c }),
      Task.countDocuments({ company: c }),
      Employee.countDocuments({ company: c, status: 'active' }),
      Ticket.countDocuments({ company: c }),
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        totalProducts,
        totalLeads,
        totalDeals,
        totalProjects,
        totalTasks,
        totalEmployees,
        totalTickets,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/sales - Sales & Revenue dashboard
router.get('/sales', protect, async (req, res) => {
  try {
    const c = req.companyId;

    // Invoice stats
    const invoiceStats = await Invoice.aggregate([
      { $match: { company: c } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$grandTotal' },
        },
      },
    ]);

    // Total revenue (paid invoices)
    const paidInvoices = invoiceStats.find(s => s._id === 'paid');
    const totalRevenue = paidInvoices ? paidInvoices.total : 0;

    // Outstanding balance
    const outstanding = await Invoice.aggregate([
      { $match: { company: c, status: { $in: ['sent', 'overdue', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$balanceDue' } } },
    ]);

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyRevenue = await Invoice.aggregate([
      { $match: { company: c, status: 'paid', paidDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } },
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Deal pipeline
    const dealPipeline = await Deal.aggregate([
      { $match: { company: c, status: { $ne: 'lost' } } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    // Lead conversion stats
    const totalLeads = await Lead.countDocuments({ company: c });
    const convertedLeads = await Lead.countDocuments({ company: c, status: 'converted' });
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Top clients by revenue
    const topClients = await Invoice.aggregate([
      { $match: { company: c, status: 'paid' } },
      { $group: { _id: '$client', totalRevenue: { $sum: '$grandTotal' }, invoiceCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      { $project: { clientName: '$client.name', totalRevenue: 1, invoiceCount: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue,
        outstandingBalance: outstanding[0]?.total || 0,
        invoiceStats,
        monthlyRevenue,
        dealPipeline,
        conversionRate: parseFloat(conversionRate),
        topClients,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/projects - Projects & Tasks dashboard
router.get('/projects', protect, async (req, res) => {
  try {
    const c = req.companyId;

    // Project status breakdown
    const projectStatuses = await Project.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Task status breakdown
    const taskStatuses = await Task.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      company: c,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: new Date() },
    });

    // Tasks completed this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const completedThisWeek = await Task.countDocuments({
      company: c,
      status: 'completed',
      completedDate: { $gte: weekStart },
    });

    // Task distribution by assignee (top 10)
    const tasksByAssignee = await Task.aggregate([
      { $match: { company: c, status: { $nin: ['completed', 'cancelled'] } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', count: 1 } },
    ]);

    // Recent projects
    const recentProjects = await Project.find({ company: c })
      .sort('-updatedAt')
      .limit(5)
      .select('name status progress budget deadline')
      .populate('manager', 'name avatar');

    res.json({
      success: true,
      data: {
        projectStatuses,
        taskStatuses,
        overdueTasks,
        completedThisWeek,
        tasksByAssignee,
        recentProjects,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/hr - HR Dashboard
router.get('/hr', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const c = req.companyId;

    // Employee stats
    const totalEmployees = await Employee.countDocuments({ company: c, status: 'active' });

    const departments = await Employee.aggregate([
      { $match: { company: c, status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      company: c,
      date: { $gte: today, $lt: tomorrow },
    });

    const present = todayAttendance.filter(a => ['present', 'late', 'work_from_home'].includes(a.status)).length;
    const late = todayAttendance.filter(a => a.status === 'late').length;
    const wfh = todayAttendance.filter(a => a.status === 'work_from_home').length;
    const absent = totalEmployees - present;

    // Pending leaves
    const pendingLeaves = await Leave.countDocuments({ company: c, status: 'pending' });

    // Leaves this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const leavesThisMonth = await Leave.countDocuments({
      company: c,
      status: 'approved',
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart },
    });

    // New joiners this month
    const newJoiners = await Employee.countDocuments({
      company: c,
      joiningDate: { $gte: monthStart, $lte: monthEnd },
    });

    // Employment types
    const empTypes = await Employee.aggregate([
      { $match: { company: c, status: 'active' } },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        departments,
        attendance: { present, absent, late, wfh, total: totalEmployees },
        pendingLeaves,
        leavesThisMonth,
        newJoiners,
        employmentTypes: empTypes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/support - Support Dashboard
router.get('/support', protect, async (req, res) => {
  try {
    const c = req.companyId;

    const open = await Ticket.countDocuments({ company: c, status: 'open' });
    const inProgress = await Ticket.countDocuments({ company: c, status: 'in_progress' });
    const resolved = await Ticket.countDocuments({ company: c, status: 'resolved' });
    const total = await Ticket.countDocuments({ company: c });

    // By priority
    const byPriority = await Ticket.aggregate([
      { $match: { company: c, status: { $nin: ['resolved', 'closed'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Average resolution time (in hours)
    const avgResolution = await Ticket.aggregate([
      { $match: { company: c, resolvedDate: { $exists: true }, createdAt: { $exists: true } } },
      {
        $project: {
          resolutionHours: {
            $divide: [{ $subtract: ['$resolvedDate', '$createdAt'] }, 3600000],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$resolutionHours' } } },
    ]);

    // SLA breached
    const slaBreached = await Ticket.countDocuments({
      company: c,
      slaBreached: true,
      status: { $nin: ['resolved', 'closed'] },
    });

    // Average satisfaction
    const avgSat = await Ticket.aggregate([
      { $match: { company: c, satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$satisfaction' } } },
    ]);

    // Recent tickets
    const recentTickets = await Ticket.find({ company: c })
      .sort('-createdAt')
      .limit(5)
      .select('ticketNumber subject status priority category createdAt')
      .populate('assignedTo', 'name avatar');

    res.json({
      success: true,
      data: {
        open, inProgress, resolved, total, slaBreached,
        byPriority,
        avgResolutionHours: avgResolution[0]?.avg ? parseFloat(avgResolution[0].avg.toFixed(1)) : 0,
        avgSatisfaction: avgSat[0]?.avg ? parseFloat(avgSat[0].avg.toFixed(1)) : 0,
        recentTickets,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/activity - Recent Activity Feed
router.get('/activity', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const limit = parseInt(req.query.limit) || 20;

    // Gather recent activity from various models
    const [recentInvoices, recentDeals, recentTasks, recentTickets, recentMeetings] = await Promise.all([
      Invoice.find({ company: c }).sort('-createdAt').limit(5).select('invoiceNumber client grandTotal status createdAt').populate('client', 'name'),
      Deal.find({ company: c }).sort('-updatedAt').limit(5).select('title value stage status updatedAt').populate('assignedTo', 'name'),
      Task.find({ company: c }).sort('-updatedAt').limit(5).select('title status priority assignedTo updatedAt').populate('assignedTo', 'name'),
      Ticket.find({ company: c }).sort('-updatedAt').limit(5).select('ticketNumber subject status priority updatedAt').populate('assignedTo', 'name'),
      Meeting.find({ company: c }).sort('-createdAt').limit(5).select('title status scheduledTime host createdAt').populate('host', 'name'),
    ]);

    // Merge and sort all activities
    const activities = [];

    recentInvoices.forEach(i => {
      activities.push({
        type: 'invoice',
        title: `Invoice ${i.invoiceNumber}`,
        description: `${i.client?.name || 'Unknown'} - $${i.grandTotal}`,
        status: i.status,
        timestamp: i.createdAt,
      });
    });

    recentDeals.forEach(d => {
      activities.push({
        type: 'deal',
        title: d.title,
        description: `$${d.value} - ${d.stage}`,
        status: d.status,
        user: d.assignedTo?.name,
        timestamp: d.updatedAt,
      });
    });

    recentTasks.forEach(t => {
      activities.push({
        type: 'task',
        title: t.title,
        description: `${t.priority} priority`,
        status: t.status,
        user: t.assignedTo?.name,
        timestamp: t.updatedAt,
      });
    });

    recentTickets.forEach(t => {
      activities.push({
        type: 'ticket',
        title: `${t.ticketNumber}: ${t.subject}`,
        description: `${t.priority} priority`,
        status: t.status,
        user: t.assignedTo?.name,
        timestamp: t.updatedAt,
      });
    });

    recentMeetings.forEach(m => {
      activities.push({
        type: 'meeting',
        title: m.title,
        description: `Hosted by ${m.host?.name || 'Unknown'}`,
        status: m.status,
        timestamp: m.createdAt,
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: activities.slice(0, limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;