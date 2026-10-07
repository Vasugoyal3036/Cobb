import React, { createContext, useContext, useState, useCallback } from 'react';
import { logAuthEvent } from '../utils/auditLogger';

export const AVAILABLE_STORES = [
  { id: 'DEMO_STORE_001', name: 'Cobb Pundri (Main)', shortName: 'Pundri', code: 'PUNDRI', location: 'Fatehpur Road, Pundri' },
  { id: 'STORE_02', name: 'Cobb Branch 2 (New)', shortName: 'Branch 2', code: 'BRANCH_2', location: 'New Branch Market' },
  { id: 'ALL', name: 'All Stores (Combined)', shortName: 'All Stores', code: 'ALL', location: 'Consolidated Multi-Store View' }
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
    'smart_bundles','loyalty','ratings','vip','dormant','wardrobe','retention',
  ],
  cashier: ['speed_billing','live','denomination','returns','alterations','hold_desk','deadstock'],
};

export const ROLE_LABELS = {
  owner:   { label: 'Owner',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  manager: { label: 'Manager', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cashier: { label: 'Cashier', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

// -- PIN helpers --------------------------------------------------------------
const PIN_STORAGE_KEY = 'cobb_role_pins';
const REMEMBER_KEY    = 'cobb_owner_remembered';

/** Roles that require a PIN to switch to. Cashier is open. */
export const PIN_PROTECTED_ROLES = ['owner', 'manager'];
const DEFAULT_PINS = { owner: '1234', manager: '5678', cashier: '0000' };

function loadPins() {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PINS };
    return { ...DEFAULT_PINS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_PINS }; }
}
function savePins(pins) {
  try { localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins)); } catch {}
}
// ----------------------------------------------------------------------------

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const c = localStorage.getItem('cobb_auth_user');
      return c ? JSON.parse(c) : null;
    } catch { return null; }
  });

  const [activeStore, setActiveStore] = useState(() => {
    const s = localStorage.getItem('cobb_active_store');
    if (!s || s === 'STORE_01') return 'DEMO_STORE_001';
    return s;
  });

  // -- PIN state --------------------------------------------
  const [pins, setPins] = useState(loadPins);

  const [rememberOwner, setRememberOwnerState] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) === 'true'; } catch { return false; }
  });
  const setRememberOwner = useCallback((val) => {
    setRememberOwnerState(val);
    try { localStorage.setItem(REMEMBER_KEY, String(val)); } catch {}
  }, []);

  /** Returns true if the pin matches the stored pin for that role */
  const verifyPin = useCallback((role, pin) => pins[role] === pin, [pins]);

  /** Change PIN after verifying old PIN. Returns { success, message? } */
  const changePin = useCallback((role, oldPin, newPin) => {
    if (pins[role] !== oldPin) return { success: false, message: 'Current PIN is incorrect.' };
    if (!newPin || newPin.length < 4) return { success: false, message: 'New PIN must be at least 4 characters.' };
    const updated = { ...pins, [role]: newPin };
    setPins(updated);
    savePins(updated);
    return { success: true };
  }, [pins]);

  /** Returns true if switching to targetRole requires PIN entry */
  const roleRequiresPin = useCallback((targetRole) => {
    if (!PIN_PROTECTED_ROLES.includes(targetRole)) return false;
    if (targetRole === 'owner' && rememberOwner) return false;
    return true;
  }, [rememberOwner]);
  // --------------------------------------------------------

  const switchRole = (newRole, pin = null) => {
    const nameMap = { owner: 'Parbhat Goyal', manager: 'Store Manager', cashier: 'Counter Staff' };
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

  const login = async (role = 'owner', pin = '', rememberDevice = true) => {
    const nameMap = { owner: 'Parbhat Goyal', manager: 'Store Manager', cashier: 'Counter Staff' };
    const targetRole = (role || 'owner').toLowerCase();

    // Verify PIN if protected role
    if (PIN_PROTECTED_ROLES.includes(targetRole)) {
      const isValid = verifyPin(targetRole, pin);
      if (!isValid) {
        logAuthEvent({
          role: targetRole,
          userName: nameMap[targetRole] || 'Staff',
          storeId: activeStore,
          action: 'LOGIN_FAILED',
          status: 'failed',
          reason: 'Incorrect PIN entered',
          method: 'PIN'
        });
        return { success: false, message: `Incorrect PIN for ${nameMap[targetRole]}.` };
      }
    }

    const loggedUser = {
      id: targetRole === 'owner' ? 1 : targetRole === 'manager' ? 2 : 3,
      username: targetRole,
      role: targetRole,
      name: nameMap[targetRole] || 'Staff',
      loginTime: new Date().toISOString()
    };

    setUser(loggedUser);

    if (rememberDevice) {
      try { localStorage.setItem('cobb_auth_user', JSON.stringify(loggedUser)); } catch {}
    } else {
      try { localStorage.removeItem('cobb_auth_user'); } catch {}
    }

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
      userName: nameMap[targetRole] || 'Staff',
      storeId: activeStore,
      action: 'LOGIN_SUCCESS',
      status: 'success',
      method: 'PIN'
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
      logout,
      canAccessTab,
      verifyPin,
      changePin,
      roleRequiresPin,
      rememberOwner,
      setRememberOwner,
      PIN_PROTECTED_ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
