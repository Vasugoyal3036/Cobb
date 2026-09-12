import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Hardcode an authenticated user so the login screen is never shown
  const [user, setUser] = useState({ id: 1, username: 'admin', role: 'owner' });

  const login = async (username, password) => {
    setUser({ id: 1, username: username, role: 'owner' });
    return { success: true };
  };

  const logout = () => {
    // Optional: could do something here, but we are removing auth
    setUser(null); 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
