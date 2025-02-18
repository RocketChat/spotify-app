import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { SpotifyAppApp } from '../SpotifyAppApp';
import { AppPersistence } from '../persistance/persistance';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';

export class authEndpoint extends ApiEndpoint {
    public path = 'hooks/authCallback';
    public user: IUser;


    constructor(public app: SpotifyAppApp) {
        super(app);
    }

    private reject(): IApiResponse {
        return {
            status: HttpStatusCode.BAD_REQUEST,
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

        const persistanceManager = new AppPersistence(_persistence, _read.getPersistenceReader(), _read);
        
        if (request.query.code) {
            // Log the query directly from request.query instead of request.content.query
            this.app.getLogger().log('Incoming query:', request.query);
            this.app.getLogger().log('We are persisting the token with a value of', request.query.code, 'and user', request.query.state);
            var accessToken = '';

            //exchange the code for an access token
            try {
                const workspaceUrl = await _read.getEnvironmentReader().getSettings().getValueById('workspace url');
                const clientId = await _read.getEnvironmentReader().getSettings().getValueById('client id');
                const clientSecret = await _read.getEnvironmentReader().getSettings().getValueById('client secret');

                //needs to be fixed
                const redirectUri = 'https://morgan-ec2-test.ps-rocketchat.com/api/apps/public/b7a23687-a38b-48ec-89bf-0f8ed1bf6d25/hooks/authCallback'; // The same redirect URI you registered in Spotify Developer Dashboard
    
                const tokenResponse = await _http.post('https://accounts.spotify.com/api/token', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                    },
                    content: `grant_type=authorization_code&code=${request.query.code}&redirect_uri=${redirectUri}`
                });
    
                if (!tokenResponse || tokenResponse.statusCode !== 200) {
                    this.app.getLogger().error('Failed to get access token from Spotify', tokenResponse);
                    return this.reject();
                }
    
                const tokenData = tokenResponse.data;
                accessToken = tokenData.access_token;
                const refreshToken = tokenData.refresh_token;
                const expiresIn = tokenData.expires_in;
    
                this.app.getLogger().log('Received access token:', accessToken);
                this.app.getLogger().log('Received refresh token:', refreshToken);
                this.app.getLogger().log('Token expires in:', expiresIn, 'seconds');

/*                 _persistence.create(
                    {
                        id: request.query.state,
                        token: accessToken,
                    });  */
                    const user = await _read.getUserReader().getById(request.query.state);

                    if(await persistanceManager.does_user_have_token(user.id)){
                        this.app.getLogger().log('User exists, updating token');
                        await persistanceManager.update_token(user.id, accessToken);
                    } else {
                        this.app.getLogger().log('New User, linking user to token');
                        await persistanceManager.link_user_to_token(user, accessToken);
                    }
                    //const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, request.query.state);
        
                    //const persistedData = await _read.getPersistenceReader().readByAssociation(association);
                    const persistedData = await persistanceManager.get_token(request.query.state);
        
                    this.app.getLogger().log("I am getting the persistence value", persistedData);
        
                    
                    return this.success('<html><body><script type="text/javascript"></script><div>Sign-in successful! Please close this window/tab and continue using!</div></body></html>');
    
            } catch (error) {
                this.app.getLogger().error('Error during token exchange:', error);
                return this.reject();
            }
            
        }
        return this.reject();
    }
    
}