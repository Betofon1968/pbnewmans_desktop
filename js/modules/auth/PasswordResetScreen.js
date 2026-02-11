const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export default function PasswordResetScreen({ onComplete, supabase }) {
  const { useState } = React;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (value) => {
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!PASSWORD_COMPLEXITY_RE.test(value)) {
      return 'Password must include uppercase, lowercase, and a number.';
    }
    return '';
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(async () => {
        await supabase.auth.signOut();
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return /*#__PURE__*/ React.createElement(
    'div',
    { className: 'auth-container' },
    /*#__PURE__*/ React.createElement(
      'div',
      { className: 'auth-box' },
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { textAlign: 'center', marginBottom: '32px' } },
        /*#__PURE__*/ React.createElement('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🔐'),
        /*#__PURE__*/ React.createElement(
          'h1',
          { style: { color: '#1a7f4b', fontSize: '24px', fontWeight: 700, margin: '0 0 8px' } },
          'Reset Password'
        ),
        /*#__PURE__*/ React.createElement(
          'p',
          { style: { color: '#666', fontSize: '14px' } },
          'Use at least 8 characters with uppercase, lowercase, and a number.'
        )
      ),
      error && /*#__PURE__*/ React.createElement('div', { className: 'auth-error' }, error),
      success && /*#__PURE__*/ React.createElement('div', { className: 'auth-success' }, success),
      /*#__PURE__*/ React.createElement(
        'form',
        { onSubmit: handleResetPassword },
        /*#__PURE__*/ React.createElement('input', {
          type: 'password',
          className: 'auth-input',
          placeholder: 'New password',
          value: password,
          onChange: (e) => setPassword(e.target.value),
          required: true,
          autoFocus: true,
        }),
        /*#__PURE__*/ React.createElement('input', {
          type: 'password',
          className: 'auth-input',
          placeholder: 'Confirm new password',
          value: confirmPassword,
          onChange: (e) => setConfirmPassword(e.target.value),
          required: true,
        }),
        /*#__PURE__*/ React.createElement(
          'button',
          { type: 'submit', className: 'auth-btn', disabled: loading },
          loading && /*#__PURE__*/ React.createElement('span', { className: 'spinner' }),
          loading ? 'Updating...' : 'Set New Password'
        )
      )
    )
  );
}
