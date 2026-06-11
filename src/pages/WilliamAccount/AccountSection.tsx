/** Resolves /william/account/:slug → the matching section page. */
import { useParams, Navigate } from 'react-router-dom';
import { ACCOUNT_ITEMS } from './sections';
import { ComingSoon } from './AccountSubPage';
import Currency from './Currency';

const PAGES: Record<string, () => JSX.Element> = {
  currency: Currency,
};

export default function AccountSection() {
  const { slug = '' } = useParams();
  const item = ACCOUNT_ITEMS[slug];
  if (!item) return <Navigate to="/william/account" replace />;
  const Page = PAGES[slug];
  return Page ? <Page /> : <ComingSoon title={item.label} />;
}
