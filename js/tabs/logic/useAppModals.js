export function useAppModals({ React }) {
  const { useState, useEffect } = React;

  const [showNameModal, setShowNameModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDisplayModeMenu, setShowDisplayModeMenu] = useState(false);
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [moveStoreModal, setMoveStoreModal] = useState(null);

  const [storeSearchModal, setStoreSearchModal] = useState(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchIndex, setStoreSearchIndex] = useState(0);
  const [permissionsModal, setPermissionsModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [storeChangeConfirmModal, setStoreChangeConfirmModal] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [driverViewModal, setDriverViewModal] = useState(null);
  const [routeMapModal, setRouteMapModal] = useState(null);
  const [expirationAlertsModal, setExpirationAlertsModal] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [copyRoutesModal, setCopyRoutesModal] = useState(null);
  const [versionMismatch, setVersionMismatch] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showOnlineUsers && !e.target.closest('.online-users-dropdown')) {
        setShowOnlineUsers(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOnlineUsers]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDisplayModeMenu && !e.target.closest('.display-mode-dropdown')) {
        setShowDisplayModeMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDisplayModeMenu]);

  useEffect(() => {
    const handleAccountsMenuOutside = (e) => {
      if (showAccountsMenu && !e.target.closest('.accounts-nav-dropdown')) {
        setShowAccountsMenu(false);
      }
    };
    document.addEventListener('click', handleAccountsMenuOutside);
    return () => document.removeEventListener('click', handleAccountsMenuOutside);
  }, [showAccountsMenu]);

  return {
    showNameModal,
    setShowNameModal,
    showUserMenu,
    setShowUserMenu,
    showDisplayModeMenu,
    setShowDisplayModeMenu,
    showAccountsMenu,
    setShowAccountsMenu,
    moveStoreModal,
    setMoveStoreModal,
    storeSearchModal,
    setStoreSearchModal,
    storeSearchQuery,
    setStoreSearchQuery,
    storeSearchIndex,
    setStoreSearchIndex,
    permissionsModal,
    setPermissionsModal,
    deleteConfirmModal,
    setDeleteConfirmModal,
    showLogoutModal,
    setShowLogoutModal,
    storeChangeConfirmModal,
    setStoreChangeConfirmModal,
    infoModal,
    setInfoModal,
    driverViewModal,
    setDriverViewModal,
    routeMapModal,
    setRouteMapModal,
    expirationAlertsModal,
    setExpirationAlertsModal,
    showOnlineUsers,
    setShowOnlineUsers,
    copyRoutesModal,
    setCopyRoutesModal,
    versionMismatch,
    setVersionMismatch
  };
}
