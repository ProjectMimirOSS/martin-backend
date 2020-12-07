import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AppGateway } from "./app.gateway";
import { CronService } from "./services/cron.service";
import { CreateServiceDto } from "./interfaces/createService.interface";
import { Service } from "./interfaces/service.entity";
import { ICreateWebHookDto } from "./interfaces/webhook.interface";
import { WebHook } from "./interfaces/webhook.entity";
import { ServiceModel } from "./models/service.model";
import { WebHookModel } from "./models/webhook.model";

@Injectable()
export class AppRespository {

    constructor(
        private readonly serviceModal: ServiceModel,
        private readonly cronService: CronService,
        private readonly webhookModel: WebHookModel,

    ) {
    }

    createService(service: CreateServiceDto) {

        const new_service = new Service();
        new_service.serviceName = service.serviceName;
        new_service.interval = service.interval;
        new_service.url = service.url;

        this.serviceModal.createService(new_service).then((_service) => {
            this.cronService.createCron(_service)
        })
    }


    createWebHook(body: ICreateWebHookDto) {
        const new_webhook = new WebHook();
        new_webhook.url = body.url;
        return this.webhookModel.createWebHook(new_webhook);
    }


}