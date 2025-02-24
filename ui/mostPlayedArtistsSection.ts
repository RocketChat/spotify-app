import { ILogger, IPersistence } from "@rocket.chat/apps-engine/definition/accessors";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { IHttp, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { AppPersistence } from "../persistance/persistance";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { APP_ID } from "../constants/constants";

export async function getMostPlayedArtistsSection(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<LayoutBlock[]> {
    logger.log('Calling Spotify API to get most played artists');
    const artists = await getMostPlayedArtists(logger, http, read, persistance, user);

    const artistBlocks: LayoutBlock[] = [];
    let i = 0;
    while (i < artists.length) {
        // Extract artist details
        const artist = artists[i];
        const artistName = artist.name;
        const genres = artist.genres.length > 0 ? artist.genres.join(", ") : "No genres available";
        const artistImageUrl = artist.images && artist.images.length > 0 ? artist.images[0].url : "";
        
        // Get the popularity rating based on the artist's popularity value
        const popularityRating = getPopularityRating(artist.popularity);

        artistBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*${artistName}*\nGenres: ${genres}\nPopularity: ${popularityRating}`
            },
            accessory: {
                type: "image",
                imageUrl: artistImageUrl,
                altText: artistName
            }
        });

        artistBlocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Share",
                        emoji: true
                    },
                    value: artist.id,
                    actionId: "share_artist_" + artist.id,
                    appId: APP_ID,
                    blockId: "most_played_artists",
                }
            ]
        });

        i++;
    } 

    return artistBlocks;
}

async function getMostPlayedArtists(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<any[]> {
    logger.log('Fetching top artists');
    const persistanceManager = new AppPersistence(persistance, read.getPersistenceReader(), read, logger);
    logger.log('User is', user);
    const token = await persistanceManager.get_token(user?.id || '');
    logger.log('Token is', token);
    try {
        const response = await http.get('https://api.spotify.com/v1/me/top/artists', {
           headers: {
               Authorization: `Bearer ${token}`
           }
        });

        if (response.statusCode !== 200) {
            logger.error(`Failed to fetch top artists: ${response.statusCode} - ${response.content}`);
            return [];
        }

        const data = JSON.parse(response.content || '{}');
        logger.log('Top artists fetched successfully and the value is', data.items);
        return data.items || [];
    } catch (error) {
        logger.error(`Error fetching top artists: ${error}`);
        return [];
    }
}

function getPopularityRating(popularity: number): string {
    if (popularity >= 80) {
        return "Extremely Popular";
    } else if (popularity >= 60) {
        return "Very Popular";
    } else if (popularity >= 40) {
        return "Average Popularity";
    } else if (popularity >= 20) {
        return "Less Popular";
    } else {
        return "Obscure";
    }
}
