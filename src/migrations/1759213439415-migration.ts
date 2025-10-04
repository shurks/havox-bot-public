import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759213439415 implements MigrationInterface {
    name = 'Migration1759213439415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`rankIcon\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`rankIcon\` varchar(255) NULL`);
    }

}
