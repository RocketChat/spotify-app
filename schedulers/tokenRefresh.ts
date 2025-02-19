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

    public async refreshToken(logger: ILogger, app: SpotifyAppApp, request: IApiRequest, _read: IRead, _http: IHttp, _persistence: IPersistence): Promise<void> {

        logger.log('Building Process');
        this.processor.processor = async (): Promise<void> => {
            const tokenGetter = new GetToken();
            const getToken = await tokenGetter.getToken(app, request, _read, _http, _persistence);
            return;
        }
    }

}
