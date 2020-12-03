import { forwardRef, HttpService, Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CreateServiceDto } from "./interfaces/createService.interface";
import { ServiceModel } from "./service.model";
import { CronJob } from 'cron';
import { Service } from "./interfaces/service.entity";
import { AppGateway } from "./app.gateway";
import { take } from 'rxjs/operators';
import { IEventType, IPongDto, IServiceMessage } from "./interfaces/serviceResponse.interface";

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
            const startTime = Date.now();
            this.http.get<IPongDto>(service.url).pipe(take(1)).subscribe((result) => {
                const tat = Date.now() - startTime;

                const { data: pong_dto } = result;

                const event = {} as IServiceMessage<IPongDto>;
                event.execution_time = tat;
                event.service_id = service.serviceId;
                event.event_response = pong_dto;

                const totalItems = Object.keys(pong_dto).length;

                const itemsDown = Object.entries(pong_dto).filter((item) => item[1].status === 'DOWN');


                if (itemsDown.length > 0 && itemsDown.length === totalItems) {
                    event.event_type = IEventType.SUPER_CRITICAL;
                    return this.gateway.publish(event);
                }

                if (itemsDown.length > 0 && itemsDown.length < totalItems) {
                    event.event_type = IEventType.SUB_CRITICAL;
                    return this.gateway.publish(event);
                }

                event.event_type = IEventType.HEALTHY_PING;
                return this.gateway.publish(event);




            }, (err) => {
                const tat = Date.now() - startTime;

                const event = {} as IServiceMessage<IPongDto>;
                event.execution_time = tat;
                event.service_id = service.serviceId;
                event.event_response = err;
                event.event_type = IEventType.SUPER_CRITICAL;
                this.gateway.publish(event);
            })
        })
    }

}