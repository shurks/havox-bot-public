import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759206959448 implements MigrationInterface {
    name = 'Migration1759206959448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`approved\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`trial\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`trial\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`approved\``);
    }

}
