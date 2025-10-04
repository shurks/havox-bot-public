import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("metadata")
export class Metadata {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false, type: 'varchar' })
    key: string;

    @Column({ nullable: false, type: 'varchar' })
    value: string;
}