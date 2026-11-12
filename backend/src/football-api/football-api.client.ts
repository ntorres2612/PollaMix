import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FootballApiClient {
    constructor(
        private readonly http: HttpService,
    ) { }

    async get(url: string, params?: any) {

        try {

            const response = await firstValueFrom(
                this.http.get(
                    `https://v3.football.api-sports.io${url}`,
                    {
                        headers: {
                            'x-apisports-key': process.env.FOOTBALL_API_KEY,
                        },
                        params,
                    },
                ),
            );

            return response.data;

        } catch (e: any) {

            console.log('==========================');
            console.log('STATUS:', e.response?.status);
            console.log('DATA:', e.response?.data);
            console.log('MESSAGE:', e.message);
            console.log('==========================');

            throw e;

        }




    }
}