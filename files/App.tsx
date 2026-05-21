import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import EntriesPage from './pages/EntriesPage';
import PersonsPage from './pages/PersonsPage';
import GroupsPage from './pages/GroupsPage';
import ApiReference from './pages/ApiReference';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import './App.css';

export type Page = 'dashboard' | 'entries' | 'persons' | 'groups' | 'api';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const pages: Record<Page, JSX.Element> = {
    dashboard: <Dashboard onNavigate={setActivePage} />,
    entries:   <EntriesPage />,
    persons:   <PersonsPage />,
    groups:    <GroupsPage />,
    api:       <ApiReference />,
  };

  return (
    <div className="app-shell">
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <div className="main-area">
        <Topbar page={activePage} onNavigate={setActivePage} />
        <div className="page-content">
          {pages[activePage]}
        </div>
      </div>
    </div>
  );
}
