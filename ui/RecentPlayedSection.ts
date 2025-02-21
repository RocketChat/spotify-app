import { ILogger, IPersistence } from "@rocket.chat/apps-engine/definition/accessors";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { IHttp, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { AppPersistence } from "../persistance/persistance";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { APP_ID } from "../constants/constants";

export async function getRecentPlayedSongsSection(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<LayoutBlock[]> {
    logger.log('Calling Spotify API to get recently played songs');
    const songs = await getRecentlyPlayedSongs(logger, http, read, persistance, user);

    const songBlocks: LayoutBlock[] = [];
    let i = 0;
    while (i < songs.length) {
        // Each item in the recently played response contains a 'track' field.
        const item = songs[i];
        const track = item.track;
        const trackName = track.name;
        const albumName = track.album.name;
        const artistNames = track.artists.map((artist: any) => artist.name).join(", ");
        const albumImageUrl = (track.album.images && track.album.images.length > 0)
            ? track.album.images[0].url
            : "";
        
        // Get the popularity rating based on the track's popularity value
        const popularityRating = getPopularityRating(track.popularity);
        songBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*${trackName}*\nArtist: ${artistNames}\nAlbum: ${albumName}\nPopularity: ${popularityRating}`
            },
            accessory: {
                type: "image",
                imageUrl: albumImageUrl,
                altText: albumName
            }
        });
        songBlocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Share",
                        emoji: true
                    },
                    value: track.id,
                    actionId: "share_song_" + track.id,
                    appId: APP_ID,
                    blockId: "recent_played_songs",
                }
            ]
        });
        i++;
    } 
    return songBlocks;
}

async function getRecentlyPlayedSongs(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<any[]> {
    logger.log('Fetching recently played tracks');
    const persistanceManager = new AppPersistence(persistance, read.getPersistenceReader(), read, logger);
    const token = await persistanceManager.get_token(user?.id || '');
    logger.log('Token is', token);

    // Spotify's API has a maximum limit of 50 per request, so we paginate to fetch up to 100 tracks.
    let url = 'https://api.spotify.com/v1/me/player/recently-played?limit=50';
    let allItems: any[] = [];

    try {
        while (url && allItems.length < 100) {
            const response = await http.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.statusCode !== 200) {
                logger.error(`Failed to fetch recently played tracks: ${response.statusCode} - ${response.content}`);
                break;
            }

            const data = JSON.parse(response.content || '{}');
            if (data.items && Array.isArray(data.items)) {
                allItems.push(...data.items);
            }
            url = data.next; // Continue to next page if available.
        }

        // Deduplicate items based on track.id, preserving order, then take up to 25 unique tracks.
        const uniqueTracksMap = new Map<string, any>();
        const uniqueItems: any[] = [];

        for (const item of allItems) {
            const track = item.track;
            if (track && track.id && !uniqueTracksMap.has(track.id)) {
                uniqueTracksMap.set(track.id, true);
                uniqueItems.push(item);
            }
            if (uniqueItems.length >= 25) break;
        }

        logger.log('Recently played unique tracks fetched successfully and the value is', uniqueItems);
        return uniqueItems;
    } catch (error) {
        logger.error(`Error fetching recently played tracks: ${error}`);
        return [];
    }
}

function getPopularityRating(popularity: number): string {
    if (popularity >= 80) {
        return "Extremely";
    } else if (popularity >= 60) {
        return "Very";
    } else if (popularity >= 40) {
        return "Average";
    } else if (popularity >= 20) {
        return "Less";
    } else {
        return "Obscure";
    }
}
