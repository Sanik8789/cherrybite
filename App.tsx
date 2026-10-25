import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  UserProfile,
  AppSettings,
  MenuItem,
  FoodRecord,
  DemandForecast,
} from './types';
import * as dataService from './services/dataService';

// Layout & Modals
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AuthModal } from './components/auth/AuthModal';
import { EditProfileModal } from './components/auth/EditProfileModal';
import { QuickLogModal } from './components/menu/QuickLogModal';

// Views
import { LandingPage } from './components/landing/LandingPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { WeeklyAnalysisView } from './components/weekly/WeeklyAnalysisView';
import { MonthlyAnalysisView } from './components/monthly/MonthlyAnalysisView';
import { MenuManagementView } from './components/menu/MenuManagementView';
import { FoodWasteTrackerView } from './components/tracker/FoodWasteTrackerView';
import { DemandForecastView } from './components/forecast/DemandForecastView';
import { DatasetView } from './components/dataset/DatasetView';
import { SettingsView } from './components/settings/SettingsView';
import { AboutProjectView } from './components/about/AboutProjectView';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [user, setUser] = useState<UserProfile>({
    name: '',
    canteenName: '',
    email: '',
    isLoggedIn: false,
  });
  const [settings, setSettings] = useState<AppSettings>({
    managerName: '',
    canteenName: '',
    currency: '₹',
    defaultSafetyBuffer: 10,
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [savedForecasts, setSavedForecasts] = useState<DemandForecast[]>([]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Quick log modal triggered from dashboard snapshot
  const [quickLogItem, setQuickLogItem] = useState<MenuItem | null>(null);

  // Initial load
  const loadAllData = useCallback(async () => {
    try {
      dataService.initializeStorageIfEmpty();
      const [u, s, m, r, f] = await Promise.all([
        dataService.getUserProfile(),
        dataService.getSettings(),
        dataService.getMenuItems(),
        dataService.getFoodRecords(),
        dataService.getForecasts(),
      ]);
      setUser(u);
      setSettings(s);
      setMenuItems(m);
      setRecords(r);
      setSavedForecasts(f);

      // If user was logged in previously in localStorage, land on dashboard
      if (u.isLoggedIn) {
        setActiveTab('dashboard');
      } else {
        setActiveTab('landing');
      }
    } catch (err) {
      console.error('[CherryBite] Error loading application data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auth actions
  const handleLoginSuccess = async (profile: UserProfile) => {
    const updated = await dataService.updateUserProfile({ ...profile, isLoggedIn: true });
    setUser(updated);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    const updated = await dataService.updateUserProfile({ isLoggedIn: false });
    setUser(updated);
    setActiveTab('landing');
  };

  const handleUpdateProfile = async (profileUpdates: Partial<UserProfile>) => {
    const updated = await dataService.updateUserProfile(profileUpdates);
    setUser(updated);
  };

  // Menu item actions
  const handleAddMenuItem = async (itemData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    await dataService.createMenuItem(itemData);
    const updated = await dataService.getMenuItems();
    setMenuItems(updated);
  };

  const handleUpdateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    await dataService.updateMenuItem(id, updates);
    const updated = await dataService.getMenuItems();
    setMenuItems(updated);
  };

  const handleDeleteMenuItem = async (id: string) => {
    await dataService.deleteMenuItem(id);
    const updated = await dataService.getMenuItems();
    setMenuItems(updated);
  };

  // Food record actions
  const handleAddFoodRecord = async (
    recordData: Omit<FoodRecord, 'id' | 'estimatedWasteCost' | 'createdAt'>
  ) => {
    await dataService.createFoodRecord(recordData);
    const updated = await dataService.getFoodRecords();
    setRecords(updated);
  };

  const handleUpdateFoodRecord = async (id: string, updates: Partial<FoodRecord>) => {
    await dataService.updateFoodRecord(id, updates);
    const updated = await dataService.getFoodRecords();
    setRecords(updated);
  };

  const handleDeleteFoodRecord = async (id: string) => {
    await dataService.deleteFoodRecord(id);
    const updated = await dataService.getFoodRecords();
    setRecords(updated);
  };

  // Forecast actions
  const handleSaveForecast = async (
    forecastData: Omit<DemandForecast, 'id' | 'createdAt'>
  ) => {
    await dataService.saveForecast(forecastData);
    const updated = await dataService.getForecasts();
    setSavedForecasts(updated);
  };

  const handleDeleteForecast = async (id: string) => {
    await dataService.deleteForecast(id);
    const updated = await dataService.getForecasts();
    setSavedForecasts(updated);
  };

  // Dataset actions
  const handleImportRecords = async (
    newRecords: FoodRecord[],
    mode: 'append' | 'replace'
  ) => {
    await dataService.importRecords(newRecords, mode);
    const updated = await dataService.getFoodRecords();
    setRecords(updated);
  };

  const handleResetDataset = async () => {
    await dataService.resetToSampleDataset();
    await loadAllData();
  };

  const handleClearDataset = async () => {
    await dataService.clearAllDemoData();
    const updated = await dataService.getFoodRecords();
    const updatedFc = await dataService.getForecasts();
    setRecords(updated);
    setSavedForecasts(updatedFc);
  };

  // Settings actions
  const handleUpdateSettings = async (settingsUpdates: Partial<AppSettings>) => {
    const updated = await dataService.updateSettings(settingsUpdates);
    setSettings(updated);
  };

  // Render view router
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            records={records}
            menuItems={menuItems}
            currency={settings.currency || '₹'}
            onViewAllRecords={() => setActiveTab('tracker')}
            onOpenMenu={() => setActiveTab('menu')}
            onQuickLog={(item) => setQuickLogItem(item)}
          />
        );

      case 'weekly':
        return (
          <WeeklyAnalysisView
            records={records}
            currency={settings.currency || '₹'}
          />
        );

      case 'monthly':
        return (
          <MonthlyAnalysisView
            records={records}
            currency={settings.currency || '₹'}
          />
        );

      case 'menu':
        return (
          <MenuManagementView
            menuItems={menuItems}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onSaveDailyRecord={handleAddFoodRecord}
            currency={settings.currency || '₹'}
          />
        );

      case 'tracker':
        return (
          <FoodWasteTrackerView
            records={records}
            menuItems={menuItems}
            onAddRecord={handleAddFoodRecord}
            onUpdateRecord={handleUpdateFoodRecord}
            onDeleteRecord={handleDeleteFoodRecord}
            currency={settings.currency || '₹'}
          />
        );

      case 'forecast':
        return (
          <DemandForecastView
            records={records}
            menuItems={menuItems}
            savedForecasts={savedForecasts}
            onSaveForecast={handleSaveForecast}
            onDeleteForecast={handleDeleteForecast}
            defaultSafetyBuffer={settings.defaultSafetyBuffer || 10}
            currency={settings.currency || '₹'}
          />
        );

      case 'dataset':
        return (
          <DatasetView
            records={records}
            onImportRecords={handleImportRecords}
            onResetDataset={handleResetDataset}
            onClearDataset={handleClearDataset}
            currency={settings.currency || '₹'}
          />
        );

      case 'settings':
        return (
          <SettingsView
            settings={settings}
            user={user}
            records={records}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUser={handleUpdateProfile}
            onResetDataset={handleResetDataset}
            onClearDataset={handleClearDataset}
          />
        );

      case 'about':
        return <AboutProjectView />;

      case 'landing':
      default:
        return (
          <LandingPage
            onGetStarted={() => setIsAuthModalOpen(true)}
            onExploreDemo={() => {
              handleLoginSuccess({
                name: 'Prof. Rajesh Sharma',
                canteenName: 'Central Campus Canteen',
                email: 'manager.canteen@campus.edu.in',
                isLoggedIn: true,
              });
            }}
            onLearnMore={() => {
              const el = document.getElementById('academic-overview');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                setActiveTab('about');
              }
            }}
          />
        );
    }
  };

  // If on landing page and not logged in, render pure LandingPage
  if (activeTab === 'landing' && !user.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FDFBFC]">
        {renderCurrentView()}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Otherwise, render full application shell with Topbar & Sidebar
  return (
    <div className="min-h-screen bg-[#FDFBFC] text-[#25212A] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        onLogout={handleLogout}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />

        {/* Main Content Pane */}
        <main className="flex-1 lg:pl-68 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={user}
        onSave={handleUpdateProfile}
      />

      {/* Quick Log Modal Triggered From Dashboard snapshot */}
      <QuickLogModal
        isOpen={!!quickLogItem}
        onClose={() => setQuickLogItem(null)}
        item={quickLogItem}
        onSaveRecord={handleAddFoodRecord}
        currency={settings.currency || '₹'}
      />
    </div>
  );
}

export default App;
