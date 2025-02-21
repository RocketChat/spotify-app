import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
    IUIKitSurfaceViewParam,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo, RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { UIActionButtonContext } from '@rocket.chat/apps-engine/definition/ui';
import { uiconstants } from './constants/constants';
import { IUIKitResponse, UIKitActionButtonInteractionContext, UIKitSurfaceType, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { getLoginSection } from './ui/loginSection';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { authEndpoint } from './endpoints/authEndpoint';
import { AppPersistence } from './persistance/persistance';
import { settings } from './settings/settings';
import { getStatus } from './slash_commands/slashCommands';
import { getSpotifyMenuSection } from './ui/spotifyMenuSection';

import { MenuBuilder } from './ui/menuBuilder';
import { MessageBuilder } from './ui/messageBuilder';
import { StartupType } from '@rocket.chat/apps-engine/definition/scheduler';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export class SpotifyAppApp extends App {


    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {

        // Register the slash command
        await configuration.slashCommands.provideSlashCommand(new getStatus(this.getLogger()));

        // Register the settings
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));
        
        // Register the button for login
        configuration.ui.registerButton({
            actionId: uiconstants.USER_SETTING_BUTTON,
            labelI18n: uiconstants.USER_SETTING_MODAL,
            context: UIActionButtonContext.USER_DROPDOWN_ACTION,
        });

        //register button for sharing
        configuration.ui.registerButton({
            actionId: uiconstants.SHARE_SONG_ACTION,
            labelI18n: uiconstants.SHARE_SONG_BUTTON,
            context: UIActionButtonContext.ROOM_ACTION 
        });

        // Register the endpoint
        await configuration.api.provideApi({
			visibility: ApiVisibility.PUBLIC,
			security: ApiSecurity.UNSECURE,
			endpoints: [new authEndpoint(this)],
		},);

    }

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
        room: IRoom
    ): Promise<IUIKitResponse> {
        const { actionId, user } = context.getInteractionData();
        const persistanceManager = new AppPersistence(persistence, read.getPersistenceReader(), read, this.getLogger());

        switch (actionId) {
            case uiconstants.SHARE_SONG_ACTION: {
                this.getLogger().log('User wants to share a song');
                const spotifySideBar = async (logger: ILogger) : Promise<IUIKitSurfaceViewParam> => {
                
                    const spotifyMenuSection = getSpotifyMenuSection(logger);
                
                    return  {
                        type: UIKitSurfaceType.CONTEXTUAL_BAR,
                        title: { text: 'Spotify', type: 'plain_text' },
                        blocks: [
                            ...spotifyMenuSection
                        ]
                    };
                
                }
                const view = await spotifySideBar(this.getLogger());
                // Send the view (contextual bar) to the room
                await modify.getUiController().openSurfaceView(view, context.getInteractionData(), user);

                break;
            }
            case uiconstants.USER_SETTING_BUTTON: {
                this.getLogger().log('User Opened User Settings Modal');

                var loginSectionBlock;
                var loginButton;
                //gets token and validates it
                const token = await persistanceManager.get_token(user.id);
                const responseValue = await persistanceManager.validateAccessToken(token, http);

                if (responseValue.success) {
                    loginSectionBlock = await getLoginSection(this.getLogger(), true);
                    loginButton='Login Into Spotify';
                }
                else { 
                    loginSectionBlock = await getLoginSection(this.getLogger(), false);
                    loginButton='Re-Login Into Spotify';
                }
                await modify.getUiController().openSurfaceView(
                    {
                        type: UIKitSurfaceType.MODAL,
                        title: { text: uiconstants.USER_SETTING_MODAL, type: 'plain_text' },
                        blocks: [...loginSectionBlock],
                        submit: { text: { text: loginButton, type: 'plain_text' }, type: 'button', actionId: uiconstants.SPOTIFY_SIGN_IN_BUTTON, appId: this.getID(), blockId: 'sign-in' },
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

        const persistanceManager = new AppPersistence(persistence, read.getPersistenceReader(), read, this.getLogger());

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
                const scope = 'user-library-read user-read-email user-top-read user-read-recently-played';// Spotify API scopes you need

                const state = user.id;

                this.getLogger().log('Redirect URI:', redirectUri);

                //get settings value of client id
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
                                text: { type: 'plain_text', text: 'Click below to sign in to Spotify:' },
                                accessory: {
                                    type: 'button',
                                    text: { type: 'plain_text', text: 'Sign-In to Spotify' },
                                    url: authUrl,
                                    appId: this.getID(),
                                    blockId: 'authorize-spotify-block',
                                    actionId: 'authorize-spotify-action',
                                },
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
        var { actionId, room, user} = context.getInteractionData();
        var songId = '';

        if (actionId.startsWith('share_song_')) {
            songId = actionId.replace('share_song_', '');
            actionId = uiconstants.SHARE_SONG_ACTION;
            this.getLogger().log('User Clicked Share Song Button:', songId);
        }else{
            this.getLogger().log('User Clicked Block Action:', actionId);
        }

        switch (actionId) {
            case uiconstants.MOST_PLAYED_SONG_ACTION: { 
                const menuBuilderInstance = new MenuBuilder();
                this.getLogger().log('User Clicked Most Played Songs Button');
                const view = await menuBuilderInstance.buildMostPlayedView(this.getLogger(),http, read, persistence, user);
                await modify.getUiController().openSurfaceView(view, { triggerId: context.getInteractionData().triggerId }, user);
                break;
            }
            case uiconstants.RECENTLY_PLAYED_SONG_ACTION: {
                const menuBuilderInstance = new MenuBuilder();
                this.getLogger().log('User Clicked Recently Played Songs Button');
                const view = await menuBuilderInstance.buildRecentPlayedView(this.getLogger(),http, read, persistence, user);
                await modify.getUiController().openSurfaceView(view, { triggerId: context.getInteractionData().triggerId }, user);
                break;
            }

            case uiconstants.SHARE_SONG_ACTION: {
                this.getLogger().log('User Clicked Share Song Button Executing');
                const messageBuilderInstance = new MessageBuilder();
                this.getLogger().log('The user is:', user+' and the room is:', room.id+' and the songId is:', songId);
                const message = await messageBuilderInstance.buildShareSongMessage(songId, user, room, persistence, read, http, this.getLogger());
                this.getLogger().log('The message is:', JSON.stringify(message));
                const messageBuilder = await modify.getCreator().startMessage(message);
                await modify.getCreator().finish(messageBuilder);
                break;
            }
        }
    }

}

