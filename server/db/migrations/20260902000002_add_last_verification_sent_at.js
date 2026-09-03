exports.up = function addLastVerificationSentAt(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.timestamp('lastVerificationSentAt').nullable();
  });
};

exports.down = function rollbackLastVerificationSentAt(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('lastVerificationSentAt');
  });
};
