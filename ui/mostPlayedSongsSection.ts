import { ILogger, IPersistence } from "@rocket.chat/apps-engine/definition/accessors";
import { LayoutBlock } from "@rocket.chat/ui-kit";
import { IHttp, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { AppPersistence } from "../persistance/persistance";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { APP_ID } from "../constants/constants";

export async function getMostPlayedSongsSection(logger: ILogger,http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<LayoutBlock[]> {
    logger.log('Calling Spotify API to get most played songs');
    const songs = await getMostPlayedSongs(logger, http, read, persistance, user);

    const songBlocks: LayoutBlock[] = [];
    let i = 0;
    while ( i < songs.length) {
            // Extract song details
            const track = songs[i];
            const trackName = track.name;
            const albumName = track.album.name;
            const artistNames = track.artists.map((artist: any) => artist.name).join(", ");
            const albumImageUrl =
            track.album.images && track.album.images.length > 0
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
                    actionId: "share_song_"+track.id,
                    appId: APP_ID,
                    blockId: "most_played_songs",
                  }
                ]
              })
            i++;
    } 
      return songBlocks;
}

async function getMostPlayedSongs(logger: ILogger, http: IHttp, read: IRead, persistance: IPersistence, user: IUser): Promise<any[]> {
    logger.log('Fetching top tracks');
    const persistanceManager = new AppPersistence(persistance, read.getPersistenceReader(), read);
    logger.log('User is', user);
    const token = await persistanceManager.get_token(user?.id || '');
    logger.log('Token is', token);
    try {
        const response = await http.get('https://api.spotify.com/v1/me/top/tracks', {
           headers: {
            Authorization: `Bearer ${token}`
            }
        });

        if (response.statusCode !== 200) {
            logger.error(`Failed to fetch top tracks: ${response.statusCode} - ${response.content}`);
            return [];
        }

        const data = JSON.parse(response.content || '{}');
            logger.log('Top tracks fetched successfully and the value is', data.items);
            return data.items || [];
    } catch (error) {
        logger.error(`Error fetching top tracks: ${error}`);
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