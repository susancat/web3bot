import Entity from "../database/game/models/Entity";
import {TextBasedChannel, User} from "discord.js";
import {BlockingUtils} from "../utils/BlockingUtils";
import {playerActiveObjects} from "../database/game/models/PlayerActiveObjects";
import Potion from "../database/game/models/Potion";
import {checkDrinkPotionMissions} from "../utils/ItemUtils";
import {TranslationModule} from "../Translations";
import {FighterStatus} from "./FighterStatus";
import {FighterAlterationId} from "./FighterAlterationId";
import {IFightAction} from "../fightActions/IFightAction";
import Class from "../database/game/models/Class";
import {FightActionController} from "../fightActions/FightActionController";
import {BlockingConstants} from "../constants/BlockingConstants";
import {FightConstants} from "../constants/FightConstants";

type FighterStats = {
	fightPoints: number, maxFightPoint: number, speed: number, defense: number, attack: number
}

const fighterStatusTranslation = ["summarize.notStarted", "summarize.attacker", "summarize.defender", "summarize.winner", "summarize.loser", "summarize.drawer", "summarize.bug"];

/**
 * @class Fighter
 */
export class Fighter {

	public stats: FighterStats;

	public nextFightActionId: string;

	public fightActionsHistory: string[];

	public availableFightActions: Map<string, IFightAction>;

	public entity: Entity;

	public alterationTurn: number;

	private statsBackup: FighterStats;

	private ready: boolean;

	private alteration: FighterAlterationId;

	private status: FighterStatus;

	private readonly class: Class;

	private readonly user: User;

	public constructor(user: User, entity: Entity, playerClass: Class) {
		this.stats = {
			fightPoints: null,
			maxFightPoint: null,
			speed: null,
			defense: null,
			attack: null
		};
		this.statsBackup = null;
		this.entity = entity;
		this.ready = false;
		this.nextFightActionId = null;
		this.fightActionsHistory = [];
		this.status = FighterStatus.NOT_STARTED;
		this.alteration = FighterAlterationId.NORMAL;
		this.alterationTurn = 0;
		this.class = playerClass;
		this.availableFightActions = FightActionController.listFightActionsFromClass(this.class);
		this.user = user;
	}

	/**
	 * get the string that mention the user
	 * @public
	 */
	public getMention(): string {
		return this.entity.getMention();
	}

	/**
	 * set the status of the fighter
	 * @param newStatus
	 */
	setStatus(newStatus: FighterStatus): void {
		this.status = newStatus;
	}

	/**
	 * the fighter loads its various stats
	 * @param friendly true if the fight is friendly
	 * @public
	 */
	public async loadStats(friendly: boolean): Promise<void> {
		const playerActiveObjects: playerActiveObjects = await this.entity.getPlayerActiveObjects();
		this.stats.fightPoints = friendly ? await this.entity.getMaxCumulativeFightPoint() : await this.entity.getCumulativeFightPoint();
		this.stats.maxFightPoint = await this.entity.getMaxCumulativeFightPoint();
		this.stats.attack = await this.entity.getCumulativeAttack(playerActiveObjects);
		this.stats.defense = await this.entity.getCumulativeDefense(playerActiveObjects);
		this.stats.speed = await this.entity.getCumulativeSpeed(playerActiveObjects);
	}

	/**
	 * delete the potion from the inventory of the player if needed
	 * @param friendly true if the fight is friendly
	 * @param channel
	 * @param language
	 * @public
	 */
	public async consumePotionIfNeeded(friendly: boolean, channel: TextBasedChannel, language: string): Promise<void> {
		if (friendly || !await this.currentPotionIsAFightPotion()) {
			return;
		}
		const drankPotion = await this.entity.Player.getMainPotionSlot().getItem() as Potion;
		await this.entity.Player.drinkPotion();
		await this.entity.save();
		await checkDrinkPotionMissions(channel, language, this.entity, drankPotion);
	}

	/**
	 * Allow a fighter to block itself
	 * @public
	 */
	public block(): void {
		BlockingUtils.blockPlayer(this.entity.discordUserId, BlockingConstants.REASONS.FIGHT);
	}

	/**
	 * save the stats of the fighter to the backup stat storage
	 */
	public saveStats(): void {
		this.statsBackup = {...this.stats};
	}

	/**
	 * recover the stats of the fighter from the backup stat storage
	 */
	public readSavedStats(): FighterStats {
		return this.statsBackup;
	}

	/**
	 * erase the saved stats of the fighter
	 */
	eraseSavedStats(): void {
		this.statsBackup = null;
	}

	/**
	 * check if a fighter has an active backup of its stats
	 */
	hasSavedStats(): boolean {
		return this.statsBackup !== null;
	}

	/**
	 * Return a display of the player in a string format
	 * @param fightTranslationModule
	 */
	public async getStringDisplay(fightTranslationModule: TranslationModule): Promise<string> {

		return fightTranslationModule.format(fighterStatusTranslation[this.status], {
			pseudo: await this.entity.Player.getPseudo(fightTranslationModule.language),
			charging: "" // TODO : add the charging if needed
		}) +
			fightTranslationModule.format("summarize.stats", {
				power: this.stats.fightPoints,
				attack: this.stats.attack,
				defense: this.stats.defense,
				speed: this.stats.speed
			});
	}

	/**
	 * execute one turn
	 */
	public async play(): Promise<IFightAction> {
		if (this.nextFightActionId !== null) {
			return await FightActionController.getFightActionInterface(this.nextFightActionId);
		}
		// Choose action
	}

	/**
	 * get the discord id of a fighter
	 */
	public getDiscordId(): string {
		return this.entity.discordUserId;
	}

	/**
	 * get the user of a fighter
	 */
	public getUser(): User {
		return this.user;
	}

	/**
	 * get the pseudo of a fighter
	 * @param language
	 */
	public async getPseudo(language: string): Promise<string> {
		return await this.entity.Player.getPseudo(language);
	}

	/**
	 * check if the player is dead
	 */
	public isDead(): boolean {
		return this.stats.fightPoints <= 0;
	}

	/**
	 * check if the player is dead or buggy
	 */
	public isDeadOrBug(): boolean {
		return this.isDead() || this.status === FighterStatus.BUG;
	}

	/**
	 * the name of the function is very clear
	 */
	public suicide(): void {
		this.stats.fightPoints = 0;
	}

	/**
	 * get a map of the fight actions executed and the amont of time it has been done
	 */
	public getFightActionCount(): Map<string, number> {
		const playerFightActionsHistory = new Map<string, number>();
		this.fightActionsHistory.forEach((action) => {
			if (playerFightActionsHistory.has(action)) {
				playerFightActionsHistory.set(action, playerFightActionsHistory.get(action) + 1);
			}
			else {
				playerFightActionsHistory.set(action, 1);
			}
		});
		return playerFightActionsHistory;
	}

	/**
	 * get the player level of the fighter
	 */
	public getPlayerLevel(): number {
		return this.entity.Player.level;
	}

	/**
	 * Check if the fighter has a fight alteration
	 */
	hasFightAlteration(): boolean {
		return this.alteration !== FighterAlterationId.NORMAL;
	}

	/**
	 * Set a new fight alteration to the fighter
	 * @param alteration - the new fight alteration
	 * returns the FighterAlterationId of the fight alteration that was set or kept
	 */
	newAlteration(alteration: FighterAlterationId): FighterAlterationId {
		if (this.alteration === FighterAlterationId.NORMAL || this.alteration === alteration) {
			this.alterationTurn = 0;
		}
		if (this.alteration === FighterAlterationId.NORMAL || alteration === FighterAlterationId.NORMAL) {
			// check for alteration conflict
			this.alteration = alteration;
		}
		return this.alteration;
	}

	/**
	 * get the fightAction linked to the alteration of the fighter
	 */
	async getAlterationFightAction(): Promise<IFightAction> {
		const alterationFightActionFileName: string = FightConstants.ALTERATION_FIGHT_ACTION[this.alteration];
		return await FightActionController.getFightActionInterface(alterationFightActionFileName);
	}

	/**
	 * get a random fight action id from the list of available fight actions of the fighter
	 */
	getRandomAvailableFightActionId(): string {
		return Array.from(this.availableFightActions.keys())[Math.floor(Math.random() * Array.from(this.availableFightActions.keys()).length)];
	}

	/**
	 * check if the potion of the fighter is a fight potion
	 * @private
	 */
	private async currentPotionIsAFightPotion(): Promise<boolean> {
		return (await this.entity.Player.getMainPotionSlot().getItem() as Potion).isFightPotion();
	}
}