import React, { useState } from 'react';
import { Loader2, LogOut, Trash2 } from 'lucide-react';

interface SettingsProps {
  userEmail?: string;
  onChangePassword: (password: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSignOut: () => void;
}

export const SettingsPanel: React.FC<SettingsProps> = ({
  userEmail,
  onChangePassword,
  onDeleteAccount,
  onSignOut,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = userEmail ?? '';
  const canDelete = deleteConfirmation.trim().toLowerCase() === email.toLowerCase();

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await onChangePassword(password);
      setPassword('');
      setConfirmPassword('');
      setMessage('Password updated.');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) {
      return;
    }

    try {
      setDeletingAccount(true);
      setError(null);
      setMessage(null);
      await onDeleteAccount();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="reading-column py-12">
      <div className="mb-12">
        <p className="text-label-sm text-primary mb-4">Account Settings</p>
        <h1 className="text-display-lg font-black mb-4">Settings</h1>
      </div>

      <div className="flex flex-col gap-10 pb-32">
        {message ? (
          <div className="border border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="border border-primary bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
            {error}
          </div>
        ) : null}

        <section className="border border-black bg-white p-8 brutalist-shadow-small">
          <p className="text-label-sm text-primary mb-3">Account</p>
          <h2 className="text-headline-md mb-6">Signed in as</h2>
          <p className="text-body-md font-bold break-all mb-6">{email}</p>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 border border-black px-4 py-3 text-label-sm hover:bg-black hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </section>

        <section className="border border-black bg-white p-8 brutalist-shadow-small">
          <p className="text-label-sm text-primary mb-3">Security</p>
          <h2 className="text-headline-md mb-6">Change password</h2>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
            <label className="block">
              <span className="text-label-sm block mb-2">New password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full border border-black bg-background px-4 py-3 text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-label-sm block mb-2">Confirm password</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full border border-black bg-background px-4 py-3 text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center justify-center gap-2 border border-black bg-black text-white px-5 py-4 text-label-sm disabled:opacity-60"
            >
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : null}
              Update password
            </button>
          </form>
        </section>

        <section className="border border-primary bg-white p-8 brutalist-shadow-small">
          <p className="text-label-sm text-primary mb-3">Danger zone</p>
          <h2 className="text-headline-md mb-4">Delete account</h2>
          <p className="text-body-md mb-6">
            This permanently deletes your account and removes your feeds, articles, and saved state.
          </p>
          <label className="block mb-5">
            <span className="text-label-sm block mb-2">Type your email to confirm</span>
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              type="email"
              autoComplete="off"
              className="w-full border border-black bg-background px-4 py-3 text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={email}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleDeleteAccount()}
            disabled={!canDelete || deletingAccount}
            className="inline-flex items-center justify-center gap-2 border border-primary bg-primary text-white px-5 py-4 text-label-sm disabled:opacity-40"
          >
            {deletingAccount ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete account
          </button>
        </section>
      </div>
    </div>
  );
};
