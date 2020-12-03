import { IsNotEmpty, IsUrl } from "class-validator";

export class ICreateWebHookDto {
    @IsUrl({ require_protocol: true }, { message: 'Invalid URL format' })
    @IsNotEmpty({ message: 'URL is mandatory' })
    url: string;
}