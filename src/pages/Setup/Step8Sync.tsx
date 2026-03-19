import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, Input } from '../../components/ui';

interface Step8SyncProps {
  onNext: () => void;   // advance to Done
  onBack: () => void;
}

export default function Step8Sync({ onNext, onBack }: Step8SyncProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-8 max-w-md mx-auto">
        <div>
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-white/50">
            We sent a sign-in link to <span className="text-white font-medium">{email}</span>.
            <br />
            Click the link in the email to sign in.
          </p>
        </div>

        <p className="text-white/30 text-sm">
          Didn't get it? Check spam or{' '}
          <button className="text-white/50 underline hover:text-white transition-colors" onClick={() => { setSent(false); setError(null); }}>
            try again
          </button>.
        </p>

        <button className="text-white/30 text-sm hover:text-white/60 transition-colors" onClick={onNext}>
          Continue without syncing →
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8 max-w-md mx-auto">
      <div>
        <div className="text-5xl mb-4">🔄</div>
        <h1 className="text-3xl font-bold text-white mb-2">Sync across your devices</h1>
        <p className="text-white/50">
          Sign in with your email and your data will automatically stay in sync
          between your phone and computer. No password needed.
        </p>
      </div>

      <div className="space-y-3 text-left max-w-sm mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
        />
        {error && <p className="text-[#EF4444] text-sm">{error}</p>}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => void handleSend()}
          disabled={!email.trim() || loading}
        >
          {loading ? 'Sending…' : 'Send Link'}
        </Button>
      </div>

      <div className="space-y-2">
        <button
          className="block w-full text-white/30 text-sm hover:text-white/60 transition-colors"
          onClick={onNext}
        >
          Continue without syncing →
        </button>
        <button
          className="block w-full text-white/20 text-xs hover:text-white/40 transition-colors"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      <p className="text-white/20 text-xs max-w-xs mx-auto">
        Your data is encrypted in transit and only accessible by you. You can sign out at any time from Settings.
      </p>
    </div>
  );
}
