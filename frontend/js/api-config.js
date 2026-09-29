/**
 * AZOLVE API Configuration
 * ========================
 * This file goes in the FRONTEND (deploy-package/js/api-config.js)
 * It provides the API service layer for connecting frontend to backend
 */

// ============================================
// CONFIGURATION - Update these after deployment
// ============================================
const API_CONFIG = {
  // AUTO-DETECT: localhost when served from localhost, production otherwise
  BASE_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://azolve-api.onrender.com',

  API_PREFIX: '/api',
  SOCKET_URL: null, // Will be set to BASE_URL if null

  // Token keys in localStorage
  TOKEN_KEY: 'azolve_token',
  REFRESH_TOKEN_KEY: 'azolve_refresh_token',
  USER_KEY: 'azolve_user',
  COMPANY_KEY: 'azolve_company',
};

API_CONFIG.SOCKET_URL = API_CONFIG.SOCKET_URL || API_CONFIG.BASE_URL;

// ============================================
// API SERVICE CLASS
// ============================================
class AzolveAPI {
  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;
  }

  // --- Token Management ---
  getToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
  }

  setToken(token) {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
  }

  getRefreshToken() {
    return localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token) {
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, token);
  }

  getUser() {
    const user = localStorage.getItem(API_CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setUser(user) {
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
  }

  getCompany() {
    const company = localStorage.getItem(API_CONFIG.COMPANY_KEY);
    return company ? JSON.parse(company) : null;
  }

  setCompany(company) {
    localStorage.setItem(API_CONFIG.COMPANY_KEY, JSON.stringify(company));
  }

  clearAuth() {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
    localStorage.removeItem(API_CONFIG.COMPANY_KEY);
  }

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  }

  // --- HTTP Request Helper ---
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    // Add auth token
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add content type for JSON (unless FormData)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - Try refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAuth();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse(retryResponse);
        } else {
          this.clearAuth();
          window.location.href = 'login.html';
          return { success: false, message: 'Session expired' };
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  async handleResponse(response) {
    try {
      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.message || `Error ${response.status}`, errors: data.errors };
      }
      return data;
    } catch {
      return { success: false, message: `HTTP ${response.status}` };
    }
  }

  async refreshAuth() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.setToken(data.token);
          this.setRefreshToken(data.refreshToken);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // --- Convenience Methods ---
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData, // FormData - no Content-Type header (browser sets boundary)
    });
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================
  async register(data) {
    const result = await this.post('/auth/register', data);
    if (result.success) {
      this.setToken(result.token);
      this.setRefreshToken(result.refreshToken);
      this.setUser(result.data.user);
      this.setCompany(result.data.company);
    }
    return result;
  }

  async login(email, password) {
    const result = await this.post('/auth/login', { email, password });
    if (result.success) {
      this.setToken(result.token);
      this.setRefreshToken(result.refreshToken);
      this.setUser(result.data.user);
      this.setCompany(result.data.company);
    }
    return result;
  }

  async getMe() {
    return this.get('/auth/me');
  }

  async logout() {
    await this.post('/auth/logout');
    this.clearAuth();
    window.location.href = 'login.html';
  }

  async forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token, password) {
    return this.post('/auth/reset-password', { token, password });
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // ============================================
  // CRUD HELPERS (Generic)
  // ============================================
  _buildQuery(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const str = query.toString();
    return str ? `?${str}` : '';
  }

  // ============================================
  // CLIENTS
  // ============================================
  getClients(params) { return this.get(`/clients${this._buildQuery(params)}`); }
  getClient(id) { return this.get(`/clients/${id}`); }
  createClient(data) { return this.post('/clients', data); }
  updateClient(id, data) { return this.put(`/clients/${id}`, data); }
  deleteClient(id) { return this.delete(`/clients/${id}`); }

  // ============================================
  // ACTIVITIES — HubSpot-style client timeline
  // ============================================
  getActivities(params) { return this.get(`/activities${this._buildQuery(params)}`); }
  createActivity(data) { return this.post('/activities', data); }
  deleteActivity(id) { return this.delete(`/activities/${id}`); }
  getClientTimeline(clientId) { return this.get(`/activities/timeline/${clientId}`); }

  // ============================================
  // PRODUCTS
  // ============================================
  getProducts(params) { return this.get(`/products${this._buildQuery(params)}`); }
  getProduct(id) { return this.get(`/products/${id}`); }
  createProduct(data) { return this.post('/products', data); }
  updateProduct(id, data) { return this.put(`/products/${id}`, data); }
  deleteProduct(id) { return this.delete(`/products/${id}`); }
  getProductCategories() { return this.get('/products/categories'); }

  // ============================================
  // INVOICES
  // ============================================
  getInvoices(params) { return this.get(`/invoices${this._buildQuery(params)}`); }
  getInvoice(id) { return this.get(`/invoices/${id}`); }
  getInvoiceStats() { return this.get('/invoices/stats'); }
  createInvoice(data) { return this.post('/invoices', data); }
  updateInvoice(id, data) { return this.put(`/invoices/${id}`, data); }
  updateInvoiceStatus(id, status) { return this.put(`/invoices/${id}/status`, { status }); }
  sendInvoiceEmail(id) { return this.post(`/invoices/${id}/send`); }
  deleteInvoice(id) { return this.delete(`/invoices/${id}`); }

 // ============================================
// QUOTATIONS
// ============================================
getQuotations(params) { return this.get(`/quotations${this._buildQuery(params)}`); }
getQuotation(id) { return this.get(`/quotations/${id}`); }
createQuotation(data) { return this.post('/quotations', data); }
updateQuotation(id, data) { return this.put(`/quotations/${id}`, data); }
deleteQuotation(id) { return this.delete(`/quotations/${id}`); }
sendQuotation(id) { return this.post(`/quotations/${id}/send`); }
convertQuotation(id) { return this.post(`/quotations/${id}/convert`); }


  // ============================================
  // LEADS
  // ============================================
  getLeads(params) { return this.get(`/leads${this._buildQuery(params)}`); }
  getLead(id) { return this.get(`/leads/${id}`); }
  getLeadStats() { return this.get('/leads/stats'); }
  createLead(data) { return this.post('/leads', data); }
  updateLead(id, data) { return this.put(`/leads/${id}`, data); }
  addLeadActivity(id, activity) { return this.post(`/leads/${id}/activity`, activity); }
  convertLead(id) { return this.post(`/leads/${id}/convert`); }
  deleteLead(id) { return this.delete(`/leads/${id}`); }

  // ============================================
  // DEALS
  // ============================================
  getDeals(params) { return this.get(`/deals${this._buildQuery(params)}`); }
  getDeal(id) { return this.get(`/deals/${id}`); }
  getDealStats() { return this.get('/deals/stats'); }
  getDealPipeline() { return this.get('/deals/pipeline'); }
  createDeal(data) { return this.post('/deals', data); }
  updateDeal(id, data) { return this.put(`/deals/${id}`, data); }
  addDealActivity(id, activity) { return this.post(`/deals/${id}/activity`, activity); }
  deleteDeal(id) { return this.delete(`/deals/${id}`); }

  // ============================================
  // PROJECTS
  // ============================================
  getProjects(params) { return this.get(`/projects${this._buildQuery(params)}`); }
  getProject(id) { return this.get(`/projects/${id}`); }
  getProjectStats() { return this.get('/projects/stats'); }
  createProject(data) { return this.post('/projects', data); }
  updateProject(id, data) { return this.put(`/projects/${id}`, data); }
  deleteProject(id) { return this.delete(`/projects/${id}`); }

  // ============================================
  // TASKS
  // ============================================
  getTasks(params) { return this.get(`/tasks${this._buildQuery(params)}`); }
  getTask(id) { return this.get(`/tasks/${id}`); }
  getTaskStats() { return this.get('/tasks/stats'); }
  getMyTasks(params) { return this.get(`/tasks/my${this._buildQuery(params)}`); }
  createTask(data) { return this.post('/tasks', data); }
  updateTask(id, data) { return this.put(`/tasks/${id}`, data); }
  addTaskComment(id, text) { return this.post(`/tasks/${id}/comments`, { text }); }
  updateTaskChecklist(id, checklist) { return this.put(`/tasks/${id}/checklist`, { checklist }); }
  deleteTask(id) { return this.delete(`/tasks/${id}`); }

  // ============================================
  // EMPLOYEES
  // ============================================
  getEmployees(params) { return this.get(`/employees${this._buildQuery(params)}`); }
  getEmployee(id) { return this.get(`/employees/${id}`); }
  getEmployeeStats() { return this.get('/employees/stats'); }
  getDepartments() { return this.get('/employees/departments'); }
  createEmployee(data) { return this.post('/employees', data); }
  updateEmployee(id, data) { return this.put(`/employees/${id}`, data); }
  deleteEmployee(id) { return this.delete(`/employees/${id}`); }

  // ============================================
  // ATTENDANCE
  // ============================================
  getAttendance(params) { return this.get(`/attendance${this._buildQuery(params)}`); }
  getTodayAttendance() { return this.get('/attendance/today'); }
  getMyAttendance(params) { return this.get(`/attendance/my${this._buildQuery(params)}`); }
  getAttendanceStats() { return this.get('/attendance/stats'); }
  clockIn(data) { return this.post('/attendance/clock-in', data || {}); }
  clockOut(data) { return this.post('/attendance/clock-out', data || {}); }
  startBreak() { return this.post('/attendance/break-start'); }
  endBreak() { return this.post('/attendance/break-end'); }

  // ============================================
  // LEAVES
  // ============================================
  getLeaves(params) { return this.get(`/leaves${this._buildQuery(params)}`); }
  getLeave(id) { return this.get(`/leaves/${id}`); }
  getLeaveStats() { return this.get('/leaves/stats'); }
  getMyLeaves(params) { return this.get(`/leaves/my${this._buildQuery(params)}`); }
  getPendingLeaves() { return this.get('/leaves/pending'); }
  applyLeave(data) { return this.post('/leaves', data); }
  approveLeave(id) { return this.put(`/leaves/${id}/approve`); }
  rejectLeave(id, reason) { return this.put(`/leaves/${id}/reject`, { reason }); }
  cancelLeave(id) { return this.put(`/leaves/${id}/cancel`); }
  deleteLeave(id) { return this.delete(`/leaves/${id}`); }

  // ============================================
  // TICKETS
  // ============================================
  getTickets(params) { return this.get(`/tickets${this._buildQuery(params)}`); }
  getTicket(id) { return this.get(`/tickets/${id}`); }
  getTicketStats() { return this.get('/tickets/stats'); }
  getMyTickets(params) { return this.get(`/tickets/my${this._buildQuery(params)}`); }
  createTicket(data) { return this.post('/tickets', data); }
  updateTicket(id, data) { return this.put(`/tickets/${id}`, data); }
  updateTicketStatus(id, status, resolution) { return this.put(`/tickets/${id}/status`, { status, resolution }); }
  assignTicket(id, assignedTo) { return this.put(`/tickets/${id}/assign`, { assignedTo }); }
  addTicketComment(id, text, isInternal) { return this.post(`/tickets/${id}/comments`, { text, isInternal }); }
  rateTicket(id, satisfaction, comment) { return this.put(`/tickets/${id}/satisfaction`, { satisfaction, satisfactionComment: comment }); }
  deleteTicket(id) { return this.delete(`/tickets/${id}`); }

  // ============================================
  // MEETINGS
  // ============================================
  getMeetings(params) { return this.get(`/meetings${this._buildQuery(params)}`); }
  getMeeting(id) { return this.get(`/meetings/${id}`); }
  getMeetingStats() { return this.get('/meetings/stats'); }
  getMyMeetings(params) { return this.get(`/meetings/my${this._buildQuery(params)}`); }
  getUpcomingMeetings() { return this.get('/meetings/upcoming'); }
  joinMeetingByCode(meetingId, password) {
    const q = password ? `?password=${encodeURIComponent(password)}` : '';
    return this.get(`/meetings/join/${meetingId}${q}`);
  }
  createMeeting(data) { return this.post('/meetings', data); }
  updateMeeting(id, data) { return this.put(`/meetings/${id}`, data); }
  startMeeting(id) { return this.put(`/meetings/${id}/start`); }
  endMeeting(id) { return this.put(`/meetings/${id}/end`); }
  joinMeeting(id) { return this.put(`/meetings/${id}/join`); }
  leaveMeeting(id) { return this.put(`/meetings/${id}/leave`); }
  saveMeetingRecording(id, data) { return this.put(`/meetings/${id}/recording`, data); }
  deleteMeeting(id) { return this.delete(`/meetings/${id}`); }

  // ============================================
  // CHATS
  // ============================================
  getChats(params) { return this.get(`/chats${this._buildQuery(params)}`); }
  getChat(id) { return this.get(`/chats/${id}`); }
  createChat(data) { return this.post('/chats', data); }
  updateChat(id, data) { return this.put(`/chats/${id}`, data); }
  addChatMembers(id, members) { return this.post(`/chats/${id}/members`, { members }); }
  removeChatMember(id, userId) { return this.delete(`/chats/${id}/members/${userId}`); }
  getChatMessages(id, params) { return this.get(`/chats/${id}/messages${this._buildQuery(params)}`); }
  sendMessage(chatId, content, type) { return this.post(`/chats/${chatId}/messages`, { content, type }); }
  sendReply(chatId, content, replyTo) { return this.post(`/chats/${chatId}/messages`, { content, replyTo }); }
  reactToMessage(chatId, messageId, emoji) { return this.put(`/chats/${chatId}/messages/${messageId}/react`, { emoji }); }
  markChatRead(id) { return this.put(`/chats/${id}/read`); }
  toggleMuteChat(id) { return this.put(`/chats/${id}/mute`); }
  archiveChat(id) { return this.delete(`/chats/${id}`); }

  // ============================================
  // CALENDAR
  // ============================================
  getEvents(params) { return this.get(`/calendar${this._buildQuery(params)}`); }
  getEvent(id) { return this.get(`/calendar/${id}`); }
  getUpcomingEvents(limit) { return this.get(`/calendar/upcoming${this._buildQuery({ limit })}`); }
  getTodayEvents() { return this.get('/calendar/today'); }
  getCalendarStats() { return this.get('/calendar/stats'); }
  createEvent(data) { return this.post('/calendar', data); }
  updateEvent(id, data) { return this.put(`/calendar/${id}`, data); }
  rsvpEvent(id, status) { return this.put(`/calendar/${id}/rsvp`, { status }); }
  deleteEvent(id) { return this.delete(`/calendar/${id}`); }
  deleteRecurringEvents(id) { return this.delete(`/calendar/${id}/recurring`); }

  // ============================================
  // DASHBOARD
  // ============================================
  getDashboard() { return this.get('/dashboard'); }
  getSalesDashboard() { return this.get('/dashboard/sales'); }
  getProjectsDashboard() { return this.get('/dashboard/projects'); }
  getHRDashboard() { return this.get('/dashboard/hr'); }
  getSupportDashboard() { return this.get('/dashboard/support'); }
  getActivityFeed(limit) { return this.get(`/dashboard/activity${this._buildQuery({ limit })}`); }

  // ============================================
  // USERS & COMPANY
  // ============================================
  getUsers(params) { return this.get(`/users${this._buildQuery(params)}`); }
  getUser(id) { return this.get(`/users/${id}`); }
  updateUser(id, data) { return this.put(`/users/${id}`, data); }
  deleteUser(id) { return this.delete(`/users/${id}`); }
  getCompanyInfo() { return this.get('/companies/me'); }
  updateCompanyInfo(data) { return this.put('/companies/me', data); }
}

// ============================================
// SOCKET SERVICE (Real-time)
// ============================================
class AzolveSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
  }

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
    if (!token) return;

    // Load Socket.IO from CDN if not present
    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      script.onload = () => this._initSocket(token);
      document.head.appendChild(script);
    } else {
      this._initSocket(token);
    }
  }

  _initSocket(token) {
    this.socket = io(API_CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket error:', error.message);
    });

    // Re-register saved listeners
    Object.entries(this.listeners).forEach(([event, callbacks]) => {
      callbacks.forEach(cb => this.socket.on(event, cb));
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    if (this.socket) this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    if (this.socket) this.socket.off(event, callback);
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Chat shortcuts
  joinChat(chatId) { this.emit('join_chat', chatId); }
  leaveChat(chatId) { this.emit('leave_chat', chatId); }
  sendChatMessage(chatId, message) { this.emit('chat_message', { chatId, message }); }
  sendTyping(chatId) { this.emit('typing', { chatId }); }
  stopTyping(chatId) { this.emit('stop_typing', { chatId }); }

  // Meeting shortcuts
  joinMeetingRoom(meetingId) { this.emit('join_meeting', meetingId); }
  leaveMeetingRoom(meetingId) { this.emit('leave_meeting', meetingId); }
  sendSignal(meetingId, signal) { this.emit('meeting_signal', { meetingId, signal }); }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// ============================================
// GLOBAL INSTANCES
// ============================================
const api = new AzolveAPI();
const socketService = new AzolveSocket();

// Expose for legacy pages and inline modules
window.API_CONFIG = API_CONFIG;
window.api = api;
window.socketService = socketService;

// Auto-connect socket if authenticated
if (api.isAuthenticated()) {
  socketService.connect();
}

// ============================================
// NOTIFICATION HELPER
// ============================================
function showNotification(message, type = 'info') {
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#714B67',
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    padding: 14px 24px; border-radius: 8px; color: white;
    background: ${colors[type] || colors.info};
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    font-family: 'Inter', sans-serif; font-size: 14px;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

// ============================================
// AUTH GUARD (Use on protected pages)
// ============================================
function requireAuth() {
  if (!api.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, AzolveAPI, AzolveSocket, api, socketService, showNotification, requireAuth };
}