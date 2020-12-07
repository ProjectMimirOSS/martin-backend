import { IsNotEmpty, IsNumber, IsString, IsUrl, Max, Min } from "class-validator";

export class CreateServiceDto {
    @IsString({ message: 'Service Name should be string' })
    @IsNotEmpty({ message: 'Service Name is mandatory' })
    serviceName: string;

    @IsUrl({ require_protocol: true })
    @IsNotEmpty({ message: 'URL is mandatory' })
    url: string;

    @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })
    @IsNotEmpty({message:'Interval is mandatory'})
    @Min(5,{message:'PING Interval cannot be less than 5sec'})
    @Max(500,{message:'PING Interval cannot be greater than 500sec'})
    interval: number;
}