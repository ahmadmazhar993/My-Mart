exports.up = function (knex) {
  return knex.schema.alterTable('user', (table) => {
    table.string('resetPasswordToken').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('resetPasswordToken');
  });
};
