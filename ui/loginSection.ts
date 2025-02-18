import { ILogger } from "@rocket.chat/apps-engine/definition/accessors/ILogger";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { APP_ID, uiconstants } from "../constants/constants";

export function getLoginSection(logger: ILogger, tokenAvailable: boolean): LayoutBlock[] {
    if (tokenAvailable) {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "✅ You're logged in to Spotify.  Re-Login if you're having issues."
                }
            }
        ];
    }
    
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: "❌ You must log in to Spotify."
            }
        },
        {
            type: 'input',
            blockId: 'client_id_input',
            element: {
                type: 'plain_text_input',
                actionId: uiconstants.CLIENT_ID_INPUT,
                placeholder: { type: 'plain_text', text: 'Enter Client ID' },
                initialValue: '',
                appId: APP_ID,
                blockId: 'client_id_input',
            },
            label: {
                type: 'plain_text',
                text: 'Spotify Client ID'
            }
        }
    ];
}
