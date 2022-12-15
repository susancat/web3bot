<div style="text-align: center;">
This bot is a customized web3 version based on Draftbot from 
https://github.com/DraftBot-A-Discord-Adventure/DraftBot

<br>


</div>

<br>

# How to launch the bot

_Before creating your own instance, please note that you can add the bot to your server through the link available on
the bot's discord_


**If you decide to work on the creation of your own instance of the bot, you are supposed to have a minimum of computer
skills. Bot support team will prioritize players of the main instance and will only provide very limited assistance. We
will fix bugs you report, but we will not teach you how to code a discord bot.**

Please do not copy and paste the commands we provide in this readme without :
- Understanding the command
- Replacing the relevant parts with your data
- Having read the whole document

Only the code available in the "release" tab is considered "stable".

## Without docker

### Here is a short start guide. (windows)

- install git : https://git-scm.com/download/win
- download the bot : `git clone https://github.com/BastLast/DraftBot-A-Discord-Adventure`
- install NodeJS http://nodejs.org/fr/ (nodejs 12 minimum is required)
- install Yarn `npm install --global yarn`
- install the bot : `yarn install`
- install and launch a mariadb database (with or without docker). Keep the credentials for the config file. If you choose to use docker, we provide a tutorial below.
- create the config file by copying the file config.default.toml in a new file config.toml
- Edit the file config.toml with the correct data
- Launch the bot : `yarn start`

### Here is the same guide for linux (or if you have a git terminal on Windows)

- install git : `apt-get install git`
- download the bot : `git clone https://github.com/BastLast/DraftBot-A-Discord-Adventure`
- install NodeJS `apt-get install nodejs` (nodejs 12 minimum is required)
- install yarn `npm install -g yarn` (you may have to install npm and use sudo)
- install the bot : `yarn install`
- install and launch a mariadb database (with or without docker). Keep the credentials for the config file. If you choose to use docker, we provide a tutorial below.
- create the config file : `cp config/config.default.toml config/config.toml`
- Edit the file config.toml with the correct data
- Launch the bot : `yarn start`

### Updating the bot

- Be sure to use `yarn install` and `yarn start` each time you update the bot.
- Migrations will run automatically, but be sure to check them as they are created for our database, they may cause
  issues in yours.

## With docker

Make sure to have docker installed on your machine. Please follow the "without docker" steps until the `yarn install` step (you don't need to do it).

### Compile the docker image

We have a docker hub account, so you may not need to compile the image yourself! You can find it there: https://hub.docker.com/u/draftbot. If you really want to compile it yourself, follow the next step.

In the project folder (previously downloaded with git), run:

`docker build . -t draftbot/draftbot`

### Install a database

Create a docker (or not) mariadb database with the following command : 

`docker run -d --name mariadb -e MARIADB_USER=draftbot -e MARIADB_PASSWORD=secret_password -e MARIADB_ROOT_PASSWORD=super_secret_password -v /path/to/volumes/mariadb:/var/lib/mysql -p 3306:3306 mariadb:latest`

or with docker compose :

```
services:
  mariadb:
    image: mariadb
    container_name: mariadb
    ports:
      - 3306:3306
    volumes:
      - /path/to/volumes/mariadb:/var/lib/mysql
    environment:
      MARIADB_USER: draftbot
      MARIADB_PASSWORD: secret_password
      MARIADB_ROOT_PASSWORD: super_secret_password
```

### Run the docker container

Once you compiled the bot image and a database is ready, you have to start a draftbot container.

You need to have a config.toml file filled. The config template can be found at config/config.default.toml

`docker run -d --name draftbot -v /path/to/config.toml:/draftbot/config/config.toml:ro -v /path/to/logs:/draftbot/logs draftbot/draftbot`

or with docker compose :

```
services:
  draftbot:
    image: draftbot/draftbot
    container_name: draftbot
    volumes:
      - /path/to/config.toml:/draftbot/config/config.toml:ro
      - /path/to/logs:/draftbot/logs
```

# Screenshots

# Links

- [Website]

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDraftBot-A-Discord-Adventure%2FDraftBot.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDraftBot-A-Discord-Adventure%2FDraftBot?ref=badge_large)
