import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Storefront } from './components/Storefront';
import {
  DEFAULT_PACKAGES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
} from './defaults';
import { auth } from './lib/firebase';
import {
  subscribePackages,
  subscribePaymentSettings,
  subscribeStorefrontSettings,
  verifyAdminAccess,
} from './lib/storeService';
import {
  CoursePackage,
  PaymentSettings,
  StorefrontSettings,
} from './types';

function isAdminPath(pathname: string, hash: string) {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '');
  const cleanHash = hash.toLowerCase();
  return (
    cleanPath === '/admin' ||
    cleanPath.startsWith('/admin/') ||
    cleanHash === '#/admin' ||
    cleanHash.startsWith('#/admin/')
  );
}

export default function App() {
  const [routeIsAdmin, setRouteIsAdmin] = useState<boolean>(() =>
    isAdminPath(window.location.pathname, window.location.hash)
  );

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Live Storefront Data
  const [dbPackages, setDbPackages] = useState<CoursePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [storefront, setStorefront] = useState<StorefrontSettings>(
    DEFAULT_STOREFRONT_SETTINGS
  );
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(
    DEFAULT_PAYMENT_SETTINGS
  );

  // Listen to browser navigation (e.g. Back/Forward or direct /admin route)
  useEffect(() => {
    const handleRouteChange = () => {
      setRouteIsAdmin(
        isAdminPath(window.location.pathname, window.location.hash)
      );
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const ok = await verifyAdminAccess(
          currentUser.uid,
          currentUser.email,
          currentUser.emailVerified
        );
        setIsAdmin(ok);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to public catalog & settings
  useEffect(() => {
    const unsubPackages = subscribePackages(
      (items) => {
        setDbPackages(items);
        setLoadingPackages(false);
      },
      () => {
        setLoadingPackages(false);
      }
    );

    const unsubStore = subscribeStorefrontSettings((data) => {
      if (data) setStorefront(data);
    });

    const unsubPay = subscribePaymentSettings((data) => {
      if (data) setPaymentSettings(data);
    });

    return () => {
      unsubPackages();
      unsubStore();
      unsubPay();
    };
  }, []);

  function navigateTo(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setRouteIsAdmin(isAdminPath(path, window.location.hash));
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  const effectivePackages =
    dbPackages.length > 0 ? dbPackages : DEFAULT_PACKAGES;

  if (routeIsAdmin) {
    return (
      <AdminPanel
        user={user}
        authLoading={authLoading}
        isAdmin={isAdmin}
        packages={effectivePackages}
        hasDbPackages={dbPackages.length > 0}
        storefront={storefront}
        paymentSettings={paymentSettings}
        onNavigateStorefront={() => navigateTo('/')}
      />
    );
  }

  return (
    <Storefront
      packages={effectivePackages}
      loadingPackages={loadingPackages}
      storefront={storefront}
      paymentSettings={paymentSettings}
      onNavigateAdmin={() => navigateTo('/admin')}
    />
  );
}
