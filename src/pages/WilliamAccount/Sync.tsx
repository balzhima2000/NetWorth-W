import { useState } from 'react';
import { Card, Button, Field, TextInput } from '../../components/william';
import { useAuth } from '../../hooks/useAuth';
import { useSyncManager } from '../../hooks/useSyncManager';
import { supabaseConfigured } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { AccountSubPage } from './AccountSubPage';

const STATUS_LABEL: Record<string, string> = {
  syncing: 'Syncing…', idle: 'Up to date', error: 'Sync error — will retry', offline: 'Offline — will sync when reconnected',
};

export default function Sync() {
  const toast = useToast();
  const { user, sendMagicLink, verifyOtp, signOut } = useAuth();
  const { syncStatus, lastSyncedAt, forcePull, forcePush } = useSyncManager();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!supabaseConfigured) {
    return (
      <AccountSubPage title="Sync & account" subtitle="Back up and sync across devices.">
        <Card className="p-6 text-[14px] text-secondary">Cloud sync isn’t configured in this build. Your data is saved locally on this device.</Card>
      </AccountSubPage>
    );
  }

  const send = async () => {
    if (!email) return; setBusy(true);
    const { error } = await sendMagicLink(email);
    setBusy(false);
    if (error) toast.error(error); else { setSent(true); toast.success('Code sent — check your email.'); }
  };
  const verify = async () => {
    if (!code) return; setBusy(true);
    const { error } = await verifyOtp(email, code);
    setBusy(false);
    if (error) toast.error(error); else toast.success('Signed in — syncing.');
  };

  return (
    <AccountSubPage title="Sync & account" subtitle="Back up and sync across devices.">
      {user ? (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-secondary">Signed in as</span>
            <span className="text-[15px] font-semibold text-ink">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-secondary">Status</span>
            <span className="text-[14px] font-medium text-ink">
              {STATUS_LABEL[syncStatus] ?? syncStatus}
              {syncStatus === 'idle' && lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString()}` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="s" pill variant="tonal" onClick={() => void forcePull()}>Pull from cloud</Button>
            <Button size="s" pill variant="tonal" onClick={() => void forcePush()}>Push to cloud</Button>
            <Button size="s" pill variant="ghost" onClick={() => void signOut()}>Sign out</Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-5">
          <p className="text-[14px] text-secondary">Sign in with your email to back up and sync. We’ll send a one-time code.</p>
          <Field label="Email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" inputMode="email" /></Field>
          {sent && <Field label="Code"><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" /></Field>}
          <div className="flex gap-2">
            {!sent
              ? <Button size="l" pill variant="primary" disabled={!email || busy} onClick={send}>{busy ? 'Sending…' : 'Send code'}</Button>
              : <Button size="l" pill variant="primary" disabled={!code || busy} onClick={verify}>{busy ? 'Verifying…' : 'Verify & sign in'}</Button>}
            {sent && <Button size="l" pill variant="ghost" onClick={() => setSent(false)}>Back</Button>}
          </div>
        </Card>
      )}
    </AccountSubPage>
  );
}
