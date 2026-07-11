exports.up = function createUuidExtension(knex) {
    return knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};

exports.down = function dropUuidExtension(knex) {
    return knex.raw('DROP EXTENSION "uuid-ossp"');
};
