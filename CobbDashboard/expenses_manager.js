const fs = require('fs');
const path = require('path');

const EXPENSES_FILE = path.join(__dirname, 'expenses.json');

const CATEGORY_MAP = {
    chai: { label: 'Chai & Refreshments', icon: '☕' },
    cleaning: { label: 'Cleaning & Supplies', icon: '🧹' },
    repairs: { label: 'Repairs & Maintenance', icon: '⚡' },
    courier: { label: 'Courier & Porter', icon: '🚚' },
    tailor: { label: 'Tailor & Alterations', icon: '✂️' },
    packing: { label: 'Bags & Packaging', icon: '📦' },
    misc: { label: 'Miscellaneous Petty Cash', icon: '📝' }
};

function getLocalTodayDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().split('T')[0];
}

function loadExpenses() {
    try {
        if (!fs.existsSync(EXPENSES_FILE)) {
            fs.writeFileSync(EXPENSES_FILE, JSON.stringify([], null, 2), 'utf-8');
            return [];
        }
        const data = fs.readFileSync(EXPENSES_FILE, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('[ExpensesManager] Error reading expenses.json:', err.message);
        return [];
    }
}

function saveExpenses(expenses) {
    try {
        const tempPath = EXPENSES_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(expenses, null, 2), 'utf-8');
        fs.renameSync(tempPath, EXPENSES_FILE);
        return true;
    } catch (err) {
        console.error('[ExpensesManager] Error writing expenses.json:', err.message);
        return false;
    }
}

function addExpense({ category, amount, description, loggedBy = 'Manager (Counter)', storeId = 'ALL' }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid expense amount is required');
    }

    const expenses = loadExpenses();
    const now = new Date();
    const dateStr = getLocalTodayDate();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

    const catKey = (category || 'misc').toLowerCase();
    const catInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.misc;

    const newExpense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: dateStr,
        time: timeStr,
        category: catKey,
        categoryLabel: catInfo.label,
        categoryIcon: catInfo.icon,
        amount: Math.round(numAmount * 100) / 100,
        description: (description || catInfo.label).trim(),
        loggedBy: loggedBy || 'Manager (Counter)',
        storeId: storeId || 'ALL',
        createdAt: now.toISOString()
    };

    expenses.unshift(newExpense); // Most recent first
    saveExpenses(expenses);
    return newExpense;
}

function deleteExpense(id) {
    const expenses = loadExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) {
        return false;
    }
    const removed = expenses.splice(index, 1)[0];
    saveExpenses(expenses);
    return removed;
}

function getExpensesByDate(targetDate, storeId) {
    const dateStr = targetDate || getLocalTodayDate();
    const expenses = loadExpenses();
    return expenses.filter(e => {
        const matchDate = e.date === dateStr;
        const matchStore = !storeId || storeId === 'ALL' || e.storeId === 'ALL' || e.storeId === storeId;
        return matchDate && matchStore;
    });
}

function getSummary(targetDate, storeId) {
    const items = getExpensesByDate(targetDate, storeId);
    let totalSpent = 0;
    const categoryBreakdown = {};

    Object.keys(CATEGORY_MAP).forEach(k => {
        categoryBreakdown[k] = {
            key: k,
            label: CATEGORY_MAP[k].label,
            icon: CATEGORY_MAP[k].icon,
            total: 0,
            count: 0
        };
    });

    items.forEach(item => {
        totalSpent += item.amount;
        const cat = item.category || 'misc';
        if (!categoryBreakdown[cat]) {
            categoryBreakdown[cat] = {
                key: cat,
                label: item.categoryLabel || cat,
                icon: item.categoryIcon || '📝',
                total: 0,
                count: 0
            };
        }
        categoryBreakdown[cat].total += item.amount;
        categoryBreakdown[cat].count += 1;
    });

    return {
        date: targetDate || getLocalTodayDate(),
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalCount: items.length,
        items,
        categories: Object.values(categoryBreakdown).filter(c => c.count > 0)
    };
}

module.exports = {
    CATEGORY_MAP,
    getLocalTodayDate,
    loadExpenses,
    addExpense,
    deleteExpense,
    getExpensesByDate,
    getSummary
};
