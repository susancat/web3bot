import {DataTypes, Model, QueryTypes, Sequelize} from "sequelize";
import {Translations} from "../../../Translations";
import {readdir} from "fs/promises";
import {Tags} from "./Tag";
import {botConfig, draftBotInstance} from "../../../bot";
import * as moment from "moment";
import {Constants} from "../../../Constants";

export class MapLocation extends Model {
	public readonly id!: number;

	public readonly type!: string;

	public readonly nameFr!: string;

	public readonly nameEn!: string;

	public readonly descFr!: string;

	public readonly descEn!: string;

	public readonly particleFr!: string;

	public readonly particleEn!: string;

	public readonly canBeGoToPlaceMissionDestination!: boolean;

	public updatedAt!: Date;

	public createdAt!: Date;

	public getEmote(language: string): string {
		return Translations.getModule("models.maps", language).get("types." + this.type + ".emote");
	}

	public getNameWithoutEmote(language: string): string {
		return language === Constants.LANGUAGE.FRENCH ? this.nameFr : this.nameEn;
	}

	public getDisplayName(language: string): string {
		return `${this.getEmote(language)} ${language === Constants.LANGUAGE.FRENCH ? this.nameFr : this.nameEn}`;
	}

	public getParticleName(language: string): string {
		return language === Constants.LANGUAGE.FRENCH ? this.particleFr : this.particleEn;
	}

	public getDescription(language: string): string {
		return language === Constants.LANGUAGE.FRENCH ? this.descFr : this.descEn;
	}

	public async getFullName(language: string): Promise<string> {
		return `${await this.getDeterminant(language)} ${this.getDisplayName(language)}`;
	}

	public async getDeterminant(language: string): Promise<string> {
		if (language === Constants.LANGUAGE.ENGLISH) {
			return "";
		}
		const tags = await Tags.findTagsFromObject(this.id, "MapLocation");
		for (let i = 0; i < tags.length; i++) {
			if (tags[i].textTag === "detA") {
				return "à";
			}
			if (tags[i].textTag === "detAu") {
				return "au";
			}
			if (tags[i].textTag === "detALa") {
				return "à la";
			}
		}
		return "";
	}

	public async playersCount(originId: number): Promise<number> {
		const query = `SELECT COUNT(*) as count
					   FROM ${botConfig.MARIADB_PREFIX}_game.players
					   WHERE mapLinkId IN (
						   SELECT id
						   FROM ${botConfig.MARIADB_PREFIX}_game.map_links
						   WHERE startMap = :id
						 AND endMap = :prevId
						  OR endMap = :id
						 AND startMap = :prevId
						   );`;
		return (<{ count: number }[]>(await MapLocation.sequelize.query(query, {
			replacements: {
				id: this.id,
				prevId: originId
			},
			type: QueryTypes.SELECT
		})))[0]["count"];
	}
}

export class MapLocations {
	static async getById(id: number): Promise<MapLocation> {
		return await MapLocation.findOne({where: {id: id}});
	}

	static async getRandomGotoableMap(): Promise<MapLocation> {
		return await MapLocation.findOne({
			order: [draftBotInstance.gameDatabase.sequelize.random()],
			where: {canBeGoToPlaceMissionDestination: true}
		});
	}

	static async getMapConnected(mapId: number, blacklistId: number, mapTypes: string = null): Promise<{ id: number }[]> {
		if (!blacklistId) {
			blacklistId = -1;
		}
		if (mapTypes) {
			const query = `SELECT id
						   FROM ${botConfig.MARIADB_PREFIX}_game.map_locations
                           WHERE type LIKE ':mapTypes'
                             AND id != :blacklistId
                             AND (
                               id IN (SELECT endMap FROM ${botConfig.MARIADB_PREFIX}_game.map_links WHERE startMap = :mapId));`;
			return await MapLocation.sequelize.query(query, {
				type: QueryTypes.SELECT,
				replacements: {
					mapTypes: mapTypes,
					blacklistId: blacklistId,
					mapId: mapId
				}
			});
		}
		const query = `SELECT id
					   FROM ${botConfig.MARIADB_PREFIX}_game.map_locations
                       WHERE id != :blacklistId
                         AND (
                           id IN (SELECT endMap FROM ${botConfig.MARIADB_PREFIX}_game.map_links WHERE startMap = :mapId));`;
		return await MapLocation.sequelize.query(query, {
			type: QueryTypes.SELECT,
			replacements: {
				mapId: mapId,
				blacklistId: blacklistId
			}
		});
	}

	static async getPlayersOnMap(mapId: number, previousMapId: number, playerId: number): Promise<{ discordUserId: string }[]> {
		const query = `SELECT discordUserId
					   FROM ${botConfig.MARIADB_PREFIX}_game.players 
					   WHERE ${botConfig.MARIADB_PREFIX}_game.players.id != :playerId
						 AND ${botConfig.MARIADB_PREFIX}_game.players.mapLinkId IN (
						   SELECT id from ${botConfig.MARIADB_PREFIX}_game.map_links
						   WHERE (startMap = :pMapId
						 AND endMap = :mapId)
						  OR (startMap = :mapId
						 AND endMap = :pMapId)
						   )
					   ORDER BY RAND();`;
		return await MapLocation.sequelize.query(query, {
			replacements: {
				mapId: mapId,
				pMapId: previousMapId,
				playerId: playerId
			},
			type: QueryTypes.SELECT
		});
	}

	static async getIdMaxMap(): Promise<number> {
		return (await readdir("resources/text/maplocations/")).length;
	}
}

export function initModel(sequelize: Sequelize): void {
	MapLocation.init({
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true
		},
		type: {
			type: DataTypes.TEXT
		},
		nameFr: {
			type: DataTypes.TEXT
		},
		nameEn: {
			type: DataTypes.TEXT
		},
		descFr: {
			type: DataTypes.TEXT
		},
		descEn: {
			type: DataTypes.TEXT
		},
		particleFr: {
			type: DataTypes.TEXT
		},
		particleEn: {
			type: DataTypes.TEXT
		},
		canBeGoToPlaceMissionDestination: {
			type: DataTypes.BOOLEAN
		},
		updatedAt: {
			type: DataTypes.DATE,
			defaultValue: moment().format("YYYY-MM-DD HH:mm:ss")
		},
		createdAt: {
			type: DataTypes.DATE,
			defaultValue: moment().format("YYYY-MM-DD HH:mm:ss")
		}
	}, {
		sequelize,
		tableName: "map_locations",
		freezeTableName: true
	});

	MapLocation.beforeSave(instance => {
		instance.updatedAt = moment().toDate();
	});
}

export default MapLocation;