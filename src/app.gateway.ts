import { Logger, OnApplicationShutdown, UsePipes, ValidationPipe } from "@nestjs/common";
import { MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { AppRespository } from "./app.repository";
import { CreateServiceDto } from "./interfaces/createService.interface";
import { Server } from 'socket.io';

@WebSocketGateway(7777, { transports: ['websocket'] })
export class AppGateway implements OnApplicationShutdown{

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

    @SubscribeMessage('create_new_service')
    @UsePipes(new ValidationPipe())
    createNewService(@MessageBody() body: CreateServiceDto) {
        return body;
    }


    publish(event: any) {
        this.server.emit('service_updated', event);
    }
}