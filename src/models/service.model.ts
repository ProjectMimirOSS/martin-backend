import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Service } from "../interfaces/service.entity";

@Injectable()
export class ServiceModel {
    constructor(@InjectRepository(Service) private readonly serviceRepo: Repository<Service>) { }

    fetchServicesList(page = 1, limit = 10) {
        return this.serviceRepo.find({ skip: (page - 1) * limit, take: limit });
    }

    getTotalServicesCount() {
        return this.serviceRepo.count();
    }

    fetchServiceById(serviceId: string) {
        return this.serviceRepo.findOne(serviceId)
    }

    createService(service:Service){
        return this.serviceRepo.save(service);
    }

}