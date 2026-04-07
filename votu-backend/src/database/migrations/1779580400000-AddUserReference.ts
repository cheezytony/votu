import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserReference1779580400000 implements MigrationInterface {
  name = 'AddUserReference1779580400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "reference" character varying`);
    await queryRunner.query(`UPDATE "users" SET "reference" = gen_random_uuid()`); // Temporary: fill with UUIDs for existing users
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "reference" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_reference" ON "users" ("reference")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_reference"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reference"`);
  }
}
