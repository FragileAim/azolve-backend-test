/**
 * Workflow Engine - Executes user-defined automations
 *
 * Trigger → Steps → Actions
 *
 * Supports: invoice events, lead events, scheduled triggers, conditions, delays
 */
const Workflow = require('../models/Workflow');

class WorkflowEngine {
  constructor() {
    this.actionHandlers = {};
    this.registerDefaultActions();
  }

  // ============== ACTION REGISTRATION ==============

  registerAction(name, handler) {
    this.actionHandlers[name] = handler;
  }

  registerDefaultActions() {
    // Send Email
    this.registerAction('send_email', async (config, context) => {
      const { to, subject, body } = config;
      const resolvedTo = this.resolveTemplate(to, context);
      const resolvedSubject = this.resolveTemplate(subject, context);
      const resolvedBody = this.resolveTemplate(body, context);
      console.log(`[Workflow] Send email to ${resolvedTo}: ${resolvedSubject}`);
      // TODO: Actual email sending via Brevo
      return { sent: true, to: resolvedTo };
    });

    // Send WhatsApp
    this.registerAction('send_whatsapp', async (config, context) => {
      const phone = this.resolveTemplate(config.phone, context);
      const message = this.resolveTemplate(config.message, context);
      console.log(`[Workflow] Send WhatsApp to ${phone}: ${message}`);
      return { sent: true, phone };
    });

    // Send SMS
    this.registerAction('send_sms', async (config, context) => {
      const phone = this.resolveTemplate(config.phone, context);
      const message = this.resolveTemplate(config.message, context);
      console.log(`[Workflow] Send SMS to ${phone}: ${message}`);
      return { sent: true, phone };
    });

    // HTTP Webhook
    this.registerAction('webhook', async (config, context) => {
      const url = this.resolveTemplate(config.url, context);
      const body = this.resolveObject(config.body, context);
      const fetch = (await import('node-fetch')).default || global.fetch;
      try {
        const res = await fetch(url, {
          method: config.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
          body: JSON.stringify(body),
        });
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { error: e.message };
      }
    });

    // Create Task
    this.registerAction('create_task', async (config, context) => {
      try {
        const Task = require('../models/Task');
        const task = await Task.create({
          companyId: context.companyId,
          title: this.resolveTemplate(config.title, context),
          description: this.resolveTemplate(config.description, context),
          assigneeId: config.assigneeId,
          dueDate: config.dueDate,
          status: 'todo',
        });
        return { taskId: task._id };
      } catch (e) {
        return { error: e.message };
      }
    });

    // Update Field
    this.registerAction('update_field', async (config, context) => {
      // Updates a field on the trigger record
      console.log(`[Workflow] Update ${config.field} = ${config.value}`);
      return { updated: true };
    });

    // Wait/Delay
    this.registerAction('delay', async (config, context) => {
      const ms = (config.minutes || 0) * 60000 + (config.hours || 0) * 3600000 + (config.days || 0) * 86400000;
      // For long delays, we should schedule with a queue (BullMQ/Agenda)
      // For demo, just store the scheduled time
      return { scheduledAt: new Date(Date.now() + ms) };
    });

    // Condition (if/else)
    this.registerAction('condition', async (config, context) => {
      const value = this.resolveTemplate(config.field, context);
      const target = config.value;
      const op = config.operator || 'equals';
      let match = false;

      switch (op) {
        case 'equals': match = value == target; break;
        case 'not_equals': match = value != target; break;
        case 'greater_than': match = parseFloat(value) > parseFloat(target); break;
        case 'less_than': match = parseFloat(value) < parseFloat(target); break;
        case 'contains': match = String(value).includes(String(target)); break;
        case 'is_empty': match = !value; break;
      }
      return { match };
    });
  }

  // ============== TEMPLATE RESOLUTION ==============

  resolveTemplate(template, context) {
    if (!template || typeof template !== 'string') return template;
    // Replaces {{trigger.field}} with values from context
    return template.replace(/\{\{([^}]+)\}\}/g, (m, path) => {
      return this.getPath(context, path.trim()) ?? m;
    });
  }

  resolveObject(obj, context) {
    if (!obj) return obj;
    if (typeof obj === 'string') return this.resolveTemplate(obj, context);
    if (Array.isArray(obj)) return obj.map(o => this.resolveObject(o, context));
    if (typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = this.resolveObject(v, context);
      return out;
    }
    return obj;
  }

  getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  // ============== EXECUTION ==============

  /**
   * Execute a workflow given trigger data
   */
  async execute(workflow, triggerData) {
    const startTime = Date.now();
    const context = {
      trigger: triggerData,
      companyId: workflow.companyId,
      workflowId: workflow._id,
      results: {},
    };

    const log = [];

    try {
      // Find trigger step
      const triggerStep = workflow.steps.find(s => s.type === 'trigger');
      if (!triggerStep) throw new Error('No trigger step found');

      // Execute next steps
      const queue = [...(triggerStep.next || [])];
      const visited = new Set();

      while (queue.length > 0) {
        const stepId = queue.shift();
        if (visited.has(stepId)) continue;
        visited.add(stepId);

        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) continue;

        const stepStart = Date.now();
        try {
          if (step.type === 'action') {
            const handler = this.actionHandlers[step.operation];
            if (handler) {
              const result = await handler(step.config, context);
              context.results[step.id] = result;
              log.push({ stepId: step.id, type: step.type, op: step.operation, success: true, result, duration: Date.now() - stepStart });
              queue.push(...(step.next || []));
            } else {
              log.push({ stepId: step.id, success: false, error: `No handler for ${step.operation}` });
            }
          } else if (step.type === 'condition') {
            const handler = this.actionHandlers['condition'];
            const result = await handler(step.config, context);
            context.results[step.id] = result;
            log.push({ stepId: step.id, type: 'condition', match: result.match, duration: Date.now() - stepStart });
            // Branch based on match
            const branch = result.match ? 'true' : 'false';
            const next = step.next?.find(n => typeof n === 'object' ? n.branch === branch : true);
            if (next) queue.push(typeof next === 'object' ? next.stepId : next);
          } else if (step.type === 'delay') {
            const handler = this.actionHandlers['delay'];
            await handler(step.config, context);
            log.push({ stepId: step.id, type: 'delay', duration: Date.now() - stepStart });
            queue.push(...(step.next || []));
          }
        } catch (e) {
          log.push({ stepId: step.id, success: false, error: e.message });
        }
      }

      // Update stats
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { runs: 1, successes: 1 },
        lastRunAt: new Date(),
        lastRunStatus: 'success',
      });

      return { success: true, log, duration: Date.now() - startTime };
    } catch (err) {
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { runs: 1, failures: 1 },
        lastRunAt: new Date(),
        lastRunStatus: 'failed',
      });
      return { success: false, error: err.message, log };
    }
  }

  /**
   * Trigger workflows for a specific event
   */
  async trigger(eventType, data, companyId) {
    try {
      const workflows = await Workflow.find({ company: companyId,
        enabled: true,
        'steps.type': 'trigger',
        'steps.operation': eventType,
      });

      const results = await Promise.all(workflows.map(w => this.execute(w, data)));
      return results;
    } catch (e) {
      console.error('[WorkflowEngine] Trigger error:', e);
      return [];
    }
  }
}

module.exports = new WorkflowEngine();
