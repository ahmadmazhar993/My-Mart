const { generateOrderReferenceCode } = require('../orderCode');

describe('generateOrderReferenceCode', () => {
  it('returns an AHM-prefixed 6-digit code', () => {
    const code = generateOrderReferenceCode();

    expect(code).toMatch(/^AHM-\d{6}$/);
  });
});
