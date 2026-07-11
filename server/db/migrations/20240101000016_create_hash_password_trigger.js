exports.up = function createUserHashPasswordTrigger(knex) {
    return knex.raw(`
    CREATE TRIGGER user_hash_password
    BEFORE INSERT OR UPDATE
    ON "user"
    FOR EACH ROW
    EXECUTE PROCEDURE hash_password();
  `);
};

exports.down = function dropUserHashPasswordTrigger(knex) {
    return knex.raw(`
    DROP TRIGGER IF EXISTS user_hash_password ON "user";
  `);
};
