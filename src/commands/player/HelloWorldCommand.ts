import {ICommand} from "../ICommand";
import {Player} from "../../core/database/game/models/Player";
import {CommandInteraction} from "discord.js";
import {Translations} from "../../core/Translations";
import {Constants} from "../../core/Constants";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";

/**
 * Pings the bot, to check if it is alive and how well is it
 * @param interaction
 * @param language
 */

async function executeCommand(interaction: CommandInteraction, language: string, player: Player): Promise<void> {
	const tr = Translations.getModule("commands.helloworld", language);
	await interaction.reply({
		// content: tr.get("create"), fetchReply: true
		content: tr.format("edit",{
			player: player.getPseudo(language)
		})
	});
	// await interaction.editReply({
	// 	content: tr.format("edit",{
	// 		player: player.getPseudo(language)
	// 	})
	// });
}
const currentCommandFrenchTranslations = Translations.getModule("commands.helloworld", Constants.LANGUAGE.FRENCH);
const currentCommandEnglishTranslations = Translations.getModule("commands.helloworld", Constants.LANGUAGE.ENGLISH);
export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand(currentCommandFrenchTranslations, currentCommandEnglishTranslations),
	executeCommand,
	requirements: {
		userPermission: Constants.ROLES.USER.CARD_HOLDER
	},
	mainGuildCommand: false
};
