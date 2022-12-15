import {DraftBot} from "./DraftBot";
import {Client, Guild, Partials, TextChannel, CommandInteraction} from "discord.js";
import {loadConfig} from "./DraftBotConfig";
import {format} from "../utils/StringFormatter";
import {Servers} from "../database/game/models/Server";
import {IPCClient} from "./ipc/IPCClient";
import {Constants} from "../Constants";
import {Translations} from "../Translations";
import {BotUtils} from "../utils/BotUtils";
import {DBL} from "../DBL";
import {BotConstants} from "../constants/BotConstants";
import {Intents} from "../intents";

import Player, {Players} from "../../core/database/game/models/Player";
import {Weapons} from "../database/game/models/Weapon";
import {NumberChangeReason} from "../../core/constants/LogsConstants";
import {giveItemToPlayer} from "../../core/utils/ItemUtils";

export let draftBotInstance: DraftBot = null;
export let draftBotClient: Client = null;
export let shardId = -1;
export const botConfig = loadConfig();

process.on("uncaughtException", function(error) {
	console.log(error);
	console.log(error.stack);
});

process.on("unhandledRejection", function(err: Error) {
	console.log(err);
	console.log(err.stack);
	// process.exit(1);
});

process.on("message", async (message: { type: string, data: { shardId: number } }) => {
	if (!message.type) {
		return false;
	}

	if (message.type === "shardId") {
		shardId = message.data.shardId;
		IPCClient.connectToIPCServer(shardId);
		const mainShard = shardId === 0;
		const draftBot = new DraftBot(draftBotClient, botConfig, mainShard);
		draftBotInstance = draftBot;
		await draftBot.init();
		if (!mainShard) {
			return;
		}
		console.log("Launched main shard");
		draftBotClient.user
			.setActivity(BotConstants.ACTIVITY);
		console.log("############################################");
		const guild = draftBotClient.guilds.cache.get(botConfig.MAIN_SERVER_ID);
		if (guild && guild.shard) {
			(await guild.channels.fetch(botConfig.CONSOLE_CHANNEL_ID) as TextChannel)
				.send({
					content: format(BotConstants.START_STATUS, {
						version: await BotConstants.VERSION,
						shardId
					})
				})
				.catch(console.error);
			await DBL.verifyDBLRoles();
			DBL.startDBLWebhook();
		}
	}
});

/**
 * The main function of the bot : makes the bot start
 */
async function main(): Promise<void> {
	const client = new Client(
		{
			intents: Intents.LIST,
			allowedMentions: {parse: ["users", "roles"]},
			partials: [Partials.Message, Partials.Channel],
			rest: {
				offset: 0,
				timeout: Constants.MAX_TIME_BOT_RESPONSE
			}
		}
	);

	/**
	 * Get the message when the bot joins or leaves a guild
	 * @param {Guild} guild
	 * @param {boolean} join
	 * @param {"fr"|"en"} language
	 * @return {string}
	 */
	function getJoinLeaveMessage(guild: Guild, join: boolean, language: string): string {
		const {validation, humans, bots, ratio} = BotUtils.getValidationInfos(guild);
		return format(
			join
				? Translations.getModule("bot", language).get("joinGuild")
				: Translations.getModule("bot", language).get("leaveGuild"),
			{
				guild: guild,
				humans: humans,
				robots: bots,
				ratio: ratio,
				validation: validation
			});
	}

	/**
	 * Will be executed each time the bot join a new server
	 */
	async function onDiscordGuildCreate(guild: Guild): Promise<void> {
		const serv = await Servers.getOrRegister(botConfig.MAIN_SERVER_ID);
		const msg = getJoinLeaveMessage(guild, true, serv.language);
		draftBotInstance.logsDatabase.logServerJoin(guild.id).then();
		console.log(msg);
	}

	/**
	 * Will be executed each time the bot leave a server
	 */
	async function onDiscordGuildDelete(guild: Guild): Promise<void> {
		const serv = await Servers.getOrRegister(botConfig.MAIN_SERVER_ID);
		const msg = getJoinLeaveMessage(guild, false, serv.language);
		draftBotInstance.logsDatabase.logServerQuit(guild.id).then();
		console.log(msg);
	}

	async function updatePlayerInfos(
		player: Player
	): Promise<void> {
		const generalChannel = await client.channels.fetch("1036911988607037493");
		const valuesToEditParameters = {
			player: player,
			channel: generalChannel as TextChannel,
			language: "en",
			reason: NumberChangeReason.HERO_VERIFIED
		};
		await player.addExperience(Object.assign(valuesToEditParameters, {amount: 10}));
	}

	client.on("ready", () => console.log("Client ready"));
	//	----- newbie role auto-added and the channel with the below channel ID will response--------	//
	client.on("guildMemberAdd", guildMember => {
		// const newbieRole = guildMember.guild.roles.cache.find(role => role.name === "newbie");

		// guildMember.roles.add(newbieRole);
		// const channel = guildMember.guild.channels.cache.get("1044881088440442880");//	guild.channels.cache.get()
		// (channel as TextChannel).send(`Welcome <@${guildMember.user.id}> to our server! Please go to the '#general' channel to call '/introduce' command to start your adventure!`);
	});

	/** new "Hero" holder check
	 * EXP and sword rewarded and inform the member 
	 */
	client.on("guildMemberUpdate", async (before, after) => {
		//	guildRoleManager doesn't have 'has' method, so use cache here
		const hero = "1040522325751255122";
		const generalChannel = "1036911988607037493";
		const sword = await Weapons.getById(37);
		// const newHeroId = before.guild.members
		const player = await Players.getByDiscordUserId(before.id);
		const channel = after.guild.channels.cache.get(generalChannel);
		if (!before.roles.cache.has(hero) && after.roles.cache.has(hero)) {
			await updatePlayerInfos(player);
			player.giveItem(sword);
			(channel as TextChannel).send(`Congratulations <@${after.user.id}> to be a Hero! You've got 10 EXP and a 'Beginner's Sword'. Check it by calling '/profile' command.`);
		}
	});

	client.on("guildCreate", onDiscordGuildCreate);
	client.on("guildDelete", onDiscordGuildDelete);

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	global.client = client;
	draftBotClient = client;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	global.discord = require("discord.js");
	await client.login(botConfig.DISCORD_CLIENT_TOKEN);
}

main().then();
