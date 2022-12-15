import {ICommand} from "../ICommand";
import {Player} from "../../core/database/game/models/Player";
import {CommandInteraction} from "discord.js";
import {DraftBotEmbed} from "../../core/messages/DraftBotEmbed";
import {Translations, TranslationModule} from "../../core/Translations";
import {Constants} from "../../core/Constants";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";
import {SlashCommandBuilder} from "@discordjs/builders";
import {NumberChangeReason} from "../../core/constants/LogsConstants";

type TextInformation = { interaction: CommandInteraction, language: string, tr?: TranslationModule }
/**
 * Pings the bot, to check if it is alive and how well is it
 * @param interaction
 * @param language
 */

async function executeCommand(interaction: CommandInteraction, language: string, player: Player): Promise<void> {
	const tr = Translations.getModule("commands.introduce", language);
	const selfIntro = interaction.options.get(Translations.getModule("commands.introduce", Constants.LANGUAGE.ENGLISH).get("optionIntroduction")).value as string;
	const introMessage = new DraftBotEmbed()
		.setTitle(
			tr.format(
				"optionIntroduction",{}
			)
		)
		.setDescription(tr.format("desIntro", {
			selfIntroduction: selfIntro,
			player: player.getPseudo(language)
		}));
	await interaction.reply({
		embeds: [introMessage]
	});

	await updatePlayerInfos(player, {interaction, language});
	//	find the player's newbie role and remove it


	// const guild = client.guilds.cache.get("1036911988028231691");

	// console.log(guild);
	// const role = guild.roles.cache.find(role => role.name === "newbie");
	// const user = guild.members.cache.get(player.discordUserId);
	// console.log(user);
	// const newbieRole = guild.roles.cache.find(role => role.name === "newbie");
	// user.roles.remove(role);
}

async function updatePlayerInfos(
	player: Player,
	textInformation: TextInformation
	// changes: { moneyChange:                                   number }
): Promise<void> {
	// await player.addHealth(10, textInformation.interaction.channel, textInformation.language, NumberChangeReason.INTRODUCE);
	const valuesToEditParameters = {
		player: player,
		channel: textInformation.interaction.channel,
		language: textInformation.language,
		reason: NumberChangeReason.INTRODUCE
	};
	await player.addMoney(Object.assign(valuesToEditParameters, {amount: 10}));
	await player.addExperience(Object.assign(valuesToEditParameters, {amount: 10}));
}

const currentCommandFrenchTranslations = Translations.getModule("commands.introduce", Constants.LANGUAGE.FRENCH);
const currentCommandEnglishTranslations = Translations.getModule("commands.introduce", Constants.LANGUAGE.ENGLISH);
export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand(currentCommandFrenchTranslations, currentCommandEnglishTranslations)
		.addStringOption(option => option.setName(currentCommandEnglishTranslations.get("optionIntroduction"))
			.setNameLocalizations({
				fr: currentCommandFrenchTranslations.get("optionIntroduction")
			})
			.setDescription(currentCommandEnglishTranslations.get("optionIntroduction"))
			.setDescriptionLocalizations({
				fr: currentCommandFrenchTranslations.get("optionIntroduction")
			})
			.setRequired(true)) as SlashCommandBuilder,
	executeCommand,
	requirements: {
		requiredLevel: 0,
		expPermission: 15 //	can't be 0
	},
	mainGuildCommand: false
};