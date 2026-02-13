import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavItem } from '../../types';
import { UploadPage } from '../upload/UploadPage';
import { DownloadPage } from '../download/DownloadPage';
import { HistoryPage } from '../history/HistoryPage';
import { SettingsPage } from '../settings/SettingsPage';

export function Layout() {
  const [activeNav, setActiveNav] = useState<NavItem>('upload');

  const renderPage = () => {
    switch (activeNav) {
      case 'upload':
        return <UploadPage onNavigateToDownload={() => setActiveNav('download')} />;
      case 'download':
        return <DownloadPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <UploadPage onNavigateToDownload={() => setActiveNav('download')} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />
        <main className="flex-1 overflow-auto p-6">{renderPage()}</main>
      </div>
    </div>
  );
}
