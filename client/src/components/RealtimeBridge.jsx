import { useEffect } from 'react';
import { useAuthStore } from '../store';
import { useToast } from './ToastProvider';
import { connectRealtime, disconnectRealtime, subscribe } from '../services/realtime';

/**
 * Opens the live-updates stream while someone is signed in, closes it on logout, and shows a
 * short toast for events that carry a message addressed to this user.
 */
const RealtimeBridge = () => {
  const { isAuthenticated, token, user } = useAuthStore();
  const userKey = user?.id ?? user?.userID ?? null;
  const { addToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      connectRealtime(token || localStorage.getItem('token'), userKey);
    } else {
      disconnectRealtime();
    }
    return undefined;
  }, [isAuthenticated, token, userKey]);

  useEffect(() => subscribe(null, (event) => {
    if (event.message) addToast(event.message, 'success');
  }), [addToast]);

  return null;
};

export default RealtimeBridge;
