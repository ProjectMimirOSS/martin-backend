import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Service {

    @PrimaryGeneratedColumn("uuid")
    serviceId: string;

    @Column({ type: "varchar", length: 120 })
    serviceName: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'int2' })
    interval: number;

    @Column({ type: 'timestamp' })
    lastChecked: Date;

    @CreateDateColumn({type: "timestamp"})
    createdAt: Date;

    @UpdateDateColumn({type: "timestamp"})
    updatedAt: Date;
}