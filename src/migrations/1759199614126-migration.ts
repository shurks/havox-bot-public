import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759199614126 implements MigrationInterface {
    name = 'Migration1759199614126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`rsn\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`rsn\``);
    }

}
