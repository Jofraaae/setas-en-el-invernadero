import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Home from '@/pages/Home';

const AuthenticatedApp = () => {
  // Sin Base44 no hay comprobación de sesión: el juego se renderiza directamente.
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<Home />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        {/* Vercel Web Analytics: visitas y páginas vistas (solo envía datos en despliegues de Vercel) */}
        <Analytics />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App