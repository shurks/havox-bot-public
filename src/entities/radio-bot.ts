import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("radio-bot")
export class RadioBot {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false, type: 'varchar' })
    channel: string

    @Column({ nullable: false, type: 'varchar' })
    token: string

    @Column({ nullable: false, type: 'varchar' })
    appId: string
}
