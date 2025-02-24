import { HttpStatusCode, IConfigurationExtend, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { SpotifyAppApp } from '../SpotifyAppApp';
import { AppPersistence } from '../persistance/persistance';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { GetToken } from '../helpers/getToken';
import { authLandingPageCode, authLandingPageFailureCode, REFRESH_TOKEN_ID } from '../constants/constants';
import { IJobContext } from '@rocket.chat/apps-engine/definition/scheduler';
import { tokenRefreshJob } from '../schedulers/tokenRefreshJob';

export class authEndpoint extends ApiEndpoint {
    public path = 'hooks/authCallback';
    public user: IUser;

    constructor(public app: SpotifyAppApp) {
        super(app);
    }

    private reject(): IApiResponse {
        return {
            status: HttpStatusCode.BAD_REQUEST,
            content: authLandingPageFailureCode,
            headers: {
                'Content-Type': 'text/html',
            },
        };
    }


    public async post(
        request: IApiRequest,
        _endpoint: IApiEndpointInfo,
        _read: IRead,
        modify: IModify,
        _http: IHttp,
        _persistence: IPersistence,
    ): Promise<IApiResponse> {
        this.app.getLogger().log('Incoming payload:', request.content);

        return this.success();
    }

    public async get(
        request: IApiRequest,
        _endpoint: IApiEndpointInfo,
        _read: IRead,
        modify: IModify,
        _http: IHttp,
        _persistence: IPersistence,
    ): Promise<IApiResponse> {
        this.app.getLogger().log('Incoming payload:', request);
        //modify.getScheduler().cancelJob(REFRESH_TOKEN_ID);

        const tokenGetter = new GetToken();
        const getToken = await tokenGetter.getToken(this.app, request, _read, _http, _persistence, modify);

        if(getToken){
            const refreshTokenJob = new tokenRefreshJob(this.app);
            const job = refreshTokenJob.getSpotifyTokenRefresh();
            const jobContext: IJobContext = {
                data: {
                    request
                }
            };
            
            modify.getScheduler().scheduleRecurring({
                ...job,
                interval: '30 minutes',
                data: jobContext,
                skipImmediate: true
            });

            //landing page displayed
            return this.success(authLandingPageCode);
        }else{
            //landing page displayed
            return this.reject();
        }
    }
    
}