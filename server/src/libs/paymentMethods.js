const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  online: 'Online Payment',
};

const ONLINE_PAYMENT_ACCOUNTS = [
  {
    type: 'Bank',
    provider: 'Meezan Bank Limited',
    account: '1142 0114141787',
    accountHolder: 'Syed Muhammad Ahmad Bukhari',
  },
  {
    type: 'Easypaisa',
    account: '03134591721',
    accountHolder: 'Syed Mazhar Hussain',
  },
];

function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—';
}

function getOnlinePaymentInstructions(orderId, totalPrice) {
  const accounts = ONLINE_PAYMENT_ACCOUNTS.map((account) => {
    const lines = [`${account.type}:`];
    if (account.provider) lines.push(account.provider);
    lines.push(account.account, account.accountHolder);
    return lines.join(' — ');
  });

  return [
    `Please transfer Rs. ${Number(totalPrice).toLocaleString('en-PK')} for order #${orderId} using one of these accounts:`,
    ...accounts,
    'Include your order number in the payment reference.',
  ];
}

module.exports = {
  PAYMENT_METHOD_LABELS,
  ONLINE_PAYMENT_ACCOUNTS,
  getPaymentMethodLabel,
  getOnlinePaymentInstructions,
};
