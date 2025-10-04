import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759366001655 implements MigrationInterface {
    name = 'Migration1759366001655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`notifiedAboutRank\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`userLeft\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`archived\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`archived\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`userLeft\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`notifiedAboutRank\``);
    }

}
