import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestProgressEntity1657768635961 implements MigrationInterface {
  name = "AddTestProgressEntity1657768635961";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "TEST_PROGRESSES" ("test_progress_id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "date" datetime NOT NULL, "planned" integer NOT NULL, "completed" integer NOT NULL, "incompleted" integer NOT NULL, "story_id" varchar)`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_TEST_PROGRESSES" ("test_progress_id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "date" datetime NOT NULL, "planned" integer NOT NULL, "completed" integer NOT NULL, "incompleted" integer NOT NULL, "story_id" varchar, CONSTRAINT "FK_532c5bd4fbbe290f013a5799934" FOREIGN KEY ("story_id") REFERENCES "STORIES" ("story_id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_TEST_PROGRESSES"("test_progress_id", "created_at", "date", "planned", "completed", "incompleted", "story_id") SELECT "test_progress_id", "created_at", "date", "planned", "completed", "incompleted", "story_id" FROM "TEST_PROGRESSES"`
    );
    await queryRunner.query(`DROP TABLE "TEST_PROGRESSES"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_TEST_PROGRESSES" RENAME TO "TEST_PROGRESSES"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "TEST_PROGRESSES" RENAME TO "temporary_TEST_PROGRESSES"`
    );
    await queryRunner.query(
      `CREATE TABLE "TEST_PROGRESSES" ("test_progress_id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "date" datetime NOT NULL, "planned" integer NOT NULL, "completed" integer NOT NULL, "incompleted" integer NOT NULL, "story_id" varchar)`
    );
    await queryRunner.query(
      `INSERT INTO "TEST_PROGRESSES"("test_progress_id", "created_at", "date", "planned", "completed", "incompleted", "story_id") SELECT "test_progress_id", "created_at", "date", "planned", "completed", "incompleted", "story_id" FROM "temporary_TEST_PROGRESSES"`
    );
    await queryRunner.query(`DROP TABLE "temporary_TEST_PROGRESSES"`);
    await queryRunner.query(`DROP TABLE "TEST_PROGRESSES"`);
  }
}
