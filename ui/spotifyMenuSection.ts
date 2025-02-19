import { ILogger } from "@rocket.chat/apps-engine/definition/accessors";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { APP_ID, uiconstants } from "../constants/constants";



export function getSpotifyMenuSection(logger: ILogger): LayoutBlock[] {
    const spotifyMenuBlocks: LayoutBlock[] = [
        {
            type: 'section',
            blockId: 'example_section_buttons_title',
            text: {
                type: 'mrkdwn',
                text: `### ${uiconstants.SPOTIFY_MENU_TITLE}`,
            },
        },
        {
            type: 'actions',
            blockId: uiconstants.SPOTIFY_MENU_BLOCK_ID,
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: uiconstants.MOST_PLAYED_SONGS },
                    actionId: uiconstants.MOST_PLAYED_SONG_ACTION,
                    blockId: uiconstants.SPOTIFY_MENU_BLOCK_ID,
                    appId: APP_ID,
                    value: 'button_1'
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: uiconstants.RECENTLY_PLAYED_SONGS },
                    actionId: uiconstants.RECENTLY_PLAYED_SONG_ACTION,
                    blockId: uiconstants.SPOTIFY_MENU_BLOCK_ID,
                    appId: APP_ID,
                    value: 'button_1'
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: uiconstants.MOST_PLAYED_ARTISTS },
                    actionId: uiconstants.MOST_PLAYED_ARTIST_ACTION,
                    blockId: uiconstants.SPOTIFY_MENU_BLOCK_ID,
                    appId: APP_ID,
                    value: 'button_2'
                }
            ],
        },
    ];

    return spotifyMenuBlocks;
}