import {FightController} from "./FightController";
import {Message, TextBasedChannel} from "discord.js";
import {Fighter} from "./fighter/Fighter";
import {TranslationModule, Translations} from "../Translations";
import {DraftBotEmbed} from "../messages/DraftBotEmbed";
import {FightConstants} from "../constants/FightConstants";
import {millisecondsToMinutes, minutesDisplay} from "../utils/TimeUtils";

/**
 * @class FightController
 */
export class FightView {

	public channel: TextBasedChannel;

	public language: string;

	fightController: FightController;

	readonly fightTranslationModule: TranslationModule;

	private lastSummary: Message;

	private readonly actionMessages: Message[];

	private fightLaunchMessage: Message;

	public constructor(channel: TextBasedChannel, language: string, fightController: FightController) {
		this.channel = channel;
		this.language = language;
		this.fightController = fightController;
		this.fightTranslationModule = Translations.getModule("commands.fight", language);
		this.actionMessages = [];
	}

	/**
	 * Add the fight action field to the intro embed that correspond to the fighter
	 * @param introEmbed
	 * @param fighter
	 */
	addFightActionFieldFor(introEmbed: DraftBotEmbed, fighter: Fighter): void {
		introEmbed.addFields({
			name: this.fightTranslationModule.format("actionsOf", {
				player: fighter.getName()
			}),
			value: this.getFightActionsToStringOf(fighter),
			inline: true
		});
	}

	/**
	 * Send the fight intro message
	 * @param fighter1
	 * @param fighter2
	 */
	async introduceFight(fighter1: Fighter, fighter2: Fighter): Promise<void> {
		// ce serait ici qu'il faudrait mettre les attaques ?
		const introEmbed = new DraftBotEmbed()
			.setTitle(this.fightTranslationModule.format("intro", {
				player1: fighter1.getName(),
				player2: fighter2.getName()
			}));
		this.addFightActionFieldFor(introEmbed, fighter1);
		this.addFightActionFieldFor(introEmbed, fighter2);
		this.fightLaunchMessage = await this.channel.send({
			embeds: [introEmbed]
		});
		this.actionMessages.push(await this.channel.send({content: "_ _"}));
	}

	/**
	 *  summarize current fight status
	 */
	async displayFightStatus(): Promise<void> {
		await this.scrollIfNeeded();
		const playingFighter = this.fightController.getPlayingFighter();
		const defendingFighter = this.fightController.getDefendingFighter();
		if (this.lastSummary === undefined) {
			this.lastSummary = await this.channel.send({embeds: [this.getSummarizeEmbed(playingFighter, defendingFighter)]});
		}
		else {
			await this.lastSummary.edit({embeds: [this.getSummarizeEmbed(playingFighter, defendingFighter)]});
		}
	}

	/**
	 * Update the fight history
	 * @param emote
	 * @param player
	 * @param receivedMessage
	 */
	async updateHistory(emote: string, player: string, receivedMessage: string): Promise<void> {
		const lastMessage = this.actionMessages[this.actionMessages.length - 1];
		const messageToSend = this.fightTranslationModule.format("actions.intro", {
			emote,
			player
		}) + receivedMessage;
		if (lastMessage.content.length + messageToSend.length > 1950) {
			// message character limit reached : creation of a new message
			await this.lastSummary.delete();
			this.lastSummary = undefined;
			this.actionMessages.push(await this.channel.send({content: messageToSend}));
		}
		else if (lastMessage.content === "_ _") {
			// First action of the fight, no history yet
			await lastMessage.edit({content: messageToSend});
		}
		else {
			// A history already exists, just append the new action
			await lastMessage.edit({content: `${lastMessage.content}\n${messageToSend}`});
		}
	}

	/**
	 * Get send the fight outro message
	 * @param loser
	 * @param winner
	 * @param draw
	 */
	outroFight(loser: Fighter, winner: Fighter, draw: boolean): void {
		if (this.lastSummary !== undefined) {
			setTimeout(() => this.lastSummary.delete(), 5000);
		}
		let msg;
		if (!draw) {
			msg = this.fightTranslationModule.format("end.win", {
				winner: winner.getMention(),
				loser: loser.getMention()
			});
		}
		else {
			msg = this.fightTranslationModule.format("end.draw", {
				player1: winner.getMention(),
				player2: loser.getMention()
			});
		}
		msg += this.fightTranslationModule.format("end.gameStats", {
			turn: this.fightController.turn,
			maxTurn: FightConstants.MAX_TURNS,
			time: minutesDisplay(millisecondsToMinutes(new Date().valueOf() - this.fightLaunchMessage.createdTimestamp))
		});

		for (const fighter of [winner, loser]) {
			msg += this.fightTranslationModule.format("end.fighterStats", {
				pseudo: fighter.getName(),
				health: fighter.stats.fightPoints,
				maxHealth: fighter.stats.maxFightPoint
			});
		}

		this.channel.send({embeds: [new DraftBotEmbed().setDescription(msg)]});
	}

	/**
	 * Get summarize embed message
	 * @param {Fighter} attacker
	 * @param {Fighter} defender
	 * @return {Promise<DraftBotEmbed>}
	 */
	private getSummarizeEmbed(attacker: Fighter, defender: Fighter): DraftBotEmbed {
		return new DraftBotEmbed()
			.setTitle(this.fightTranslationModule.get("summarize.title"))
			.setDescription(`${this.fightTranslationModule.get("summarize.intro") +
			attacker.getStringDisplay(this.fightTranslationModule)}\n\n${defender.getStringDisplay(this.fightTranslationModule)}`);
	}

	/**
	 * Scroll the messages down if needed before fight display status
	 * @return {Promise<void>}
	 */
	private async scrollIfNeeded(): Promise<void> {
		const messages = await this.channel.messages.fetch({limit: 1});
		if (this.lastSummary !== undefined && messages.first().createdTimestamp !== this.lastSummary.createdTimestamp) {
			for (let i = 0; i < this.actionMessages.length; ++i) {
				const content = (await this.channel.messages.fetch(this.actionMessages[i].id)).content;
				await this.actionMessages[i].edit(content);
			}
			await this.lastSummary.delete();
			this.lastSummary = undefined;
		}
	}

	/**
	 * Get the list of actions available for the fighter in a displayable format
	 * @param fighter
	 * @private
	 */
	private getFightActionsToStringOf(fighter: Fighter): string {
		const fightActions = fighter.availableFightActions;
		let actionList = "";
		for (const [, action] of fightActions) {
			actionList += `${action.getEmoji()} - ${action.toString(this.language)}\n`;
		}
		return actionList;
	}
}
