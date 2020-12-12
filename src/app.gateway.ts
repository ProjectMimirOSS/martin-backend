import { Logger, OnApplicationShutdown, UsePipes, ValidationPipe } from "@nestjs/common";
import { MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { AppRespository } from "./app.repository";
import { CreateServiceDto, UpdateServiceDto } from "./interfaces/service.interface";
import { Server } from 'socket.io';
import { CreateWebHookDto, UpdateWebHookDto } from "./interfaces/webhook.interface";

@WebSocketGateway(7777, { transports: ['websocket'] })
export class AppGateway implements OnApplicationShutdown {
    private readonly startTime = new Date();

    @WebSocketServer()
    private readonly server: Server;

    constructor(
        private readonly appRepo: AppRespository
    ) {
        Logger.log('Gateway initalised', this.constructor.name)
    }

    onApplicationShutdown(signal?: string) {
        this.server.emit('connection_closed');
    }

    @SubscribeMessage('init')
    init() {
        return {
            startedAt: this.startTime,
            servicesCount: this.appRepo.servicesCount()
        }
    }

    @SubscribeMessage('create_new_service')
    @UsePipes(new ValidationPipe())
    createNewService(@MessageBody() body: CreateServiceDto) {
        return this.appRepo.createService(body).then(() => {
            this.listServices();
        })
    }

    @SubscribeMessage('update_service')
    @UsePipes(new ValidationPipe())
    updateService(@MessageBody() body: UpdateServiceDto) {
        return this.appRepo.updateService(body).then(() => {
            this.listServices();
        })
    }

    @SubscribeMessage('list_services')
    listServices() {
        return this.appRepo.listServices();
    }


    @SubscribeMessage('create_new_webhook')
    @UsePipes(new ValidationPipe())
    createWebHook(@MessageBody() body: CreateWebHookDto) {
        return this.appRepo.createWebHook(body).then(() => {
            this.listWebHooks();
        })
    }

    @SubscribeMessage('update_webhook')
    @UsePipes(new ValidationPipe())
    updateWebHook(@MessageBody() body: UpdateWebHookDto) {
        return this.appRepo.updateWebHook(body).then(() => {
            this.listWebHooks();
        })
    }

    @SubscribeMessage('list_webhooks')
    listWebHooks() {
        return this.appRepo.listWebHook();
    }

    publish(event_name: string, event: any) {
        this.server.emit(event_name, event);
    }
}