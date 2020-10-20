import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { CronService } from './cron.service';
import { Service } from './interfaces/service.entity';
import { ServiceModel } from './service.model';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(), TypeOrmModule.forFeature([Service]),
    ScheduleModule.forRoot(), HttpModule
  ],
  controllers: [AppController],
  providers: [AppService, AppGateway, CronService, ServiceModel],
})
export class AppModule { }
