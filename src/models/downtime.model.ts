import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { ServiceDowntime } from "../interfaces/serviceDowntime.entity";

@Injectable()
export class DowntimeModel {

    constructor(@InjectRepository(ServiceDowntime) private readonly downTimeRepo: Repository<ServiceDowntime>) { }


    recordDowntime(serviceId: string, subService: string) {
        Logger.log(`Recording downtime for ${serviceId} ${subService}`)
        return this.downTimeRepo.findAndCount({ serviceId, subService, upAt: null }).then((value) => {
            const [, count] = value;
            if (count === 0) {
                return this.downTimeRepo.create({ serviceId, subService, downAt: new Date() }).save();
            }
            return null;
        })
    }

    recordUptime(serviceId: string, subService: string) {
        return this.downTimeRepo.update({ serviceId, subService, upAt: null }, { upAt: new Date() });
    }

    async getStatsForSubService(serviceId: string, subService: string) {
        const lastDown = await this.downTimeRepo.findOne({ where: { serviceId, subService: In(['*', subService]) }, order: { downAt: 'DESC' } });
        const lastUp = await this.downTimeRepo.findOne({ where: { serviceId, subService: In(['*', subService]), upAt: Not(null) }, order: { upAt: 'DESC' } });
        console.log(lastUp);
        
        return {
            lastDownAt: lastDown?.downAt,
            lastUpAt: lastUp?.upAt
        }
    }

}