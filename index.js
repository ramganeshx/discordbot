const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const SpotifyWebApi = require('spotify-web-api-node');
const { google } = require('googleapis');
const { getVoiceConnection } = require('@discordjs/voice');

// Spotify API credentials
const spotifyApi = new SpotifyWebApi({
  clientId: 'f438dd2799214304b520fa25c92f02b9',
  clientSecret: 'f711b3a315af4c42914e61bc13ceeffe',
});

// YouTube Data API key
const youtubeApiKey = 'AIzaSyD1PVENDWtR_NKTYf7BBqj2T4q00VKHD20';
const youtube = google.youtube({
  version: 'v3',
  auth: youtubeApiKey,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Spotify authentication
spotifyApi.clientCredentialsGrant().then(
  (data) => {
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify authentication successful!');
  },
  (err) => {
    console.log('Something went wrong when retrieving access token', err);
  }
);

async function getYouTubeLink(query) {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: 1,
    });
    const video = response.data.items[0];
    return `https://www.youtube.com/watch?v=${video.id.videoId}`;
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
    return null;
  }
}

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');

    if (!message.member.voice.channel) {
      return message.reply('You need to join a voice channel first.');
    }

    try {
      const data = await spotifyApi.searchTracks(query);
      const track = data.body.tracks.items[0];
      if (!track) {
        return message.reply('No song found with that name.');
      }

      const songTitle = `${track.name} by ${track.artists[0].name}`;
      const searchTerm = `${track.name} ${track.artists[0].name}`;

      // Getting the YouTube link for the song
      const youtubeLink = await getYouTubeLink(searchTerm);

      if (!youtubeLink) {
        return message.reply('Could not find a YouTube link for that song.');
      }

      // Joining the voice channel and playing the song
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const stream = ytdl(youtubeLink, { filter: 'audioonly' });
      const resource = createAudioResource(stream);

      player.play(resource);
      connection.subscribe(player);

      message.reply(`Now playing: ${songTitle}`);

    } catch (error) {
      console.error('There was an error trying to play the song:', error);
    }
  }

  if (message.content.startsWith('!leave')) {
    if (!message.member.voice.channel) {
      return message.reply('You need to join a voice channel first.');
    }

    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy(); // This will make the bot leave the voice channel
      message.reply('I have left the voice channel.');
    } else {
      message.reply('I am not connected to a voice channel.');
    }
  }
});

client.once('ready', () => {
  console.log('Bot is online!');
});
client.login('MTI4NTc1Mzg5MzAzNjIyODY3MQ.GhHKPh.b7nBRz1D5A8BiUr6x8k8YTCJW6xOp4wdAadDlE');