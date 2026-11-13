import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { authService } from '../services';
import AuthShell from '../components/auth/AuthShell';
import usePageMeta from '../hooks/usePageMeta';

const REDIRECT_SECONDS = 5;

const StatusIcon = ({ state }) => {
  const base = 'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full';
  if (state === 'checking') return <span className={`${base} bg-primary-50 text-primary-600`}><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /></span>;
  if (state === 'success') return <span className={`${base} bg-primary-100 text-primary-700`}><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>;
  return <span className={`${base} bg-red-50 text-red-600`}><XCircle className="h-8 w-8" aria-hidden="true" /></span>;
};

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('checking');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  usePageMeta({ title: 'Verify Email', description: 'Verify your AHM Mart email address.', path: '/verify-email', noindex: true });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('Verification token is missing. Please use the link from your email.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await authService.verifyEmail(token);
        if (cancelled) return;
        setState('success');
        setMessage(resp.data?.message || 'Your email has been verified. You can log in now.');
      } catch (err) {
        // if token not found, try a quick server-side check (handles race where token was just applied)
        if (err.response?.status === 404) {
          try {
            const check = await authService.checkEmailVerification(token);
            if (check.data?.verified) {
              if (cancelled) return;
              setState('success');
              setMessage(check.data?.message || 'Your email has been verified. You can log in now.');
              return;
            }
          } catch (e) {
            // ignore and fall through to show error below
          }
        }
        if (cancelled) return;
        setState('error');
        setMessage(err.response?.data?.message || 'This link is invalid or has expired.');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams]);



  useEffect(() => {
    if (state !== 'success') return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          navigate('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state, navigate]);

  const heading =
    state === 'checking' ? 'Verifying your email'
    : state === 'success' ? 'Email verified!'
    : 'Verification failed';

  return (
    <AuthShell title={heading} subtitle="AHM Mart account">
      <div className="text-center" role="status" aria-live="polite">
        <StatusIcon state={state} />
        <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-gray-600">
          {state === 'checking' ? 'Please wait while we confirm your email address.' : message}
        </p>

        {state === 'success' && (
          <div className="flex flex-col gap-2">
            <Link to="/login" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700">Login now</Link>
            <p className="mt-1 text-xs text-gray-500">Redirecting to login in {countdown}s</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col gap-2">
            <Link to="/login" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700">Back to login</Link>
            <p className="mt-1 text-xs text-gray-500">Need a new link? Try logging in. If your email is not verified yet, you will be offered a Resend option.</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
};

export default VerifyEmail;
