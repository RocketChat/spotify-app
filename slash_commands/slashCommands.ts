import type { IModify, IRead, IHttp, IPersistence, IHttpResponse, ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import type { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { AppPersistence } from '../persistance/persistance';
import { UIKitSurfaceType } from '@rocket.chat/apps-engine/definition/uikit';

export class getStatus implements ISlashCommand {
	public command: string;

	public i18nParamsExample: string;

	public i18nDescription: string;

	public providesPreview: boolean;

    private logger: ILogger;

    private responseValue: { display_name: string; email: string; followers: { total: number } };

	constructor(logger: ILogger) {
        this.logger = logger;
		this.command = 'get-status-spotify';
		this.i18nParamsExample = 'params_example';
		this.i18nDescription = 'command_description';
		this.providesPreview = false;
	}

	public async executor(
		context: SlashCommandContext,
		_read: IRead,
		modify: IModify,
		_http: IHttp,
		_persistence: IPersistence,
	): Promise<void> {
        const user = context.getSender();
        const persistanceManager = new AppPersistence(_persistence, _read.getPersistenceReader(), _read);

        //checks if the user has a token no point in proceeding without
        if(await persistanceManager.does_user_have_token(user.id)){
            //now we check if the token is valid
            if(await this.validateAccessToken(await persistanceManager.get_token(user.id), _http)){
            //display the user's information
            await modify.getUiController().openSurfaceView(
                {
                    type: UIKitSurfaceType.MODAL,
                    title: { text: 'Spotify Status', type: 'plain_text' },
                    blocks: [
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `Full Name: ${this.responseValue.display_name}` },
                        },
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `E-Mail: ${this.responseValue.email}` },
                        },
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `Followers: ${this.responseValue.followers.total}` },
                        },
                    ],
                },
                { triggerId: context.getTriggerId() || '' },
                context.getSender()
            );
        }

            }
    
        }
        
        //uses the /v1/me endpoint to get the user's information
        public async validateAccessToken(accessToken: string,http:IHttp): Promise<boolean> {
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
                    this.responseValue=response.data;
                    return true;
                } else {
                    this.logger.log(`Spotify token validation failed: ${JSON.stringify(response.data)}`);
                    return false;
                }
            } catch (error) {
                this.logger.log("Error validating Spotify token:", error);
                throw error;
            }
        }
}
