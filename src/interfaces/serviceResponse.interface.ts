export interface IServiceMessage<T> {
    status: IEventType;
    upTime: number;
    serviceName: string;
    updatedOn: string;
    subServices: IPongDto;
    pingTAT: number;
}

export enum IEventType {
    //NO RESPONSE FROM API
    CODE_JUDY = 'CODE_JUDY',
    //ALL SUB SERVICES ARE DOWN
    CODE_GINA = 'CODE_GINA',
    //LESS THAN HALF SUB SERVICES ARE DOWN
    CODE_ROSA = 'CODE_ROSA',
    //MORE THAN HALF SUB SERVICES ARE DOWN
    CODE_JAKE = 'CODE_JAKE',
    //ALL SUB SERVICES ARE UP
    CODE_HOLT = 'CODE_HOLT'
}

export interface IPongDto {
    [x: string]: IPongResponseItem;
}

export interface IPongResponseItem {
    status: 'UP' | 'DOWN';
    message?: string;
    lastDownAt?: string;
    lastUpAt?: string;
}



