import { IHttp, ILogger, IPersistence, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { MessageActionType } from "@rocket.chat/apps-engine/definition/messages";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { AppPersistence } from "../persistance/persistance";

export class MessageBuilder {
    constructor() {
        // Empty constructor
    }

    public async buildShareSongMessage(songId: string, user: IUser, room: IRoom, persistance: IPersistence, read: IRead, http: IHttp, logger: ILogger): Promise<IMessage> {
        // Fetch song details from Spotify
        const songData = await this.getSongData(songId, persistance, read, user, http, logger);

        // Extract the necessary details
        const songName: string = songData.name;
        const artists: string = songData.artists.map((artist: any) => artist.name).join(', ');
        const albumName: string = songData.album.name;
        // Use the first image from the album artwork images array, if available
        const albumArtwork: string = songData.album.images && songData.album.images.length > 0 
            ? songData.album.images[0].url 
            : '';

        // Construct the Spotify link for the track
        const spotifyLink = `https://open.spotify.com/track/${songId}`;

        // Build the message text with bold labels and line breaks

        // Create the message, including an attachment with the album artwork and details
        const message: IMessage = {
            sender: user,
            room: room,
            attachments: [
                {
                    title: {
                        value: songName
                    },
                    text: `**Song:** ${songName}\n\n**Artist(s):** ${artists}\n\n**Album:** ${albumName}`,actions: [
                        {
                            type: MessageActionType.BUTTON,
                            text: 'Listen on Spotify',
                            url: spotifyLink
                        }
                    ],
                    imageUrl: albumArtwork
                }
            ]
    };

    return message;
    }

    public async buildShareArtistMessage(artistId: string, user: IUser, room: IRoom, persistance: IPersistence, read: IRead, http: IHttp, logger: ILogger): Promise<IMessage> {
        // Fetch artist details from Spotify
        const artistData = await this.getArtistData(artistId, persistance, read, user, http, logger);
    
        // Extract the necessary details
        const artistName: string = artistData.name;
        const genres: string = artistData.genres.length > 0 ? artistData.genres.join(', ') : "No genres available";
        // Use the first image from the artist's images array, if available
        const artistImage: string = artistData.images && artistData.images.length > 0 
            ? artistData.images[0].url 
            : '';
    
        // Construct the Spotify link for the artist
        const spotifyLink = `https://open.spotify.com/artist/${artistId}`;
    
        // Create the message, including an attachment with the artist image and details
        const message: IMessage = {
            sender: user,
            room: room,
            attachments: [
                {
                    title: {
                        value: artistName
                    },
                    text: `**Artist:** ${artistName}\n\n**Genres:** ${genres}`,
                    actions: [
                        {
                            type: MessageActionType.BUTTON,
                            text: 'Listen on Spotify',
                            url: spotifyLink
                        }
                    ],
                    imageUrl: artistImage
                }
            ]
        };
    
        return message;
    }
    
    async getSongData(songId: string, persistance: IPersistence, read: IRead, user: IUser, http: IHttp, logger: ILogger): Promise<any> {
        // Instantiate the persistence manager and retrieve the token
        const persistanceManager = new AppPersistence(persistance, read.getPersistenceReader(), read, logger);
        const token = await persistanceManager.get_token(user?.id || '');

        // Construct the Spotify endpoint for fetching track details
        const url = `https://api.spotify.com/v1/tracks/${songId}`;

        // Prepare the HTTP request options including the Authorization header
        const options = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        // Make the HTTP GET call to Spotify
        const response = await http.get(url, options);

        // Check if the call was successful; otherwise, throw an error
        if (response.statusCode !== 200) {
            throw new Error(`Spotify API returned status ${response.statusCode}`);
        }

        // Return the song data retrieved from Spotify
        return response.data;
    }

    async getArtistData(artistId: string, persistance: IPersistence, read: IRead, user: IUser, http: IHttp, logger: ILogger): Promise<any> {
        // Instantiate the persistence manager and retrieve the token
        const persistanceManager = new AppPersistence(persistance, read.getPersistenceReader(), read, logger);
        const token = await persistanceManager.get_token(user?.id || '');
    
        // Construct the Spotify endpoint for fetching artist details
        const url = `https://api.spotify.com/v1/artists/${artistId}`;
    
        // Prepare the HTTP request options including the Authorization header
        const options = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
    
        // Make the HTTP GET call to Spotify
        const response = await http.get(url, options);
    
        // Check if the call was successful; otherwise, throw an error
        if (response.statusCode !== 200) {
            throw new Error(`Spotify API returned status ${response.statusCode}: ${response.content}`);
        }
    
        // Return the artist data retrieved from Spotify
        return response.data;
    }
    

}