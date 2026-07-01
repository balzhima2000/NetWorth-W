/** Resolves /william/account/:slug → the matching section page. */
import type { JSX } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ACCOUNT_ITEMS } from './sections';
import Api from './Api';
import Currency from './Currency';
import { ExpenseCategories, IncomeCategories } from './Categories';
import Cards from './Cards';
import IncomeDestinations from './IncomeDestinations';
import Assets from './Assets';
import Sync from './Sync';
import Data from './Data';
import Danger from './Danger';

const PAGES: Record<string, () => JSX.Element> = {
  'api': Api,
  'currency': Currency,
  'expense-categories': ExpenseCategories,
  'income-categories': IncomeCategories,
  'cards': Cards,
  'income-destinations': IncomeDestinations,
  'assets': Assets,
  'sync': Sync,
  'data': Data,
  'danger': Danger,
};

export default function AccountSection() {
  const { slug = '' } = useParams();
  if (!ACCOUNT_ITEMS[slug]) return <Navigate to="/william/account" replace />;
  const Page = PAGES[slug];
  return Page ? <Page /> : <Navigate to="/william/account" replace />;
}
