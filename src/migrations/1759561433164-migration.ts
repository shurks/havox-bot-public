import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759561433164 implements MigrationInterface {
    name = 'Migration1759561433164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` CHANGE \`streamKey\` \`streamKey\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` CHANGE \`streamKey\` \`streamKey\` varchar(255) NOT NULL`);
    }

}
