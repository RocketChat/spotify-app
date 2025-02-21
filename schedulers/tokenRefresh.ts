import { IEnvironmentRead, IHttp, ILogger, IPersistence, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IRecurringSchedule, IProcessor } from "@rocket.chat/apps-engine/definition/scheduler";
import { GetToken } from "../helpers/getToken";
import { IApiRequest } from "@rocket.chat/apps-engine/definition/api";
import { SpotifyAppApp } from "../SpotifyAppApp";

export class TokenRefresh {
    private scheduler: IRecurringSchedule;
    private processor: IProcessor;

    constructor() {
    }

    public async refreshToken(logger, app, request, _read, _http, _persistence, expiresIn) {
        logger.log('Waiting for token refresh');
        const waitTime = 5000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        logger.log('Token refresh time reached');

        const tokenGetter = new GetToken();
        const refreshed = tokenGetter.getToken(app, request, _read, _http, _persistence);
    } 
}
