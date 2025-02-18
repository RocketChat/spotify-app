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

        if(await persistanceManager.does_user_have_token(user.id)){
            //this.logger.log('User has a token: '+persistanceManager.get_token(user.id));
           // if(await this.validateAccessToken(await persistanceManager.get_token(user.id), _http)){
            await modify.getUiController().openSurfaceView(
                {
                    type: UIKitSurfaceType.MODAL,
                    title: { text: 'Spotify Status', type: 'plain_text' },
                    blocks: [
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: 'You have a token: '+await persistanceManager.get_token(user.id) },
                        },
                    ],
                },
                { triggerId: context.getTriggerId() || '' },
                context.getSender()
            );
        //}

            }
    
        }
    
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
