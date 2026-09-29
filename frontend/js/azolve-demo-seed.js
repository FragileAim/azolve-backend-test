// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AZOLVE DEMO SEEDER
// Populates localStorage with realistic demo data so features come alive
// Runs only once per browser (flagged); user can reset via button
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  'use strict';

  const SEED_FLAG = 'azolve_demo_seeded_v2';
  if (localStorage.getItem(SEED_FLAG)) return;

  // Only seed if no real data exists
  const existingInv = JSON.parse(localStorage.getItem('azolve_invoices') || '[]');
  if (existingInv.length > 0) { localStorage.setItem(SEED_FLAG, '1'); return; }

  const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
  const daysAhead = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

  // ───── Clients ─────
  const clients = [
    { id: uid(), name: 'Sharma Textiles Pvt Ltd', email: 'accounts@sharmatex.in', phone: '9876543210', address: 'MG Road, Mumbai', gstin: '27AABCS1234Z1Z0', type: 'Business' },
    { id: uid(), name: 'Gupta Electronics', email: 'orders@guptaelec.com', phone: '9123456789', address: 'Connaught Place, Delhi', gstin: '07AABCG5678K1Z0', type: 'Business' },
    { id: uid(), name: 'Priya Sharma', email: 'priya@gmail.com', phone: '9988776655', address: 'Bangalore', type: 'Individual' },
    { id: uid(), name: 'Krishna Enterprises', email: 'info@krishna-ent.in', phone: '9555666777', address: 'Hyderabad', gstin: '36AABCK9999Z1Z0', type: 'Business' },
    { id: uid(), name: 'Modern Cafe', email: 'modern@cafe.in', phone: '9444555666', address: 'Pune', type: 'Business' },
  ];

  // ───── Products ─────
  const products = [
    { id: uid(), name: 'Premium Cotton T-Shirt', sku: 'TS-001', price: 599, cost: 280, stock: 150, hsn: '6109', tax: 12, category: 'Apparel' },
    { id: uid(), name: 'Laptop Bag - Leather', sku: 'LB-101', price: 1899, cost: 850, stock: 45, hsn: '4202', tax: 18, category: 'Accessories' },
    { id: uid(), name: 'Wireless Bluetooth Headphones', sku: 'HP-220', price: 2499, cost: 1100, stock: 28, hsn: '8518', tax: 18, category: 'Electronics' },
    { id: uid(), name: 'Steel Water Bottle 1L', sku: 'WB-050', price: 449, cost: 180, stock: 8, hsn: '9617', tax: 18, category: 'Lifestyle' },
    { id: uid(), name: 'Office Chair - Ergonomic', sku: 'OC-300', price: 7999, cost: 4200, stock: 12, hsn: '9401', tax: 18, category: 'Furniture' },
    { id: uid(), name: 'LED Desk Lamp', sku: 'DL-015', price: 1299, cost: 520, stock: 60, hsn: '9405', tax: 18, category: 'Electronics' },
  ];

  // ───── Invoices ─────
  const invoices = [
    { id: uid(), number: 'INV-2024-001', clientName: clients[0].name, clientEmail: clients[0].email, clientPhone: clients[0].phone, date: daysAgo(45), due: daysAgo(15), total: 25940, subtotal: 22000, tax: 3940, status: 'paid', paid: 25940, items: [{ name:'Premium Cotton T-Shirt', qty:30, price:599, total:17970 }, {name:'Laptop Bag - Leather', qty:2, price:1899, total:3798}], paidAt: daysAgo(20) },
    { id: uid(), number: 'INV-2024-002', clientName: clients[1].name, clientEmail: clients[1].email, clientPhone: clients[1].phone, date: daysAgo(30), due: daysAgo(0), total: 14995, subtotal: 12708, tax: 2287, status: 'paid', paid: 14995, items: [{name:'Wireless Bluetooth Headphones', qty:5, price:2499, total:12495}], paidAt: daysAgo(5) },
    { id: uid(), number: 'INV-2024-003', clientName: clients[2].name, clientEmail: clients[2].email, clientPhone: clients[2].phone, date: daysAgo(20), due: daysAhead(10), total: 1898, subtotal: 1608, tax: 290, status: 'pending', paid: 0, items: [{name:'Premium Cotton T-Shirt', qty:2, price:599, total:1198}] },
    { id: uid(), number: 'INV-2024-004', clientName: clients[3].name, clientEmail: clients[3].email, clientPhone: clients[3].phone, date: daysAgo(55), due: daysAgo(25), total: 47994, subtotal: 40673, tax: 7321, status: 'overdue', paid: 0, items: [{name:'Office Chair - Ergonomic', qty:6, price:7999, total:47994}] },
    { id: uid(), number: 'INV-2024-005', clientName: clients[4].name, clientEmail: clients[4].email, clientPhone: clients[4].phone, date: daysAgo(10), due: daysAhead(20), total: 9993, subtotal: 8469, tax: 1524, status: 'pending', paid: 0, items: [{name:'LED Desk Lamp', qty:5, price:1299, total:6495}, {name:'Steel Water Bottle 1L', qty:5, price:449, total:2245}] },
    { id: uid(), number: 'INV-2024-006', clientName: clients[0].name, clientEmail: clients[0].email, clientPhone: clients[0].phone, date: daysAgo(5), due: daysAhead(25), total: 35980, subtotal: 30492, tax: 5488, status: 'pending', paid: 0, items: [{name:'Premium Cotton T-Shirt', qty:50, price:599, total:29950}] },
    { id: uid(), number: 'INV-2024-007', clientName: clients[1].name, clientEmail: clients[1].email, clientPhone: clients[1].phone, date: daysAgo(3), due: daysAhead(27), total: 22491, subtotal: 19060, tax: 3431, status: 'paid', paid: 22491, items: [{name:'Wireless Bluetooth Headphones', qty:8, price:2499, total:19992}], paidAt: daysAgo(1) },
    { id: uid(), number: 'INV-2024-008', clientName: clients[3].name, clientEmail: clients[3].email, clientPhone: clients[3].phone, date: daysAgo(70), due: daysAgo(40), total: 5398, subtotal: 4574, tax: 824, status: 'overdue', paid: 0, items: [{name:'Laptop Bag - Leather', qty:2, price:1899, total:3798}] },
  ];

  // ───── POS Transactions ─────
  const txns = [];
  const paymentModes = ['cash', 'upi', 'card'];
  for (let i = 0; i < 25; i++) {
    const days = Math.floor(Math.random() * 30);
    const count = 1 + Math.floor(Math.random() * 3);
    const items = [];
    let total = 0;
    for (let j = 0; j < count; j++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      items.push({ name: p.name, qty, price: p.price, total: p.price * qty });
      total += p.price * qty;
    }
    txns.push({
      id: uid(),
      receiptNo: 'POS-' + (1000 + i),
      date: daysAgo(days),
      time: `${10 + Math.floor(Math.random()*8)}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`,
      items,
      subtotal: total,
      tax: Math.round(total * 0.18),
      total: total + Math.round(total * 0.18),
      payment: paymentModes[Math.floor(Math.random() * 3)],
      customerName: Math.random() > 0.5 ? 'Walk-in Customer' : clients[Math.floor(Math.random()*clients.length)].name,
      customerPhone: Math.random() > 0.5 ? '' : '98' + String(Math.floor(Math.random()*1e8)).padStart(8,'0')
    });
  }

  // ───── Leads ─────
  const leads = [
    { id: uid(), name: 'Rajesh Kumar', email: 'rajesh@demo.in', phone: '9876501234', company: 'Kumar Industries', source: 'Website', stage: 'qualified', value: 50000, createdAt: daysAgo(10) },
    { id: uid(), name: 'Meera Patel', email: 'meera@demo.in', phone: '9876502345', company: 'Patel Trading Co', source: 'Referral', stage: 'contacted', value: 25000, createdAt: daysAgo(5) },
    { id: uid(), name: 'Arjun Singh', email: 'arjun@demo.in', phone: '9876503456', company: 'Singh Ventures', source: 'LinkedIn', stage: 'new', value: 100000, createdAt: daysAgo(2) },
  ];

  // ───── Tasks ─────
  const tasks = [
    { id: uid(), title: 'Follow up with Sharma Textiles', priority: 'high', status: 'todo', due: daysAhead(2), assigned: 'Demo User' },
    { id: uid(), title: 'Send quotation to Krishna Enterprises', priority: 'medium', status: 'in-progress', due: daysAhead(5), assigned: 'Demo User' },
    { id: uid(), title: 'Review Q3 financial report', priority: 'high', status: 'todo', due: daysAhead(7), assigned: 'Demo User' },
  ];

  // ───── Persist ─────
  localStorage.setItem('azolve_clients', JSON.stringify(clients));
  localStorage.setItem('azolve_products', JSON.stringify(products));
  localStorage.setItem('azolve_invoices', JSON.stringify(invoices));
  localStorage.setItem('azolve_pos_transactions', JSON.stringify(txns));
  localStorage.setItem('azolve_leads', JSON.stringify(leads));
  localStorage.setItem('azolve_tasks', JSON.stringify(tasks));
  localStorage.setItem(SEED_FLAG, '1');

  console.log('✓ Azolve demo data seeded:', {
    clients: clients.length,
    products: products.length,
    invoices: invoices.length,
    pos: txns.length,
    leads: leads.length,
    tasks: tasks.length
  });
})();