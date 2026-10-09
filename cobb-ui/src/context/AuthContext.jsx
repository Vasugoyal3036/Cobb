import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { logAuthEvent } from '../utils/auditLogger';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const AVAILABLE_STORES = [
  { id: 'DEMO_STORE_001', name: 'Cobb Pundri (Main)', shortName: 'Pundri', code: 'PUNDRI', location: 'Fatehpur Road, Pundri', coordinates: { lat: 29.7562, lng: 76.5619 } },
  { id: 'STORE_02', name: 'Cobb Branch 2 (New)', shortName: 'Branch 2', code: 'BRANCH_2', location: 'New Branch Market', coordinates: { lat: 29.7600, lng: 76.5700 } },
  { id: 'ALL', name: 'All Stores (Combined)', shortName: 'All Stores', code: 'ALL', location: 'Consolidated Multi-Store View', coordinates: null }
];

/**
 * ROLE_PERMISSIONS defines which navigation tab IDs are visible per role.
 * owner   → sees everything
 * manager → sees all operational + analytics tabs, hides financials/automation
 * cashier → sees only the counter essentials (billing, exchanges, alterations, holds)
 */
export const ROLE_PERMISSIONS = {
  owner: null, // null = all tabs allowed
  manager: [
    'copilot','dashboard','speed_billing','analytics','monthly','live',
    'staff_leaderboard','pocket_khata','denomination','hold_desk','returns',
    'alterations','topmovers','sizematrix','transit','ibt','deadstock','reorder',
    'smart_bundles','loyalty','ratings','vip','dormant','wardrobe','retention'
  ],
  cashier: ['speed_billing','live','denomination','returns','alterations','hold_desk','deadstock'],
};

export const ROLE_LABELS = {
  owner:   { label: 'Owner',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  manager: { label: 'Manager', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cashier: { label: 'Cashier', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

// -- Auth credentials -----------------------------------------------------------
export const AUTH_CREDENTIALS = {
  owner: [
    { username: 'parbhat', password: 'baboo2525', name: 'Parbhat' },
    { username: 'pardeep', password: 'pardeep2015', name: 'Pardeep' },
    { username: 'vasu', password: 'vasu3003', name: 'Vasu' },
    { username: 'akshat', password: 'akshat1519', name: 'Akshat' },
  ],
  manager: [
    { username: 'manager1', password: 'password123', name: 'Store Manager' }
  ]
};

const REMEMBER_KEY = 'cobb_owner_remembered';
// ----------------------------------------------------------------------------

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Clear any previously saved sessions immediately
  useEffect(() => {
    try {
      localStorage.removeItem('cobb_auth_user');
      localStorage.removeItem(REMEMBER_KEY);
    } catch (e) {}
  }, []);

  const [activeStore, setActiveStore] = useState(() => {
    const s = localStorage.getItem('cobb_active_store');
    if (!s || s === 'STORE_01') return 'DEMO_STORE_001';
    return s;
  });

  const [rememberOwner, setRememberOwnerState] = useState(false);
  const setRememberOwner = useCallback((val) => {
    setRememberOwnerState(false);
  }, []);

  const switchRole = (newRole, pin = null) => {
    const nameMap = { owner: 'Owner', manager: 'Store Manager', cashier: 'Counter Staff' };
    const updated = { ...user, role: newRole, name: nameMap[newRole] || 'Staff' };
    setUser(updated);
    try { localStorage.setItem('cobb_auth_user', JSON.stringify(updated)); } catch {}

    // Security: Automatically lock non-owners out of 'ALL' (Consolidated Multi-Store HQ) view
    if (newRole !== 'owner') {
      setActiveStore(prev => {
        const locked = (!prev || prev === 'ALL') ? 'DEMO_STORE_001' : prev;
        try { localStorage.setItem('cobb_active_store', locked); } catch {}
        return locked;
      });
    }

    logAuthEvent({
      role: newRole,
      userName: nameMap[newRole],
      storeId: activeStore,
      action: 'ROLE_SWITCH',
      status: 'success',
      method: pin ? 'PIN' : 'SESSION'
    });
  };

  const switchStore = (storeId) => {
    if (user?.role !== 'owner') {
      console.warn(`[AuthContext] Branch switch blocked: User role '${user?.role}' is restricted to their assigned branch.`);
      return false;
    }
    setActiveStore(storeId);
    try { localStorage.setItem('cobb_active_store', storeId); } catch {}
    return true;
  };

  const login = async (role = 'owner', username = '', password = '') => {
    const nameMap = { owner: 'Owner', manager: 'Store Manager', cashier: 'Counter Staff' };
    const targetRole = (role || 'owner').toLowerCase();
    
    let loggedUser = null;

    // Verify credentials if owner or manager
    if (targetRole === 'owner' || targetRole === 'manager') {
      let customUsers = [];
      try {
        const accountsRef = doc(db, 'stores', activeStore, 'data', 'accounts');
        const snap = await getDoc(accountsRef);
        if (snap.exists()) {
          customUsers = snap.data().customUsers || [];
        }
      } catch (err) {
        console.warn('Failed to fetch custom users', err);
      }

      const combinedUsers = [...AUTH_CREDENTIALS[targetRole], ...customUsers.filter(u => u.role === targetRole)];
      const cleanUsername = username ? String(username).toLowerCase().trim() : '';
      const cleanPassword = password ? String(password).trim() : '';
      const validUser = combinedUsers.find(u => String(u.username).toLowerCase() === cleanUsername && u.password === cleanPassword);
      
      if (!validUser) {
        logAuthEvent({
          role: targetRole,
          userName: username || 'Unknown',
          storeId: activeStore,
          action: 'LOGIN_FAILED',
          status: 'failed',
          reason: 'Incorrect username or password',
          method: 'CREDENTIALS'
        });
        return { success: false, message: `Incorrect username or password for ${nameMap[targetRole]}.` };
      }
      
      loggedUser = {
        id: validUser.username,
        username: validUser.username,
        role: targetRole,
        name: validUser.name,
        loginTime: new Date().toISOString()
      };
    } else {
      // Cashier
      loggedUser = {
        id: 'cashier',
        username: 'cashier',
        role: 'cashier',
        name: nameMap.cashier,
        loginTime: new Date().toISOString()
      };
    }

    setUser(loggedUser);

    try { localStorage.removeItem('cobb_auth_user'); } catch {}

    // Security: Automatically lock non-owners out of 'ALL' view
    if (targetRole !== 'owner') {
      setActiveStore(prev => {
        const locked = (!prev || prev === 'ALL') ? 'DEMO_STORE_001' : prev;
        try { localStorage.setItem('cobb_active_store', locked); } catch {}
        return locked;
      });
    }

    // Record login audit event to Cloud Firestore & backend
    logAuthEvent({
      role: targetRole,
      userName: loggedUser.name,
      storeId: activeStore,
      action: 'LOGIN_SUCCESS',
      status: 'success',
      method: targetRole === 'cashier' ? '1-TAP' : 'CREDENTIALS'
    });

    return { success: true, user: loggedUser };
  };

  const loginWithBiometrics = async (username) => {
    let customUsers = [];
    try {
      const accountsRef = doc(db, 'stores', activeStore, 'data', 'accounts');
      const snap = await getDoc(accountsRef);
      if (snap.exists()) {
        customUsers = snap.data().customUsers || [];
      }
    } catch (err) {
      console.warn('Failed to fetch custom users', err);
    }

    const allUsers = [
      ...AUTH_CREDENTIALS.owner.map(u => ({ ...u, role: 'owner' })),
      ...AUTH_CREDENTIALS.manager.map(u => ({ ...u, role: 'manager' })),
      ...customUsers
    ];

    const validUser = allUsers.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
    if (!validUser) {
      return { success: false, message: `Account '${username}' not found on this system.` };
    }

    const loggedUser = {
      id: validUser.username,
      username: validUser.username,
      role: validUser.role || 'owner',
      name: validUser.name || validUser.username,
      loginTime: new Date().toISOString()
    };

    setUser(loggedUser);

    try { localStorage.removeItem('cobb_auth_user'); } catch {}

    if (loggedUser.role !== 'owner') {
      setActiveStore(prev => {
        const locked = (!prev || prev === 'ALL') ? 'DEMO_STORE_001' : prev;
        try { localStorage.setItem('cobb_active_store', locked); } catch {}
        return locked;
      });
    }

    logAuthEvent({
      role: loggedUser.role,
      userName: loggedUser.name,
      storeId: activeStore,
      action: 'LOGIN_SUCCESS',
      status: 'success',
      method: 'BIOMETRICS'
    });

    return { success: true, user: loggedUser };
  };

  const logout = () => {
    if (user) {
      logAuthEvent({
        role: user.role,
        userName: user.name,
        storeId: activeStore,
        action: 'LOGOUT',
        status: 'success',
        method: 'MANUAL'
      });
    }
    setUser(null);
    try { localStorage.removeItem('cobb_auth_user'); } catch {}
  };

  const canAccessTab = (tabId) => {
    const allowed = ROLE_PERMISSIONS[user?.role];
    if (allowed === null || allowed === undefined) return true;
    return allowed.includes(tabId);
  };

  const requestAccount = async (accountData) => {
    try {
      const accountsRef = doc(db, 'stores', activeStore, 'data', 'accounts');
      const snap = await getDoc(accountsRef);
      const pendingUsers = snap.exists() ? (snap.data().pendingUsers || []) : [];
      
      // Ensure unique ID
      if (pendingUsers.find(u => u.username === accountData.username)) {
        return { success: false, message: 'ID already requested.' };
      }

      const newRequest = {
        ...accountData,
        id: Date.now().toString(),
        requestedAt: new Date().toISOString()
      };

      await setDoc(accountsRef, { pendingUsers: [...pendingUsers, newRequest] }, { merge: true });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to submit request.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || 'owner',
      switchRole,
      activeStore,
      switchStore,
      AVAILABLE_STORES,
      ROLE_PERMISSIONS,
      ROLE_LABELS,
      login,
      loginWithBiometrics,
      logout,
      canAccessTab,
      rememberOwner,
      setRememberOwner,
      requestAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
