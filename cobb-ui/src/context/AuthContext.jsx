import React, { createContext, useContext, useState } from 'react';

export const AVAILABLE_STORES = [
  { id: 'STORE_01', name: 'Cobb Pundri (Main)', shortName: 'Pundri', code: 'PUNDRI', location: 'Fatehpur Road, Pundri' },
  { id: 'STORE_02', name: 'Cobb Branch 2 (New)', shortName: 'Branch 2', code: 'BRANCH_2', location: 'New Branch Market' },
  { id: 'ALL', name: 'All Stores (Combined)', shortName: 'All Stores', code: 'ALL', location: 'Consolidated Multi-Store View' }
];

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cobb_auth_user');
      return cached ? JSON.parse(cached) : { id: 1, username: 'admin', role: 'owner', name: 'Parbhat Goyal' };
    } catch {
      return { id: 1, username: 'admin', role: 'owner', name: 'Parbhat Goyal' };
    }
  });

  const [activeStore, setActiveStore] = useState(() => {
    return localStorage.getItem('cobb_active_store') || 'STORE_01';
  });

  const switchRole = (newRole) => {
    const updated = {
      ...user,
      role: newRole,
      name: newRole === 'owner' ? 'Parbhat Goyal' : 'Store Manager'
    };
    setUser(updated);
    try {
      localStorage.setItem('cobb_auth_user', JSON.stringify(updated));
    } catch {}
  };

  const switchStore = (storeId) => {
    setActiveStore(storeId);
    try {
      localStorage.setItem('cobb_active_store', storeId);
    } catch {}
  };

  const login = async (username, password, role = 'owner') => {
    const loggedUser = {
      id: role === 'owner' ? 1 : 2,
      username: username || (role === 'owner' ? 'admin' : 'manager'),
      role: role,
      name: role === 'owner' ? 'Parbhat Goyal' : 'Store Manager'
    };
    setUser(loggedUser);
    try {
      localStorage.setItem('cobb_auth_user', JSON.stringify(loggedUser));
    } catch {}
    return { success: true };
  };

  const logout = () => {
    const defaultUser = { id: 2, username: 'manager', role: 'manager', name: 'Store Manager' };
    setUser(defaultUser);
    try {
      localStorage.setItem('cobb_auth_user', JSON.stringify(defaultUser));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || 'owner',
      switchRole,
      activeStore,
      switchStore,
      AVAILABLE_STORES,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
