import { forwardRef, HttpService, Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { CreateServiceDto } from "../interfaces/createService.interface";
import { CronJob } from 'cron';
import { Service } from "../interfaces/service.entity";
import { AppGateway } from "../app.gateway";
import { take } from 'rxjs/operators';
import { IEventType, IPongDto, IServiceMessage } from "../interfaces/serviceResponse.interface";
import { DowntimeModel } from "../models/downtime.model";
import { ServiceModel } from "../models/service.model";
import { WebHookService } from "./webhook.service";

@Injectable()
export class CronService implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(
        private readonly scheduler: SchedulerRegistry,
        private readonly services: ServiceModel,
        @Inject(forwardRef(() => AppGateway))
        private readonly gateway: AppGateway,
        private readonly http: HttpService,
        private readonly downTime: DowntimeModel,
        private readonly webHook: WebHookService
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
            let currentPage = 1, limit = 10, maxPages = Math.ceil(totalCount / limit);

            while (currentPage <= maxPages) {
                this.services.fetchServicesList(currentPage, limit).then((_services) => {
                    _services.forEach((service) => {
                        if (service.active)
                            this.createCron(service);
                    })
                })
                currentPage++;
            }
        })
    }


    createCron(service: Service) {
        const minutes = Math.floor(service.interval / 60), seconds = service.interval % 60;
        Logger.log(`Cron ${service.serviceId} scheduled at ${seconds === 0 ? '*' : '*/' + seconds} ${minutes === 0 ? '*' : '*/' + minutes} * * * *`)
        const job = new CronJob(`${seconds === 0 ? '*' : '*/' + seconds} ${minutes === 0 ? '*' : '*/' + minutes} * * * *`, () => { this.executeCron(service.serviceId) });
        this.scheduler.addCronJob(service.serviceId, job);
        job.start();

    }

    executeCron(serviceId: string) {
        return this.services.fetchServiceById(serviceId).then((service) => {
            if (serviceId === 'a4313ae5-cd84-4bc4-9e83-9aa58b78ea3d') return;
            Logger.log(`Cron ${serviceId} successfully ran!`);
            const startTime = Date.now();
            this.http.get<IPongDto>(service.url).pipe(take(1)).subscribe(async (result) => {
                const tat = Date.now() - startTime;

                const { data: pong_dto } = result;

                const event = {} as IServiceMessage<IPongDto>;
                event.pingTAT = tat;
                event.serviceName = service.serviceName;
                event.status = IEventType.CODE_HOLT;


                const totalItems = Object.keys(pong_dto).length;

                const itemsDown = Object.entries(pong_dto).filter((item) => item[1].status === 'DOWN');
                const itemsUp = Object.entries(pong_dto).filter((item) => item[1].status === 'UP');
                console.log('itemdown', itemsDown);
                console.log('itemsup', itemsUp);



                if (itemsDown.length > 0 && itemsDown.length === totalItems) {
                    event.status = IEventType.CODE_GINA;
                } else if (itemsDown.length > 0 && itemsDown.length > Math.ceil(totalItems / 2)) {
                    event.status = IEventType.CODE_JAKE;
                } else if (itemsDown.length > 0 && itemsDown.length <= Math.ceil(totalItems / 2)) {
                    event.status = IEventType.CODE_ROSA;
                }



                const recentlyDown = [], recentlyUp = [];
                let recentCritical = null, recentRecovery = null;

                if (event.status == IEventType.CODE_GINA) {
                    console.log('CODE_GINA');
                    recentCritical = await this.downTime.recordDowntime(serviceId, '*');
                } else {
                    for (const item of itemsDown) {
                        const [name] = item;
                        console.log(name);

                        const entry = await this.downTime.recordDowntime(serviceId, name);

                        if (entry) recentlyDown.push(name);
                    }

                    for (const item of itemsUp) {
                        const [name] = item;
                        console.log(name);

                        const entry = await this.downTime.recordUptime(serviceId, name);

                        if (entry) recentlyUp.push(name);
                    }

                    recentRecovery = await this.downTime.recordUptime(serviceId, '*');
                }

                event.subServices = {};
                const cron = this.scheduler.getCronJob(serviceId);
                for (const iterator in pong_dto) {
                    console.log('iterator');

                    const item = pong_dto[iterator];
                    const info = await this.downTime.getStatsForSubService(serviceId, iterator);
                    event.subServices[iterator] = { ...item, lastDownAt: info.lastDownAt?.toLocaleString(), lastUpAt: info.lastUpAt?.toLocaleString() };

                }

                this.gateway.publish(event);
                if (recentCritical || recentRecovery?.affected > 0 || recentlyDown.length > 0 || recentlyUp.length > 0)
                    this.webHook.notify(event);


            }, async (err) => {
                const tat = Date.now() - startTime;

                const event = {} as IServiceMessage<IPongDto>;
                event.pingTAT = tat;
                event.serviceName = service.serviceName;
                event.status = IEventType.CODE_JUDY;
                this.gateway.publish(event);

                const recentCritical = await this.downTime.recordDowntime(serviceId, '*');
                if (recentCritical)
                    this.webHook.notify(event);
            })
        })
    }

}