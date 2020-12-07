import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ServiceDowntime } from "../interfaces/serviceDowntime.entity";

@Injectable()
export class DowntimeModel {

    constructor(@InjectRepository(ServiceDowntime) private readonly downTimeRepo: Repository<ServiceDowntime>) { }


    recordDowntime(serviceId: string, subService: string) {
        Logger.log(`Recording downtime for ${serviceId} ${subService}`)
        return this.downTimeRepo.findAndCount({ serviceId, subService, upAt: null }).then((value) => {
            const [items, count] = value;
            console.log(count);
            
            if (count === 0) {
                return this.downTimeRepo.create({ serviceId, subService, downAt: new Date() }).save();
            }
            return null;
        })
    }

    recordUptime(serviceId: string, subService: string) {
        return this.downTimeRepo.update({ serviceId, subService, upAt: null }, { upAt: new Date() });
    }

}