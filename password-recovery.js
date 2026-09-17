// Press Flow password recovery. Passwords remain securely stored by Supabase.
setTimeout(() => {
  const showPasswordForm = () => {
    document.querySelector('#login-form').hidden = true;
    document.querySelector('.create-account').hidden = true;
    document.querySelector('#new-password-form').hidden = false;
    document.querySelector('#login-title').textContent = 'Set a new password';
    setLoginMessage('Enter and save your new password.', true);
    document.querySelector('#new-password').focus();
  };
  document.querySelector('#forgot-password').onclick = async () => {
    const email = document.querySelector('#login-email').value.trim();
    if (!email) {
      setLoginMessage('Enter your email address first, then choose “Forgot your password?”');
      document.querySelector('#login-email').focus();
      return;
    }
    if (!cloud) return setLoginMessage('The secure sign-in service is unavailable. Refresh and try again.');
    setLoginMessage('Sending password-reset email…', true);
    const result = await cloud.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}` });
    setLoginMessage(result.error ? result.error.message : 'Password-reset email sent. Open the link in that email to choose a new password.', !result.error);
  };
  document.querySelector('#new-password-form').onsubmit = async event => {
    event.preventDefault();
    const password = document.querySelector('#new-password').value;
    if (password !== document.querySelector('#confirm-password').value) return setLoginMessage('The two passwords do not match.');
    const result = await cloud.auth.updateUser({ password });
    if (result.error) return setLoginMessage(result.error.message);
    history.replaceState(null, '', window.location.pathname);
    setLoginMessage('Password updated. You can now sign in.', true);
    document.querySelector('#new-password-form').hidden = true;
    document.querySelector('#login-form').hidden = false;
    document.querySelector('.create-account').hidden = false;
    document.querySelector('#login-password').focus();
  };
  if (cloud) cloud.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' && session) showPasswordForm(); });
  if (window.location.hash.includes('type=recovery')) setTimeout(showPasswordForm, 300);
}, 20);
