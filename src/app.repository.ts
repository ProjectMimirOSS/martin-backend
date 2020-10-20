import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AppGateway } from "./app.gateway";
import { CronService } from "./cron.service";
import { Service } from "./interfaces/service.entity";
import { ServiceModel } from "./service.model";

@Injectable()
export class AppRespository {
    constructor(
        private readonly serviceModal: ServiceModel,
        private readonly cronService: CronService,
        
    ) {
    }

    createService(service: Service) {
        this.serviceModal.createService(service).then((_service) => {
            this.cronService.createCron(_service)
        })
    }


}