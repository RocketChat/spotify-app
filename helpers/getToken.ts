import { IApiRequest, IApiResponse } from "@rocket.chat/apps-engine/definition/api";
import { SpotifyAppApp } from "../SpotifyAppApp";
import { IHttp, IPersistence, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { AppPersistence } from "../persistance/persistance";
import { TokenRefresh } from "../schedulers/tokenRefresh";

export class GetToken {
    constructor() {
        // Empty constructor
    }
    public async getToken(app: SpotifyAppApp, request: IApiRequest, _read: IRead, _http: IHttp, _persistence: IPersistence): Promise<boolean> {
        const persistanceManager = new AppPersistence(_persistence, _read.getPersistenceReader(), _read, app.getLogger());
        // Log the query directly from request.query instead of request.content.query
        app.getLogger().log('Incoming query:', request.query);
        //this.app.getLogger().log('We are persisting the code with a value of', request.query.code, 'and user', request.query.state);
        var accessToken = '';
        //exchange the code for an access token
        try {
            const workspaceUrl = await _read.getEnvironmentReader().getSettings().getValueById('workspace url');
            const clientId = await _read.getEnvironmentReader().getSettings().getValueById('client id');
            const clientSecret = await _read.getEnvironmentReader().getSettings().getValueById('client secret');
            const redirectUri = workspaceUrl+app.getAccessors().providedApiEndpoints[0].computedPath;
            
            app.getLogger().log('Redirect URI:', redirectUri);

            const tokenResponse = await _http.post('https://accounts.spotify.com/api/token', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                },
                content: `grant_type=authorization_code&code=${request.query.code}&redirect_uri=${redirectUri}`
            });

            if (!tokenResponse || tokenResponse.statusCode !== 200) {
                app.getLogger().error('Failed to get access token from Spotify', tokenResponse);
                return false;
            }

            const tokenData = tokenResponse.data;
            accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;
            const expiresIn = tokenData.expires_in;

            app.getLogger().log('Received access token:', accessToken);
            app.getLogger().log('Received refresh token:', refreshToken);
            app.getLogger().log('Token expires in:', expiresIn, 'seconds');

            const user = await _read.getUserReader().getById(request.query.state);

            if(await persistanceManager.does_user_have_token(user.id)){
                app.getLogger().log('User exists, updating token');
                await persistanceManager.update_token(user.id, accessToken);
            } else {
                app.getLogger().log('New User, linking user to token');
                await persistanceManager.link_user_to_token(user, accessToken);
            }

            const persistedData = await persistanceManager.get_token(user.id);
    
            app.getLogger().log("I am getting the persistence value", persistedData);

            app.getLogger().log('setting job to refresh token');

            const tokenRefresher = new TokenRefresh();
            tokenRefresher.refreshToken(app.getLogger(), app, request, _read, _http, _persistence, expiresIn);
           
            return true;

    }catch (error) {
        app.getLogger().error('Error during token exchange:', error);
        return false;
    }

    }
}

