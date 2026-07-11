exports.up = function createCryptoExtension(knex) {
    return knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
};

exports.down = function dropCryptoExtension(knex) {
    return knex.raw('DROP EXTENSION "pgcrypto"');
};
