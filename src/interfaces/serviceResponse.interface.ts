export interface IServiceMessage<T> {
    event_type: IEventType;
    event_response: T;
    execution_time?: number;
    service_id: string;
}

export enum IEventType {
    SUPER_CRITICAL = 'SUPER_CRITICAL',
    SUB_CRITICAL = 'SUB_CRITICAL',
    HEALTHY_PING = 'HEALTHY_PING'
}

export interface IPongDto {
    [x: string]: IPongResponseItem;
}

export interface IPongResponseItem {
    status: 'UP' | 'DOWN';
    message?: string;
}

