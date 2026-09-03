import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services';

// Matches AHM Mart's brand: emerald green primary, white card,
// soft rounded corners, clean sans-serif — same language as the header/footer.

const REDIRECT_SECONDS = 5;

const Icon = ({ state }) => {
  if (state === 'checking') {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="icon-spin">
        <circle cx="20" cy="20" r="17" stroke="#E3E8E6" strokeWidth="3" />
        <path d="M20 3 a17 17 0 0 1 17 17" stroke="#12805C" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === 'success') {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" fill="#E7F7EF" />
        <path d="M12 20.5 L17.5 26 L28 14" stroke="#12805C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="draw-check" />
      </svg>
    );
  }
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#FDECEA" />
      <path d="M14 14 L26 26" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 14 L14 26" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('checking');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const navigate = useNavigate();
  const timerRef = useRef(null);

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
    <div className="container-main py-12 animate-fade-in">
      <style>{`
        .verify-box {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #E7EAE8;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(16, 24, 20, 0.06);
          padding: 2.5rem 2rem;
          text-align: center;
        }
        .verify-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .icon-spin { animation: spin 0.9s linear infinite; transform-origin: 20px 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .draw-check {
          stroke-dasharray: 26;
          stroke-dashoffset: 26;
          animation: draw 0.4s ease-out 0.1s forwards;
        }
        @keyframes draw { to { stroke-dashoffset: 0; } }

        .verify-heading {
          font-size: 1.35rem;
          font-weight: 700;
          color: #16241F;
          margin: 0 0 0.5rem;
        }
        .verify-message {
          font-size: 0.925rem;
          color: #5B6660;
          line-height: 1.55;
          margin: 0 auto 1.5rem;
          max-width: 32ch;
        }
        .verify-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .verify-btn {
          display: block;
          width: 100%;
          padding: 0.7rem 1.25rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          text-align: center;
          transition: background 0.15s ease, border-color 0.15s ease;
          box-sizing: border-box;
        }
        .verify-btn.primary {
          background: #12805C;
          color: #fff;
        }
        .verify-btn.primary:hover { background: #0E6B4C; }
        .verify-btn.ghost {
          background: #fff;
          border: 1px solid #D7DEDA;
          color: #16241F;
        }
        .verify-btn.ghost:hover { border-color: #12805C; color: #12805C; }

        .verify-footnote {
          margin-top: 1rem;
          font-size: 0.8rem;
          color: #8B958F;
        }

        @media (prefers-reduced-motion: reduce) {
          .icon-spin, .draw-check { animation: none; }
          .draw-check { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="verify-box">
        <div className="verify-icon-wrap">
          <Icon state={state} />
        </div>

        <h1 className="verify-heading">{heading}</h1>
        <p className="verify-message">
          {state === 'checking' ? 'Please wait while we confirm your email address.' : message}
        </p>

        {state === 'success' && (
          <div className="verify-actions">
            <Link to="/login" className="verify-btn primary">Login now</Link>
            <p className="verify-footnote">Redirecting to login in {countdown}s</p>
          </div>
        )}

        {state === 'error' && (
          <div className="verify-actions">
            <Link to="/resend-verification" className="verify-btn primary">Send a new link</Link>
            <Link to="/login" className="verify-btn ghost">Back to login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;