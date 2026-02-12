export async function sendDriverExpirationAlertEmail({
  supabase,
  SUPABASE_URL,
  alerts,
  recipients,
  setInfoModal,
  setExpirationAlertsModal,
  setSelectedAlertRecipients
}) {
  if (!recipients || recipients.length === 0) {
    setInfoModal({
      type: 'warning',
      title: 'No Recipients Selected',
      message: 'Please select at least one user to receive the alert email.'
    });
    return;
  }

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setInfoModal({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to send alerts. Please refresh and log in again.'
      });
      return;
    }

    const response = await fetch(SUPABASE_URL + '/functions/v1/send-expiration-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + session.access_token
      },
      body: JSON.stringify({
        alerts,
        recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
        org_name: 'Newmans Refrigerated Service'
      })
    });

    if (response.status === 404) {
      throw new Error('Edge Function not deployed. Deploy using: supabase functions deploy send-expiration-alerts');
    }

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || result.message || `HTTP ${response.status}`);
    }

    setExpirationAlertsModal(false);
    setSelectedAlertRecipients([]);
    setInfoModal({
      type: 'success',
      title: 'Alerts Sent!',
      message: 'Expiration alert emails have been sent successfully.',
      details: [
        { label: 'Alerts Sent', value: alerts.length },
        { label: 'Recipients', value: recipients.map((r) => r.name || r.email).join(', ') }
      ]
    });
  } catch (err) {
    console.error('Failed to send alerts:', err);
    const errorMsg = err.message || 'Unknown error';

    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      setInfoModal({
        type: 'warning',
        title: 'Edge Function Not Found',
        message: 'The send-expiration-alerts Edge Function is not deployed.',
        note: 'Deploy the function using: supabase functions deploy send-expiration-alerts'
      });
    } else if (errorMsg.includes('not configured') || errorMsg.includes('RESEND_API_KEY')) {
      setInfoModal({
        type: 'warning',
        title: 'Email Not Configured',
        message: 'The Resend API key is not set in Supabase secrets.',
        note: 'Run: supabase secrets set RESEND_API_KEY=re_xxxxx'
      });
    } else {
      setInfoModal({
        type: 'warning',
        title: 'Email Failed',
        message: errorMsg,
        note: 'Check the browser console for more details.'
      });
    }
  }
}
