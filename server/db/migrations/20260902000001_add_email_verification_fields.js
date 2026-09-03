exports.up = function addEmailVerificationFields(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.string('emailVerificationToken').nullable();
    table.bool('isEmailVerified').notNullable().defaultTo(false);
  });
};

exports.down = function rollbackEmailVerificationFields(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('emailVerificationToken');
    table.dropColumn('isEmailVerified');
  });
};
