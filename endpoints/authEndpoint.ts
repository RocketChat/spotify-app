import { HttpStatusCode, IConfigurationExtend, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { SpotifyAppApp } from '../SpotifyAppApp';
import { AppPersistence } from '../persistance/persistance';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { GetToken } from '../helpers/getToken';
import { authLandingPageCode, authLandingPageFailureCode } from '../constants/constants';

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
        
        const tokenGetter = new GetToken();
        const getToken = await tokenGetter.getToken(this.app, request, _read, _http, _persistence);

        if(getToken){
            //landing page displayed
            return this.success(authLandingPageCode);
        }else{
            //landing page displayed
            return this.reject();
        }
    }
    
}