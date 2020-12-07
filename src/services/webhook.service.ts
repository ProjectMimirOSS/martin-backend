import { HttpService, Injectable } from "@nestjs/common";
import { IEventType } from "../interfaces/serviceResponse.interface";
import { WebHookModel } from "../models/webhook.model";

@Injectable()
export class WebHookService {

    constructor(
        private readonly http: HttpService,
        private readonly webHook: WebHookModel
    ) { }


    notify(serviceId: string, subServices: string[], type: IEventType) {
        return this.webHook.getTotalWebHooksCount().then((totalCount) => {
            console.log('total count',totalCount);
            
            let currentPage = 1, limit = 10, maxPages = Math.ceil(totalCount / limit);
            console.log(currentPage,maxPages);
            
            while (currentPage <= maxPages) {
                this.webHook.fetchWebHooksList(currentPage, limit).then((_webhooks) => {
                    _webhooks.forEach((webhook) => {
                        console.log(webhook);
                        
                        const data = {
                            serviceId,
                            subServices,
                            type
                        };
                        try {
                            this.http.post(webhook.url, data).toPromise()
                        } catch (error) {
                            console.error(error);
                        }
                    })
                })
                currentPage++;
            }
        })
    }


}