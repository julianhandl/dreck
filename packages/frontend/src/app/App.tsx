import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { InvoiceDetailPage } from '@/features/invoices/InvoiceDetailPage';
import { InvoiceFormPage } from '@/features/invoices/InvoiceFormPage';
import { InvoicesPage } from '@/features/invoices/InvoicesPage';
import { NewInvoicePage } from '@/features/invoices/NewInvoicePage';
import { LoginDialog } from '@/features/login/LoginDialog';
import { CustomerFormPage } from '@/features/projects/CustomerFormPage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { ProjectFormPage } from '@/features/projects/ProjectFormPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { DefaultTasksPage } from '@/features/settings/DefaultTasksPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TimePage } from '@/features/time/TimePage';
import { I18nProvider } from '@/i18n/I18nProvider';
import { SettingsProvider } from '@/settings/SettingsProvider';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './NotFoundPage';

/**
 * Root of the SPA: settings, i18n, login dialog, routing and the page frame.
 * @example <App />
 */
export function App(): ReactElement {
  return (
    <SettingsProvider>
      <I18nProvider>
        <LoginDialog />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<TimePage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<ProjectFormPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
              <Route path="projects/customers/new" element={<CustomerFormPage />} />
              <Route path="projects/customers/:customerId/edit" element={<CustomerFormPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<NewInvoicePage />} />
              <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
              <Route path="invoices/:invoiceId/edit" element={<InvoiceFormPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/tasks" element={<DefaultTasksPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </SettingsProvider>
  );
}
