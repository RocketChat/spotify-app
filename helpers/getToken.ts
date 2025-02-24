import { IApiRequest, IApiResponse } from "@rocket.chat/apps-engine/definition/api";
import { SpotifyAppApp } from "../SpotifyAppApp";
import { IHttp, IModify, IPersistence, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { AppPersistence } from "../persistance/persistance";
import { REFRESH_TOKEN_ID } from "../constants/constants";

export class GetToken {
    private expireTime: number;
    constructor() {
        // Empty constructor
    }

    public async refreshToken(app: SpotifyAppApp, read: IRead, modify: IModify, http: IHttp, persistence: IPersistence,user:string): Promise<void> {
        const persistanceManager = new AppPersistence(persistence, read.getPersistenceReader(), read, app.getLogger());
    
        try {
            const clientId = await read.getEnvironmentReader().getSettings().getValueById('client id');
            const clientSecret = await read.getEnvironmentReader().getSettings().getValueById('client secret');
    
            // Retrieve all users who have tokens stored
                const refreshToken = await persistanceManager.get_refresh_token(user);
    
                app.getLogger().log(`Refreshing token for user ${user}`);
                app.getLogger().log(`Refresh token for user ${user}:`, refreshToken);
    
                // Request a new access token using the refresh token
                const tokenResponse = await http.post('https://accounts.spotify.com/api/token', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                    },
                    content: `grant_type=refresh_token&refresh_token=${refreshToken}`
                });
    
                if (!tokenResponse || tokenResponse.statusCode !== 200) {
                    modify.getScheduler().cancelJob(REFRESH_TOKEN_ID);
                    app.getLogger().error(`Failed to refresh access token for user`, tokenResponse);
                    return;
                }
    
                const tokenData = tokenResponse.data;
                const newAccessToken = tokenData.access_token;
                const newRefreshToken = tokenData.refresh_token || refreshToken; // Sometimes Spotify doesn't return a new refresh token
                const expiresIn = tokenData.expires_in;
    
                app.getLogger().log(`New access token for user ${user}:`, newAccessToken);
                app.getLogger().log(`New refresh token for user ${user}:`, newRefreshToken);
                app.getLogger().log(`Token expires in: ${expiresIn} seconds`);
    
                // Update tokens in persistence
                await persistanceManager.update_token(user, newAccessToken);
                await persistanceManager.update_refresh_token(user, newRefreshToken);
    
        } catch (error) {
            app.getLogger().error('Error refreshing token:', error);
        }
    }
    

    public async getToken(app: SpotifyAppApp, request: IApiRequest, _read: IRead, _http: IHttp, _persistence: IPersistence, modify: IModify): Promise<boolean> {
        const persistanceManager = new AppPersistence(_persistence, _read.getPersistenceReader(), _read, app.getLogger());
        app.getLogger().log('Incoming query:', request.query);
        var accessToken = '';

        try {
            const workspaceUrl = await _read.getEnvironmentReader().getSettings().getValueById('workspace url');
            const clientId = await _read.getEnvironmentReader().getSettings().getValueById('client id');
            const clientSecret = await _read.getEnvironmentReader().getSettings().getValueById('client secret');
            const redirectUri = workspaceUrl + app.getAccessors().providedApiEndpoints[0].computedPath;

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

            app.getLogger().log('Received token data:', JSON.stringify(tokenData)); 
            app.getLogger().log('Received access token:', accessToken);
            app.getLogger().log('Received refresh token:', refreshToken);
            app.getLogger().log('Token expires in:', expiresIn, 'seconds');
            this.expireTime = expiresIn;

            const user = await _read.getUserReader().getById(request.query.state);

            if (await persistanceManager.does_user_have_token(user.id)) {
                app.getLogger().log('User exists, updating token');
                await persistanceManager.update_token(user.id, accessToken);
                app.getLogger().log('User exists, updating refresh token');
                await persistanceManager.update_refresh_token(user.id, refreshToken);
            } else {
                app.getLogger().log('New User, linking user to token');
                app.getLogger().log('New User id is:', user.id);
                app.getLogger().log('New User access token is:', accessToken);
                await persistanceManager.link_user_to_token(user, accessToken);
                app.getLogger().log('New User, linking user to refresh token');
                app.getLogger().log('New User refresh token is:', refreshToken);
                await persistanceManager.link_user_to_refresh_token(user, refreshToken);
            }

            const persistedData = await persistanceManager.get_token(user.id);
            app.getLogger().log("I am getting the persistence value", persistedData);
            const persistedRefreshToken = await persistanceManager.get_refresh_token(user.id);
            app.getLogger().log("I am getting the persistence refresh value", persistedRefreshToken);

            return true;

        } catch (error) {
            modify.getScheduler().cancelJob(REFRESH_TOKEN_ID);
            app.getLogger().error('Error during token exchange:', error);
            return false;
        }
    }
}