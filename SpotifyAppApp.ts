import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo, RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { UIActionButtonContext } from '@rocket.chat/apps-engine/definition/ui';
import { persistenceconstants, uiconstants } from './constants/constants';
import { IUIKitResponse, UIKitActionButtonInteractionContext, UIKitSurfaceType, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { getLoginSection } from './ui/loginSection';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { authEndpoint } from './endpoints/authEndpoint';
import { AppPersistence } from './persistance/persistance';
import { settings } from './settings/settings';
import { getStatus } from './slash_commands/slashCommands';

export class SpotifyAppApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        // Register the slash command
        await configuration.slashCommands.provideSlashCommand(new getStatus(this.getLogger()));

        // Register the settings
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // Register the button
        configuration.ui.registerButton({
            actionId: uiconstants.USER_SETTING_BUTTON,
            labelI18n: 'user_settings', 
            context: UIActionButtonContext.USER_DROPDOWN_ACTION,
        });

        // Register the endpoint
        await configuration.api.provideApi({
			visibility: ApiVisibility.PUBLIC,
			security: ApiSecurity.UNSECURE,
			endpoints: [new authEndpoint(this)],
		});
    }

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const { actionId, user } = context.getInteractionData();
        const persistanceManager = new AppPersistence(persistence, read.getPersistenceReader(), read);

        switch (actionId) {
            case uiconstants.USER_SETTING_BUTTON: {
                this.getLogger().log('User Opened User Settings Modal');

                var loginSectionBlock;
                if (await persistanceManager.does_user_have_token(user.id)){
                    loginSectionBlock = await getLoginSection(this.getLogger(), true);
                }
                else { 
                    loginSectionBlock = await getLoginSection(this.getLogger(), false);
                }
                await modify.getUiController().openSurfaceView(
                    {
                        type: UIKitSurfaceType.MODAL,
                        title: { text: uiconstants.USER_SETTING_MODAL, type: 'plain_text' },
                        blocks: [...loginSectionBlock],
                        submit: { text: { text: 'Login Into Spotify', type: 'plain_text' }, type: 'button', actionId: uiconstants.SPOTIFY_SIGN_IN_BUTTON, appId: this.getID(), blockId: 'sign-in' },
                    },
                    { triggerId: context.getInteractionData().triggerId },
                    user
                );
                break;
            }
        }
        return context.getInteractionResponder().successResponse();
    }

    public async executeViewSubmitHandler(context: UIKitViewSubmitInteractionContext, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify): Promise<void> {
        const { view, user } = context.getInteractionData();

        const persistanceManager = new AppPersistence(persistence, read.getPersistenceReader(), read);

        this.getLogger().log('User Submitted View:', view.id);

        if (!view.submit) {
            this.getLogger().warn('View submit is undefined.');
            return;
        }

        switch (view.submit.actionId) {
            case uiconstants.SPOTIFY_SIGN_IN_BUTTON: {
                this.getLogger().log('User Clicked Sign In Button:', view);

                const token = await persistanceManager.get_token(user.id);
                
                this.getLogger().log("I am getting the token value", token);

                //get settings value of workspace url
                const workspaceUrl = await read.getEnvironmentReader().getSettings().getValueById('workspace url');

                this.getLogger().log('Workspace URL:', workspaceUrl);

                const redirectUri = workspaceUrl + this.getAccessors().providedApiEndpoints[0].computedPath;// The URL to redirect back to after authorization
                const scope = 'user-library-read user-read-email'; // Spotify API scopes you need
                const state = user.id;

                this.getLogger().log('Redirect URI:', redirectUri);

                
                //const clientId = '0225eec752e54b57b1bc6e51039afab5'; // Your Spotify App's Client ID
                const clientId = await read.getEnvironmentReader().getSettings().getValueById('client id');

                const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

                //Send the user to the Spotify Authorization URL
                await modify.getUiController().openSurfaceView(
                    {
                        type: UIKitSurfaceType.MODAL,
                        title: { text: 'Spotify Authorization', type: 'plain_text' },
                        blocks: [
                            {
                                type: 'section',
                                text: { type: 'mrkdwn', text: `Click here to authorize Spotify: [Authorize Spotify](${authUrl})` },
                            },
                        ],
                    },
                    { triggerId: context.getInteractionData().triggerId },
                    user
                );
                break;
            }
        }
    }

    public async executeBlockActionHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> { 
        const { actionId, room, user} = context.getInteractionData();

        this.getLogger().log('User Clicked Block Action:', actionId);

        switch (actionId) {
            case uiconstants.CLIENT_ID_INPUT: {
                this.getLogger().log('User Submitted Modal with Client ID');
            
                // Step 1: Retrieve input value from modal state
                const modalState = (context.getInteractionData() as any).state || {};
                const input = modalState['client_id_input']?.['client_id_input_field'] as string;
            
                if (!input || input.trim() === '') {
                    this.getLogger().warn('No Client ID was provided.');
                    return; // Exit early if no input is provided
                }
            
                // Step 2: Check if the input is already persisted
                const association = new RocketChatAssociationRecord(
                    RocketChatAssociationModel.USER,
                    `${context.getInteractionData().user.id}-${persistenceconstants.CLIENT_ID}`
                );
            
                const existingClientId = await read.getPersistenceReader().readByAssociation(association) as unknown as string | undefined;
            
                if (existingClientId && existingClientId === input) {
                    this.getLogger().log('Client ID has not changed, no update needed.');
                    return; // Exit early if the input matches the persisted value
                }
            
                // Step 3: Persist the new Client ID
                await persistence.updateByAssociation(association, { value: input });
            
                this.getLogger().log('Stored new Client ID:', input);
            
                break;
            }
        }
    }
}
