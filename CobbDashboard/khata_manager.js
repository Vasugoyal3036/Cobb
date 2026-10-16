const fs = require('fs');
const path = require('path');

const KHATA_FILE = path.join(__dirname, 'khata.json');

const EMPTY_KHATA_DATA = {
    customers: [],
    transactions: []
};

function loadKhataData() {
    try {
        if (!fs.existsSync(KHATA_FILE)) {
            fs.writeFileSync(KHATA_FILE, JSON.stringify(EMPTY_KHATA_DATA, null, 2), 'utf-8');
            return JSON.parse(JSON.stringify(EMPTY_KHATA_DATA));
        }
        const content = fs.readFileSync(KHATA_FILE, 'utf-8');
        const parsed = JSON.parse(content || '{}');
        if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.transactions)) {
            return JSON.parse(JSON.stringify(EMPTY_KHATA_DATA));
        }
        return parsed;
    } catch (err) {
        console.error('[KhataManager] Error loading khata.json:', err.message);
        return JSON.parse(JSON.stringify(EMPTY_KHATA_DATA));
    }
}

function saveKhataData(data) {
    try {
        const tempPath = KHATA_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tempPath, KHATA_FILE);
        return true;
    } catch (err) {
        console.error('[KhataManager] Error writing khata.json:', err.message);
        return false;
    }
}

function getKhataSummary(storeId = 'ALL') {
    const data = loadKhataData();
    const isAll = !storeId || storeId === 'ALL';

    const customers = isAll ? data.customers : data.customers.filter(c => c.storeId === storeId || !c.storeId);
    const transactions = isAll ? data.transactions : data.transactions.filter(t => t.storeId === storeId || !t.storeId);

    let totalOutstanding = 0;
    let totalCreditGiven = 0;
    let totalCollected = 0;
    let activeDuesCount = 0;
    let settledCount = 0;
    let overdueCount = 0;

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    customers.forEach(cust => {
        const bal = Number(cust.balance || 0);
        if (bal > 0) {
            totalOutstanding += bal;
            activeDuesCount++;

            // Check if overdue: last transaction older than 30 days or past due date
            const lastTxTime = cust.lastTransactionDate ? new Date(cust.lastTransactionDate).getTime() : 0;
            if (now - lastTxTime > thirtyDaysMs) {
                overdueCount++;
            }
        } else {
            settledCount++;
        }
        totalCreditGiven += Number(cust.totalGave || 0);
        totalCollected += Number(cust.totalGot || 0);
    });

    // Calculate this month's collections
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let collectedThisMonth = 0;
    transactions.forEach(t => {
        if (t.type === 'GOT' && t.date && t.date.startsWith(currentMonth)) {
            collectedThisMonth += Number(t.amount || 0);
        }
    });

    const topDueCustomers = [...customers]
        .filter(c => Number(c.balance || 0) > 0)
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
        .slice(0, 5)
        .map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            balance: c.balance,
            creditLimit: c.creditLimit,
            lastTransactionDate: c.lastTransactionDate
        }));

    return {
        totalOutstanding: Math.round(totalOutstanding),
        totalCreditGiven: Math.round(totalCreditGiven),
        totalCollected: Math.round(totalCollected),
        collectedThisMonth: Math.round(collectedThisMonth),
        totalAccounts: customers.length,
        activeDuesCount,
        settledCount,
        overdueCount,
        topDueCustomers,
        lastUpdated: new Date().toISOString()
    };
}

function getCustomers(storeId = 'ALL', search = '', filter = 'ALL') {
    const data = loadKhataData();
    const isAll = !storeId || storeId === 'ALL';
    let list = isAll ? data.customers : data.customers.filter(c => c.storeId === storeId || !c.storeId);

    const q = (search || '').trim().toLowerCase();
    if (q) {
        list = list.filter(c => 
            (c.name || '').toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.city || '').toLowerCase().includes(q)
        );
    }

    if (filter === 'PENDING') {
        list = list.filter(c => Number(c.balance || 0) > 0);
    } else if (filter === 'SETTLED') {
        list = list.filter(c => Number(c.balance || 0) <= 0);
    } else if (filter === 'OVERDUE') {
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        list = list.filter(c => {
            const bal = Number(c.balance || 0);
            const lastTxTime = c.lastTransactionDate ? new Date(c.lastTransactionDate).getTime() : 0;
            return bal > 0 && (now - lastTxTime > thirtyDaysMs);
        });
    }

    // Sort by balance descending, then by name
    return list.sort((a, b) => (Number(b.balance || 0) - Number(a.balance || 0)) || (a.name || '').localeCompare(b.name || ''));
}

function getCustomerById(customerId) {
    const data = loadKhataData();
    const customer = data.customers.find(c => c.id === customerId || c.phone === customerId);
    if (!customer) return null;

    const transactions = data.transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
        ...customer,
        transactions
    };
}

function saveCustomer({ id, name, phone, city, address, creditLimit, notes, trustRating, storeId = 'DEMO_STORE_001' }) {
    if (!name || !name.trim()) throw new Error('Customer name is required');
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) throw new Error('A valid 10-digit mobile number is required');

    const data = loadKhataData();
    const customerId = id || `khata_${cleanPhone}`;
    const nowIso = new Date().toISOString();

    const existingIndex = data.customers.findIndex(c => c.id === customerId || c.phone === cleanPhone);

    let customerObj;
    if (existingIndex >= 0) {
        customerObj = {
            ...data.customers[existingIndex],
            name: name.trim(),
            phone: cleanPhone,
            city: (city || data.customers[existingIndex].city || 'Pundri').trim(),
            address: (address || data.customers[existingIndex].address || '').trim(),
            creditLimit: Number(creditLimit || data.customers[existingIndex].creditLimit || 20000),
            trustRating: trustRating || data.customers[existingIndex].trustRating || 'TRUSTED',
            notes: notes !== undefined ? notes.trim() : data.customers[existingIndex].notes,
            updatedAt: nowIso
        };
        data.customers[existingIndex] = customerObj;
    } else {
        customerObj = {
            id: customerId,
            name: name.trim(),
            phone: cleanPhone,
            city: (city || 'Pundri').trim(),
            address: (address || '').trim(),
            creditLimit: Number(creditLimit || 20000),
            balance: 0,
            totalGave: 0,
            totalGot: 0,
            trustRating: trustRating || 'TRUSTED',
            status: 'SETTLED',
            notes: (notes || '').trim(),
            storeId,
            lastTransactionDate: null,
            createdAt: nowIso,
            updatedAt: nowIso
        };
        data.customers.push(customerObj);
    }

    saveKhataData(data);
    return customerObj;
}

function addTransaction({
    customerId,
    type, // 'GAVE' (Udhar/Debit) | 'GOT' (Jama/Credit)
    amount,
    billNumber = '',
    itemsSummary = '',
    paymentMode = 'Cash',
    dueDate = null,
    notes = '',
    loggedBy = 'Cashier',
    storeId = 'DEMO_STORE_001'
}) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Transaction amount must be a positive number');
    }
    if (!['GAVE', 'GOT'].includes(type)) {
        throw new Error("Transaction type must be 'GAVE' (Udhar) or 'GOT' (Payment Received)");
    }

    const data = loadKhataData();
    const custIndex = data.customers.findIndex(c => c.id === customerId || c.phone === customerId);
    if (custIndex < 0) {
        throw new Error(`Customer ${customerId} not found in Khata`);
    }

    const customer = data.customers[custIndex];
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const prevBalance = Number(customer.balance || 0);
    let newBalance = prevBalance;

    if (type === 'GAVE') {
        newBalance = prevBalance + numAmount;
        customer.totalGave = (Number(customer.totalGave) || 0) + numAmount;
    } else { // 'GOT'
        newBalance = prevBalance - numAmount;
        customer.totalGot = (Number(customer.totalGot) || 0) + numAmount;
    }

    customer.balance = Math.round(newBalance * 100) / 100;
    customer.status = customer.balance > 0 ? 'ACTIVE' : 'SETTLED';
    customer.lastTransactionDate = nowIso;
    customer.updatedAt = nowIso;

    const txnId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newTxn = {
        id: txnId,
        customerId: customer.id,
        type,
        amount: Math.round(numAmount * 100) / 100,
        balanceAfter: customer.balance,
        billNumber: (billNumber || '').trim(),
        itemsSummary: (itemsSummary || '').trim(),
        paymentMode: type === 'GOT' ? (paymentMode || 'Cash') : null,
        dueDate: dueDate || null,
        notes: (notes || '').trim(),
        loggedBy: (loggedBy || 'Cashier').trim(),
        date: dateStr,
        time: timeStr,
        timestamp: nowIso,
        storeId
    };

    data.transactions.push(newTxn);
    saveKhataData(data);

    return {
        transaction: newTxn,
        customer
    };
}

function voidTransaction(transactionId) {
    const data = loadKhataData();
    const txnIndex = data.transactions.findIndex(t => t.id === transactionId);
    if (txnIndex < 0) {
        throw new Error('Transaction not found');
    }

    const txn = data.transactions[txnIndex];
    const custIndex = data.customers.findIndex(c => c.id === txn.customerId);
    if (custIndex >= 0) {
        const customer = data.customers[custIndex];
        const numAmount = Number(txn.amount || 0);

        if (txn.type === 'GAVE') {
            customer.balance = Math.max(0, (Number(customer.balance) || 0) - numAmount);
            customer.totalGave = Math.max(0, (Number(customer.totalGave) || 0) - numAmount);
        } else {
            customer.balance = (Number(customer.balance) || 0) + numAmount;
            customer.totalGot = Math.max(0, (Number(customer.totalGot) || 0) - numAmount);
        }

        customer.status = customer.balance > 0 ? 'ACTIVE' : 'SETTLED';
        customer.updatedAt = new Date().toISOString();
    }

    // Remove transaction
    data.transactions.splice(txnIndex, 1);
    saveKhataData(data);

    return true;
}

module.exports = {
    loadKhataData,
    saveKhataData,
    getKhataSummary,
    getCustomers,
    getCustomerById,
    saveCustomer,
    addTransaction,
    voidTransaction
};
