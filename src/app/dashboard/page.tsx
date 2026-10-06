import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Your private emotion journal: aggregate charts, session history and one-click JSON/CSV exports. Stored only in your browser.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
