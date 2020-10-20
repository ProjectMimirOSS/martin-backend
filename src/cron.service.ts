import { forwardRef, HttpService, Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CreateServiceDto } from "./interfaces/createService.interface";
import { ServiceModel } from "./service.model";
import { CronJob } from 'cron';
import { Service } from "./interfaces/service.entity";
import { AppGateway } from "./app.gateway";
import { take } from 'rxjs/operators';

@Injectable()
export class CronService implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(
        private readonly scheduler: SchedulerRegistry,
        private readonly services: ServiceModel,
        @Inject(forwardRef(() => AppGateway))
        private readonly gateway: AppGateway,
        private readonly http: HttpService
    ) { }

    onApplicationShutdown(signal?: string) {
        this.scheduler.getCronJobs().forEach((cron) => {
            cron.stop();
        })
    }

    onApplicationBootstrap() {
        this.init();
    }

    init() {
        this.services.getTotalServicesCount().then((totalCount) => {
            let currentPage = 1, limit = 10, maxPages = Math.floor(totalCount / limit);
            while (currentPage <= maxPages) {
                this.services.fetchServicesList(currentPage, limit).then((_serives) => {
                    _serives.forEach((service) => {
                        this.createCron(service);
                    })
                })
            }
        })
    }


    createCron(service: Service) {
        const minutes = Math.ceil(service.interval / 60), seconds = service.interval % 60;
        const job = new CronJob(`${seconds} ${minutes} 0 0 0 0`, () => { this.executeCron(service.serviceId) });
        job.start();

    }

    executeCron(serviceId: string) {
        return this.services.fetchServiceById(serviceId).then((service) => {
            Logger.log(`Cron ${serviceId} successfully ran!`);
            this.http.get(service.url).pipe(take(1)).subscribe((result) => {
                this.gateway.publish(result);
            })
        })
    }

}