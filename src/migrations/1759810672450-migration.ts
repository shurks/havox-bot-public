import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759810672450 implements MigrationInterface {
    name = 'Migration1759810672450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`radio-bot\` ADD \`userId\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`radio-bot\` DROP COLUMN \`userId\``);
    }

}
