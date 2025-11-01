import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1761966765300 implements MigrationInterface {
    name = 'Migration1761966765300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`assignedRank\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`assignedRank\``);
    }

}
