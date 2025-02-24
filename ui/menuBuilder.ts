import { IHttp, ILogger, IPersistence, IRead, IUIKitSurfaceViewParam } from "@rocket.chat/apps-engine/definition/accessors";
import { getMostPlayedSongsSection } from "./mostPlayedSongsSection";
import { getSpotifyMenuSection } from "./spotifyMenuSection";
import { UIKitSurfaceType } from "@rocket.chat/apps-engine/definition/uikit";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { getRecentPlayedSongsSection } from "./RecentPlayedSection";
import { getMostPlayedArtistsSection } from "./mostPlayedArtistsSection";

export class MenuBuilder {
    constructor() {
        // Empty constructor
    }

    public async buildMostPlayedSongView(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence,user: IUser): Promise<IUIKitSurfaceViewParam> {
        logger.log('Building most played songs view');
        const spotifyMenuSection = getSpotifyMenuSection(logger);
        const mostPlayedSongsSection = await getMostPlayedSongsSection(logger, http, read, persistance, user);
        return {
            type: UIKitSurfaceType.CONTEXTUAL_BAR,
            title: { text: 'Most Played Songs', type: 'plain_text' },
            blocks: [
                ...spotifyMenuSection,
                ...[{ type: 'divider' }] as LayoutBlock[],
                ...mostPlayedSongsSection
            ]
        };
    }

    public async buildMostPlayedArtistView(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence,user: IUser): Promise<IUIKitSurfaceViewParam> {
        logger.log('Building most played songs view');
        const spotifyMenuSection = getSpotifyMenuSection(logger);
        const mostPlayedSongsSection = await getMostPlayedArtistsSection(logger, http, read, persistance, user);
        return {
            type: UIKitSurfaceType.CONTEXTUAL_BAR,
            title: { text: 'Most Played Songs', type: 'plain_text' },
            blocks: [
                ...spotifyMenuSection,
                ...[{ type: 'divider' }] as LayoutBlock[],
                ...mostPlayedSongsSection
            ]
        };
    }

    public async buildRecentPlayedView(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence,user: IUser): Promise<IUIKitSurfaceViewParam> {
        logger.log('Building most recent songs view');
        const spotifyMenuSection = getSpotifyMenuSection(logger);
        const recentlyPlayedSongsSection = await getRecentPlayedSongsSection(logger, http, read, persistance, user);
        return {
            type: UIKitSurfaceType.CONTEXTUAL_BAR,
            title: { text: 'Most Recent Played Songs', type: 'plain_text' },
            blocks: [
                ...spotifyMenuSection,
                ...[{ type: 'divider' }] as LayoutBlock[],
                ...recentlyPlayedSongsSection
            ]
        };
    }
}