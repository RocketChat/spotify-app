import { LayoutBlock } from "@rocket.chat/ui-kit";
import { APP_ID, uiconstants } from "../constants/constants";
import { ILogger } from "@rocket.chat/apps-engine/definition/accessors/ILogger";
import { IHttp } from "@rocket.chat/apps-engine/definition/accessors/IHttp";
import { IRead } from "@rocket.chat/apps-engine/definition/accessors/IRead";
import { IPersistence } from "@rocket.chat/apps-engine/definition/accessors/IPersistence";
import { IUser } from "@rocket.chat/apps-engine/definition/users/IUser";
import { AppPersistence } from "../persistance/persistance";

export async function getSearchSection(
  logger: ILogger,
  http: IHttp,
  read: IRead,
  persistance: IPersistence,
  user: IUser
): Promise<LayoutBlock[]> {
  const searchInputBlockId = "search_input_block";

  return [
    {
      type: "input",
      blockId: searchInputBlockId,
      label: {
        type: "plain_text",
        text: "Search",
        emoji: true,
      },
      element: {
        type: "plain_text_input",
        appId: APP_ID,
        blockId: searchInputBlockId,
        actionId: uiconstants.SPOTIFY_SEARCH_VIEW,
        placeholder: {
          type: "plain_text",
          text: "Enter search query...",
        },
      },
    },
  ];
}

export async function getPostSearchSection(
  logger: ILogger,
  http: IHttp,
  read: IRead,
  persistance: IPersistence,
  user: IUser,
  inputValue: string
): Promise<LayoutBlock[]> {
  logger.log("Searching Spotify for:", inputValue);

  // Retrieve the Spotify token from your persistence manager.
  const persistanceManager = new AppPersistence(
    persistance,
    read.getPersistenceReader(),
    read,
    logger
  );
  const token = await persistanceManager.get_token(user?.id || "");
  logger.log("Token is:", token);

  try {
    // Call Spotify's search endpoint to search for both tracks and artists.
    const response = await http.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        inputValue
      )}&type=track,artist`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.statusCode !== 200) {
      logger.error(
        `Failed to search Spotify: ${response.statusCode} - ${response.content}`
      );
      return [];
    }

    const data = JSON.parse(response.content || "{}");
    const tracks = (data.tracks && data.tracks.items) || [];
    const artists = (data.artists && data.artists.items) || [];
    logger.log(
      "Search results fetched successfully. Tracks:",
      tracks.length,
      "Artists:",
      artists.length
    );

    // Limit the results to the top 5 items each.
    const topTracks = tracks.slice(0, 5);
    const topArtists = artists.slice(0, 5);

    const layoutBlocks: LayoutBlock[] = [];

    // Add a defined section for Tracks.
    if (topTracks.length > 0) {
      layoutBlocks.push({ type: "divider" });
      layoutBlocks.push({
        type: "section",
        text: {
          type: "plain_text",
          text: "Top 5 Tracks",
          emoji: true,
        },
      });
      layoutBlocks.push({ type: "divider" });

      for (const track of topTracks) {
        const trackName = track.name;
        const albumName = track.album.name;
        const artistNames = track.artists
          .map((artist: any) => artist.name)
          .join(", ");
        const albumImageUrl =
          track.album.images && track.album.images.length > 0
            ? track.album.images[0].url
            : "";
        const popularityRating = getPopularityRating(track.popularity);

        layoutBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${trackName}*\nArtist: ${artistNames}\nAlbum: ${albumName}\nPopularity: ${popularityRating}`,
          },
          accessory: {
            type: "image",
            imageUrl: albumImageUrl,
            altText: albumName,
          },
        });

        // Optional actions block for each track.
        layoutBlocks.push({
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Share",
                emoji: true,
              },
              value: track.id,
              actionId: "share_song_" + track.id,
              appId: APP_ID,
              blockId: "post_search_songs",
            },
          ],
        });
      }
    }

    // Add a defined section for Artists.
    if (topArtists.length > 0) {
      layoutBlocks.push({ type: "divider" });
      layoutBlocks.push({
        type: "section",
        text: {
          type: "plain_text",
          text: "Top 5 Artists",
          emoji: true,
        },
      });
      layoutBlocks.push({ type: "divider" });

      for (const artist of topArtists) {
        const artistName = artist.name;
        const popularityRating = getPopularityRating(artist.popularity);
        const artistImageUrl =
          artist.images && artist.images.length > 0
            ? artist.images[0].url
            : "";
        layoutBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${artistName}*\nPopularity: ${popularityRating}`,
          },
          accessory: artistImageUrl
            ? {
                type: "image",
                imageUrl: artistImageUrl,
                altText: artistName,
              }
            : undefined,
        });

        // Optional actions block for each artist.
        layoutBlocks.push({
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Share",
                emoji: true,
              },
              value: artist.id,
              actionId: "share_artist_" + artist.id,
              appId: APP_ID,
              blockId: "post_search_artists",
            },
          ],
        });
      }
    }

    return layoutBlocks;
  } catch (error) {
    logger.error(`Error searching Spotify: ${error}`);
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
