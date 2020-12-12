import { forwardRef, HttpService, Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { CreateServiceDto } from "../interfaces/service.interface";
import { CronJob, CronTime } from 'cron';
import { Service } from "../entities/service.entity";
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

    private readonly serviceSubServiceMap = new Map<string, string[]>();

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

    updateCron(service: Service) {

        const cron = this.scheduler.getCronJob(service.serviceId);

        if (!cron) return;

        if (service.active === false) {
            cron.stop();
        } else {
            const minutes = Math.floor(service.interval / 60), seconds = service.interval % 60;
            const newTime = new CronTime(`${seconds === 0 ? '*' : '*/' + seconds} ${minutes === 0 ? '*' : '*/' + minutes} * * * *`)
            cron.setTime(newTime);
        }
    }

    executeCron(serviceId: string) {
        return this.services.fetchServiceById(serviceId).then(async (service) => {
            Logger.log(`Cron ${serviceId} successfully ran!`);
            const startTime = Date.now();
            const start = new Date();
            await this.services.updateService(serviceId, { lastChecked: new Date() });
            this.http.get<IPongDto>(service.url).pipe(take(1)).subscribe(async (result) => {
                const tat = Date.now() - startTime;

                const { data: pong_dto } = result;

                const event = {} as IServiceMessage<IPongDto>;
                event.pingTAT = tat;
                event.serviceName = service.serviceName;
                event.status = IEventType.CODE_HOLT;
                event.updatedOn = start.toLocaleString();



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

                        const entry = await this.downTime.recordDowntime(serviceId, name);

                        if (entry) recentlyDown.push(name);
                    }

                    for (const item of itemsUp) {
                        const [name] = item;

                        const entry = await this.downTime.recordUptime(serviceId, name);

                        if (entry) recentlyUp.push(name);
                    }

                    recentRecovery = await this.downTime.recordUptime(serviceId, '*');
                }

                event.subServices = {};
                const cron = this.scheduler.getCronJob(serviceId);
                const subServices = [];
                for (const iterator in pong_dto) {

                    subServices.push(iterator);

                    const item = pong_dto[iterator];
                    const info = await this.downTime.getStatsForSubService(serviceId, iterator);
                    event.subServices[iterator] = { ...item, lastDownAt: info.lastDownAt?.toLocaleString(), lastUpAt: info.lastUpAt?.toLocaleString() };

                }

                const info = await this.downTime.getStatsForSubService(serviceId, '*');
                event.lastDownAt = info?.lastDownAt?.toLocaleString();
                event.lastUpAt = info?.lastUpAt?.toLocaleString();
                this.serviceSubServiceMap.set(serviceId, subServices);

                this.gateway.publish('service_update', event);
                if (recentCritical || recentRecovery?.affected > 0 || recentlyDown.length > 0 || recentlyUp.length > 0)
                    this.webHook.notify(event);


            }, async (err) => {
                const tat = Date.now() - startTime;

                const event = {} as IServiceMessage<IPongDto>;
                event.pingTAT = tat;
                event.serviceName = service.serviceName;
                event.status = IEventType.CODE_JUDY;
                this.gateway.publish('service_update', event);
                const recentCritical = await this.downTime.recordDowntime(serviceId, '*');
                if (recentCritical)
                    this.webHook.notify(event);
            })
        })
    }

    listCronInfo() {
        this.services.getTotalServicesCount().then((totalCount) => {
            let currentPage = 1, limit = 10, maxPages = Math.ceil(totalCount / limit);

            while (currentPage <= maxPages) {
                this.services.fetchServicesList(currentPage, limit).then(async (_services) => {
                    const list = [];
                    for (const iterator of _services) {
                        const resp = await this.getCronInfo(iterator.serviceId);
                        list.push({ ...iterator, ...resp });
                    }
                    this.gateway.publish('services_list', list);
                })
                currentPage++;
            }
        })
    }

    async getCronInfo(serviceId: string) {
        const subServices = this.serviceSubServiceMap.get(serviceId);
        const nextExecutionAt = this.scheduler.getCronJob(serviceId)?.nextDate()?.toLocaleString();
        const subServicesInfo = {};
        for (const iterator of subServices) {
            const item = await this.downTime.getStatsForSubService(serviceId, iterator);
            subServicesInfo[iterator] = { status: (item.lastUpAt?.getTime() ?? -1) > (item.lastDownAt?.getTime() ?? 0) ? 'UP' : 'DOWN', lastUpAt: item.lastUpAt?.toLocaleString(), lastDownAt: item.lastDownAt?.toLocaleString() };
        }
        return {
            nextExecutionAt,
            subServices: subServicesInfo
        }
    }

}