import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPollOptionReferences1775578763049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill any existing rows that have a null reference
    await queryRunner.query(`
            UPDATE poll_options
            SET reference = encode(gen_random_bytes(15), 'base64')
            WHERE reference IS NULL
        `);

    // Enforce NOT NULL and UNIQUE going forward
    await queryRunner.query(`
            ALTER TABLE poll_options
                ALTER COLUMN reference SET NOT NULL
        `);

    await queryRunner.query(`
            ALTER TABLE poll_options
                ADD CONSTRAINT uq_poll_options_reference UNIQUE (reference)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE poll_options
                DROP CONSTRAINT IF EXISTS uq_poll_options_reference
        `);

    await queryRunner.query(`
            ALTER TABLE poll_options
                ALTER COLUMN reference DROP NOT NULL
        `);
  }
}
