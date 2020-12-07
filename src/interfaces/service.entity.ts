import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Service extends BaseEntity {

    @PrimaryGeneratedColumn("uuid")
    serviceId: string;

    @Column({ type: "varchar", length: 120 })
    serviceName: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'int2' })
    interval: number;

    @Column({ type: 'timestamp', nullable: true })
    lastChecked: Date;

    @CreateDateColumn({ type: "timestamp", nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp", nullable: true })
    updatedAt: Date;
}