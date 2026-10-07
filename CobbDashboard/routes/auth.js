const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

// Mock users for local demo
const MOCK_USERS = {
    'admin': { id: 1, name: 'Store Owner', role: 'owner', storeId: 'DEFAULT_STORE' },
    'manager': { id: 2, name: 'Store Manager', role: 'manager', storeId: 'DEFAULT_STORE' }
};

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // In a real app, this would check the database
    // For this local demo, we use mock users and accept any password
    const user = MOCK_USERS[username];
    
    if (user) {
        const token = jwt.sign(
            { id: user.id, username, role: user.role, name: user.name, storeId: user.storeId }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username' });
    }
});

const AUDIT_FILE = path.join(__dirname, '..', 'login_audit_logs.json');

function readAuditLogs() {
    try {
        if (!fs.existsSync(AUDIT_FILE)) return [];
        const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeAuditLog(entry) {
    try {
        const logs = readAuditLogs();
        logs.unshift(entry);
        // Retain last 500 audit logs
        const trimmed = logs.slice(0, 500);
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(trimmed, null, 2));
        return true;
    } catch (e) {
        console.error('[AuthAudit] Failed to write local log:', e.message);
        return false;
    }
}

router.post('/login-audit', (req, res) => {
    const entry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        ...req.body
    };
    writeAuditLog(entry);
    res.json({ success: true, logId: entry.id });
});

router.get('/login-audit', (req, res) => {
    const logs = readAuditLogs();
    res.json({ success: true, logs });
});

router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Failed to authenticate token' });
        }
        
        res.json({
            success: true,
            user: decoded
        });
    });
});

const checkRole = (roles) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(403).json({ message: 'Access denied' });
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (roles.includes(decoded.role)) {
                req.user = decoded;
                next();
            } else {
                res.status(403).json({ message: 'Unauthorized role' });
            }
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    };
};

module.exports = { router, checkRole };
