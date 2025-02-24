import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IPersistence, IPersistenceRead, IRead, IRoomRead, IHttp, IModify, ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
    private logger: ILogger;

    //constructs
    constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead, private readonly read: IRead, logger: ILogger) {
        this.logger = logger;
     }

    //link new user to token
    public async link_user_to_token(user: IUser, token: string): Promise<void> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${user.id}_token`);
        await this.persistence.createWithAssociation({
            id: user.id,
            token: token,
        }, association);
    }

    //link new user to refresh token
    public async link_user_to_refresh_token(user: IUser, refreshToken: string): Promise<void> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${user.id}_refreshToken`);
        await this.persistence.createWithAssociation({
            id: user.id,
            refreshToken: refreshToken,
        }, association);  
    }

    //update token for existing user
    public async update_token(id: string, accessToken: string) {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${id}_token`);
        await this.persistence.updateByAssociation(association, {
            id: id,
            token: accessToken,
        });
    }

    //update refresh token for existing user
    public async update_refresh_token(id: string, refreshToken: string) {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${id}_refreshToken`);
        await this.persistence.updateByAssociation(association, {
            id: id,
            refreshToken: refreshToken,
        });
    }

    //get refresh token for a user
    public async get_refresh_token(user: string): Promise<string> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${user}_refreshToken`);
        const persistedData = await this.read.getPersistenceReader().readByAssociation(association);
        const refreshToken = persistedData.length > 0 ? (persistedData[0] as any).refreshToken : null;
        return refreshToken;
    }

    //get token for a user
    public async get_token(user: string): Promise<string> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${user}_token`);
        const persistedData = await this.read.getPersistenceReader().readByAssociation(association);
        const token = persistedData.length > 0 ? (persistedData[0] as any).token : null;
        return token;
    }

    //checks if user has persisted token even if not valid
    public async does_user_have_token(user: string): Promise<boolean> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${user}_token`);
        const persistedData = await this.read.getPersistenceReader().readByAssociation(association);
        const token = persistedData.length > 0 ? (persistedData[0] as any).token : null;
        if(token != null) {
            return true;
        }
        return false;
    }

    //validate the access token and returns data
    public async validateAccessToken(accessToken: string, http: IHttp): Promise<{ success: boolean, display_name: string; email: string; followers: { total: number } }> {
        var responseValue: { success: boolean, display_name: string; email: string; followers: { total: number } } = { success: false, display_name: '', email: '', followers: { total: 0 } };
        const SPOTIFY_API_URL = "https://api.spotify.com/v1/me";
        try {
            const response = await http.get(SPOTIFY_API_URL, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.statusCode === 200) {
                this.logger.log("Spotify token validation successful, the response was: ", response.data);
                responseValue = response.data;
                responseValue.success = true;
                return responseValue;
            } else {
                this.logger.log(`Spotify token validation failed: ${JSON.stringify(response.data)}`);
                responseValue.success = false;
                return responseValue;
            }
        } catch (error) {
            this.logger.log("Error validating Spotify token:", error);
            throw error;
        }
    }
}