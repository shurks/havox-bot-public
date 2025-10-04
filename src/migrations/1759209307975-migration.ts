import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759209307975 implements MigrationInterface {
    name = 'Migration1759209307975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdExpelAsap\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdExpelAsap\``);
    }

}
