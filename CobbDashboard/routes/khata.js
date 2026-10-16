const express = require('express');
const router = express.Router();
const khataManager = require('../khata_manager');

// GET /api/khata/summary?storeId=...
router.get('/summary', (req, res) => {
    try {
        const storeId = req.query.storeId || 'ALL';
        const summary = khataManager.getKhataSummary(storeId);
        res.json({
            success: true,
            summary
        });
    } catch (err) {
        console.error('[KhataRoute] Error getting summary:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/khata/customers?storeId=...&search=...&filter=...
router.get('/customers', (req, res) => {
    try {
        const storeId = req.query.storeId || 'ALL';
        const search = req.query.search || '';
        const filter = req.query.filter || 'ALL';
        const customers = khataManager.getCustomers(storeId, search, filter);
        const summary = khataManager.getKhataSummary(storeId);
        res.json({
            success: true,
            customers,
            summary
        });
    } catch (err) {
        console.error('[KhataRoute] Error getting customers:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/khata/customer/:id
router.get('/customer/:id', (req, res) => {
    try {
        const customer = khataManager.getCustomerById(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.json({
            success: true,
            customer
        });
    } catch (err) {
        console.error('[KhataRoute] Error getting customer:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/khata/customer (Upsert customer)
router.post('/customer', (req, res) => {
    try {
        const customer = khataManager.saveCustomer(req.body);
        res.json({
            success: true,
            customer
        });
    } catch (err) {
        console.error('[KhataRoute] Error saving customer:', err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

// POST /api/khata/transaction (Record Gave Udhar or Got Payment)
router.post('/transaction', (req, res) => {
    try {
        const result = khataManager.addTransaction(req.body);
        const storeId = req.body.storeId || 'ALL';
        const summary = khataManager.getKhataSummary(storeId);
        res.json({
            success: true,
            transaction: result.transaction,
            customer: result.customer,
            summary
        });
    } catch (err) {
        console.error('[KhataRoute] Error recording transaction:', err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

// DELETE /api/khata/transaction/:id (Void transaction)
router.delete('/transaction/:id', (req, res) => {
    try {
        khataManager.voidTransaction(req.params.id);
        const storeId = req.query.storeId || 'ALL';
        const summary = khataManager.getKhataSummary(storeId);
        res.json({
            success: true,
            message: 'Transaction voided successfully',
            summary
        });
    } catch (err) {
        console.error('[KhataRoute] Error voiding transaction:', err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
