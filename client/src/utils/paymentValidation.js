export const MAX_PAYMENT_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

export const PAYMENT_RECEIPT_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
];

export const validateTransactionReference = (value) => {
  const normalized = value?.trim() || '';

  if (!normalized) {
    return null;
  }

  if (!/^[A-Za-z0-9._ -]{3,50}$/.test(normalized)) {
    return 'Transaction ID / Reference Number must be 3-50 characters and contain only letters, numbers, spaces, dots, underscores, or hyphens.';
  }

  return null;
};

export const validateSenderAccount = (value) => {
  const normalized = value?.trim() || '';

  if (!normalized) {
    return null;
  }

  if (!/^[0-9 -]{4,20}$/.test(normalized)) {
    return 'Sender Account Number must be 4-20 characters and may only contain digits, spaces, or hyphens.';
  }

  return null;
};

export const validatePaymentReceiptFile = (file) => {
  if (!file) {
    return null;
  }

  if (file.size > MAX_PAYMENT_RECEIPT_SIZE_BYTES) {
    return 'Receipt file must be 5MB or smaller.';
  }

  if (!PAYMENT_RECEIPT_ALLOWED_TYPES.includes(file.type)) {
    return 'Only PNG, JPG, or PDF files are allowed.';
  }

  return null;
};
