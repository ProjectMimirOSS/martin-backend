import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ServiceDowntime extends BaseEntity {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: 'service_id' })
    serviceId: string;

    @Column({ name: 'sub_service' })
    subService: string;


    @Column({ name: 'down_at', type: 'timestamptz' })
    downAt: Date;

    @Column({ name: 'up_at', type: 'timestamptz', nullable: true, default: null })
    upAt: Date;
}