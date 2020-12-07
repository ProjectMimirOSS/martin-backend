import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebHook } from "../interfaces/webhook.entity";

@Injectable()
export class WebHookModel {

    constructor(@InjectRepository(WebHook) private readonly webHookRepo: Repository<WebHook>) { }

    createWebHook(new_webhook: WebHook) {
        return this.webHookRepo.save(new_webhook);
    }

    fetchWebHooksList(page = 1, limit = 10) {
        return this.webHookRepo.find({ skip: (page - 1) * limit, take: limit });
    }

    getTotalWebHooksCount() {
        return this.webHookRepo.count();
    }

}