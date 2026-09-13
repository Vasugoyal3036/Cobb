const express = require('express');
const router = express.Router();
const expensesManager = require('../expenses_manager');

// GET /api/expenses/categories
router.get('/categories', (req, res) => {
    res.json({
        success: true,
        categories: expensesManager.CATEGORY_MAP
    });
});

// GET /api/expenses/today
router.get('/today', (req, res) => {
    try {
        const storeId = req.query.storeId || 'ALL';
        const summary = expensesManager.getSummary(null, storeId);
        res.json({
            success: true,
            summary
        });
    } catch (err) {
        console.error('[ExpensesRoute] Error getting today summary:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/expenses/summary?date=YYYY-MM-DD&storeId=...
router.get('/summary', (req, res) => {
    try {
        const dateStr = req.query.date;
        const storeId = req.query.storeId || 'ALL';
        const summary = expensesManager.getSummary(dateStr, storeId);
        res.json({
            success: true,
            summary
        });
    } catch (err) {
        console.error('[ExpensesRoute] Error getting summary:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/expenses/add
router.post('/add', (req, res) => {
    try {
        const { category, amount, description, loggedBy, storeId } = req.body;
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'A valid amount is required' });
        }

        const newExpense = expensesManager.addExpense({
            category,
            amount,
            description,
            loggedBy,
            storeId
        });

        const todaySummary = expensesManager.getSummary(null, storeId);

        res.json({
            success: true,
            expense: newExpense,
            summary: todaySummary
        });
    } catch (err) {
        console.error('[ExpensesRoute] Error adding expense:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const removed = expensesManager.deleteExpense(id);
        if (!removed) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }
        res.json({
            success: true,
            removed
        });
    } catch (err) {
        console.error('[ExpensesRoute] Error deleting expense:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
