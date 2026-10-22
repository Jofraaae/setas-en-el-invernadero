import React, { createContext, useContext } from 'react';

/* El juego no necesita cuentas: antes AuthContext consultaba las settings de la app
   y el token de Base44. Ahora siempre hay un "usuario" local y todo fluye directo. */

const AuthContext = createContext();

const LOCAL_USER = { id: 'local', email: '', full_name: 'Invitado', role: 'user' };

export const AuthProvider = ({ children }) => {
  const value = {
    user: LOCAL_USER,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    authChecked: true,
    logout: () => {},
    navigateToLogin: () => {},
    checkUserAuth: async () => {},
    checkAppState: async () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
