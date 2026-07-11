exports.up = function createHashPasswordFunction(knex) {
    return knex.raw(`
    CREATE OR REPLACE FUNCTION public.hash_password()
      RETURNS trigger AS $BODY$
        BEGIN
          IF TG_OP = 'UPDATE' THEN  
            IF NEW."password" IS NOT NULL AND (OLD."password" IS NULL OR NEW."password" != OLD."password") THEN
              NEW."password" := crypt(NEW."password", gen_salt('bf', 8));
            END IF;
          ELSE
            IF NEW."password" IS NOT NULL THEN
              NEW."password" := crypt(NEW."password", gen_salt('bf', 8));
            END IF;
          END IF;
          RETURN NEW;
        END;
      $BODY$
    LANGUAGE plpgsql VOLATILE
    COST 100;
  `);
};

exports.down = function dropHashPasswordFunction(knex) {
    return knex.raw('DROP FUNCTION public.hash_password();');
};
