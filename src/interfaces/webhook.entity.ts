import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'webhooks' })
export class WebHook {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', unique: true })
    url: string;

}