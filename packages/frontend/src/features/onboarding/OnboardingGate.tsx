import type { Customer } from '@dreck/shared/api/customers';
import type { ReactNode } from 'react';
import { useQuery } from '@/api/useQuery';
import { Page } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { OnboardingPage } from './OnboardingPage';

type OnboardingGateProps = {
  /** The current page, shown once a Customer exists. */
  children: ReactNode;
};

/**
 * Shows the onboarding instead of any page while there is no Customer. Without a Customer
 * there can be no Expense either, so this is the whole check.
 * @example <OnboardingGate><Outlet /></OnboardingGate>
 */
export function OnboardingGate({ children }: OnboardingGateProps): ReactNode {
  const customers = useQuery<Customer[]>('/customers');
  if (customers.status === 'ready') {
    return customers.data.length === 0 ? <OnboardingPage /> : children;
  }
  return (
    <Page>
      <QueryView state={customers}>{() => null}</QueryView>
    </Page>
  );
}
