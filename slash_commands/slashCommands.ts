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

    //private responseValue: { display_name: string; email: string; followers: { total: number } };

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
        const persistanceManager = new AppPersistence(_persistence, _read.getPersistenceReader(), _read, this.logger);

        var responseValue: {success: boolean, display_name: string; email: string; followers: { total: number } };
        responseValue = await persistanceManager.validateAccessToken(await persistanceManager.get_token(user.id), _http);
        //checks if user has valid token
        if(responseValue.success){
            await modify.getUiController().openSurfaceView(
                {
                    type: UIKitSurfaceType.MODAL,
                    title: { text: 'Spotify Status', type: 'plain_text' },
                    blocks: [
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `Full Name: ${responseValue.display_name}` },
                        },
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `E-Mail: ${responseValue.email}` },
                        },
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `Followers: ${responseValue.followers.total}` },
                        },
                    ],
                },
                { triggerId: context.getTriggerId() || '' },
                context.getSender()
            );
        }else{
            await modify.getUiController().openSurfaceView(
                {
                    type: UIKitSurfaceType.MODAL,
                    title: { text: 'Spotify Status', type: 'plain_text' },
                    blocks: [
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `You are not logged in.` },
                        }
                    ],
                },
                { triggerId: context.getTriggerId() || '' },
                context.getSender()
            );
        }
    
    }
}
